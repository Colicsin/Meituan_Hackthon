"""
Decision Agent - 顶层调度Agent

功能：
1. 理解用户输入，决定调用哪些下游Agent
2. 用LLM做意图识别 + 槽位填充
3. 维护对话状态（多轮提取画像字段）
4. 当画像填齐时调用ItineraryAgent
"""
from typing import Dict, Any, Optional, List
from app.services.llm_client import get_llm
from app.agents.itinerary_agent import get_itinerary_agent
from app.agents.vibe_agent import get_vibe_agent
from app.data.loader import load_pois
import json


class DialogState:
    """对话状态管理"""
    
    def __init__(self):
        self.fields = {
            "group_size": None,      # 人数
            "budget": None,          # 预算（人均）
            "time_budget": None,     # 时间预算（小时）
            "category_pref": None,   # 品类偏好
            "emotion": None,         # 情绪
            "location": None,        # 当前位置
        }
        self.messages = []  # 对话历史
        self.round = 0      # 当前轮次
    
    def is_complete(self) -> bool:
        """判断画像是否填齐"""
        required = ["group_size", "time_budget"]
        return all(self.fields.get(f) is not None for f in required)
    
    def get_missing_fields(self) -> List[str]:
        """获取缺失字段"""
        missing = []
        
        field_names = {
            "group_size": "人数",
            "budget": "预算",
            "time_budget": "时间",
            "category_pref": "品类偏好",
            "emotion": "情绪",
            "location": "位置",
        }
        
        for field, name in field_names.items():
            if self.fields.get(field) is None:
                missing.append(name)
        
        return missing
    
    def update(self, slots: Dict[str, Any]):
        """更新槽位"""
        for key, value in slots.items():
            if value is not None and key in self.fields:
                self.fields[key] = value


class DecisionAgent:
    """顶层调度Agent"""
    
    MAX_ROUNDS = 6  # 最多6轮对话
    
    def __init__(self):
        """初始化Decision Agent"""
        print("🤖 初始化 DecisionAgent...")
        self.llm = get_llm()
        self.vibe_agent = get_vibe_agent()
        print("✅ DecisionAgent初始化完成")
    
    async def handle(
        self,
        user_message: str,
        state: Optional[DialogState] = None
    ) -> Dict[str, Any]:
        """
        处理用户输入
        
        Args:
            user_message: 用户消息
            state: 对话状态（None表示新对话）
        
        Returns:
            响应结果
        """
        if state is None:
            state = DialogState()
        
        state.messages.append({"role": "user", "content": user_message})
        state.round += 1
        
        # 1. 意图识别 + 槽位填充
        intent_result = await self._recognize_intent(user_message, state)
        
        # 2. 更新状态
        if intent_result.get("slots"):
            state.update(intent_result["slots"])
        
        # 3. 决策
        intent = intent_result.get("intent", "unknown")
        
        if intent == "greeting":
            return self._handle_greeting(state)
        
        elif intent == "ask_recommendation":
            return await self._handle_recommendation(user_message, state)
        
        elif state.is_complete() or state.round >= self.MAX_ROUNDS:
            return await self._generate_itinerary(state)
        
        else:
            return self._ask_for_info(state, intent_result)
    
    async def _recognize_intent(
        self,
        user_message: str,
        state: DialogState
    ) -> Dict[str, Any]:
        """用LLM做意图识别和槽位填充"""
        
        prompt = f"""你是一个出行助手，分析用户输入并提取信息。

当前已收集信息：
- 人数: {state.fields.get('group_size', '未确定')}
- 预算: {state.fields.get('budget', '未确定')}
- 时间: {state.fields.get('time_budget', '未确定')}
- 品类偏好: {state.fields.get('category_pref', '未确定')}
- 情绪: {state.fields.get('emotion', '未确定')}
- 位置: {state.fields.get('location', '未确定')}

用户说："{user_message}"

请返回JSON格式：
{{
  "intent": "意图类型（greeting/ask_recommendation/provide_info/chat）",
  "slots": {{
    "group_size": 数字或null,
    "budget": 数字或null,
    "time_budget": 数字或null,
    "category_pref": "品类"或null,
    "emotion": "情绪描述"或null,
    "location": "位置"或null
  }},
  "next_question": "下一个要问的问题"或null
}}

示例：
用户: "我们4个人想玩3小时"
返回: {{"intent": "provide_info", "slots": {{"group_size": 4, "time_budget": 3}}, "next_question": "有什么预算要求吗？"}}

用户: "我想找个安静的地方"
返回: {{"intent": "provide_info", "slots": {{"emotion": "安静"}}, "next_question": "你们几个人呢？"}}
"""
        
        try:
            response = await self.llm.chat(
                messages=[{"role": "user", "content": prompt}],
                json_mode=True,
                temperature=0.3
            )
            
            result = json.loads(response)
            return result
            
        except Exception as e:
            print(f"⚠️ 意图识别失败: {e}")
            return {
                "intent": "chat",
                "slots": {},
                "next_question": "能再说详细一点吗？"
            }
    
    def _handle_greeting(self, state: DialogState) -> Dict[str, Any]:
        """处理问候"""
        return {
            "type": "text",
            "message": "你好！我是智行伴侣，可以帮你规划行程。告诉我你们几个人、打算玩多久？",
            "state": state
        }
    
    async def _handle_recommendation(
        self,
        user_message: str,
        state: DialogState
    ) -> Dict[str, Any]:
        """处理推荐请求"""
        
        # 提取情绪关键词
        emotion = state.fields.get("emotion") or user_message
        
        # 调用Vibe Agent
        results = self.vibe_agent.match(emotion, top_k=5)
        
        # 构建回复
        message = f"为你推荐以下地方：\n\n"
        for i, r in enumerate(results[:3], 1):
            message += f"{i}. {r['name']} - {r['match_score']}%匹配\n"
            message += f"   {r['category']}, ¥{r['avg_price']}/人\n\n"
        
        message += "想让我帮你规划具体路线吗？告诉我你们几个人、玩多久就好！"
        
        return {
            "type": "recommendation",
            "message": message,
            "results": results[:3],
            "state": state
        }
    
    def _ask_for_info(
        self,
        state: DialogState,
        intent_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """询问缺失信息"""
        
        missing = state.get_missing_fields()
        next_q = intent_result.get("next_question")
        
        if not next_q:
            if "人数" in missing:
                next_q = "你们几个人一起去呢？"
            elif "时间" in missing:
                next_q = "打算玩多长时间？"
            elif "预算" in missing:
                next_q = "有预算要求吗？人均多少？"
            else:
                next_q = "还有其他要求吗？"
        
        return {
            "type": "text",
            "message": next_q,
            "missing_fields": missing,
            "state": state
        }
    
    async def _generate_itinerary(self, state: DialogState) -> Dict[str, Any]:
        """生成行程方案"""
        
        # 默认参数
        lat = state.fields.get("location_lat", 39.931)
        lon = state.fields.get("location_lon", 116.453)
        hours = state.fields.get("time_budget", 3.0)
        budget = state.fields.get("budget")
        
        # 调用Itinerary Agent
        agent = get_itinerary_agent()
        result = agent.plan(
            current_lat=lat,
            current_lon=lon,
            stay_hours=hours,
            budget=budget
        )
        
        # 构建回复
        message = f"好的！为你规划了一个行程：\n\n"
        message += f"总时长: {result['total_time_min']//60}小时{result['total_time_min']%60}分钟\n"
        message += f"总距离: {result['total_distance_km']}km\n"
        message += f"人均消费: ¥{result['total_cost']}\n\n"
        
        for i, item in enumerate(result['items'][:3], 1):
            if item.get('type') != 'rest':
                message += f"{i}. {item['name']} ({item['category']})\n"
                message += f"   {item['arrival_time']}到达，停留{item['stay_time_min']}分钟\n"
        
        return {
            "type": "itinerary",
            "message": message,
            "itinerary": result,
            "state": state
        }


_agent = None

def get_decision_agent() -> DecisionAgent:
    """获取DecisionAgent单例"""
    global _agent
    if _agent is None:
        _agent = DecisionAgent()
    return _agent
