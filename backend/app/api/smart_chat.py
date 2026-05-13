from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, AsyncGenerator
from app.services.llm_client import get_llm
from app.agents.vibe_agent import get_vibe_agent
from app.agents.itinerary_agent import get_itinerary_agent
import json

router = APIRouter(prefix="/smart-chat", tags=["智能对话"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    stream: bool = False

SYSTEM_PROMPT = """你是智行伴侣，一个智能出行助手。你能帮助用户：

1. **情绪推荐**：根据用户心情推荐合适的地方
   - 用户说"我想找个安静的地方"、"心情不好想散散心"
   - 回复包含情绪关键词，前端会自动触发推荐

2. **行程规划**：帮用户规划出行路线
   - 用户说"我想去五道口玩3小时"
   - 提取地点、时长、人数等信息

3. **地点查询**：查询附近商家信息
   - 用户说"附近有什么好吃的"
   - 推荐餐饮类POI

4. **闲聊**：日常对话，给出友好回复

回复规则：
- 简洁友好，1-3句话
- 如果用户提到情绪词（安静、热闹、放松、浪漫等），在回复末尾加上 [情绪:xxx]
- 如果用户提到地点和时间，在回复末尾加上 [地点:xxx] [时长:xxx小时]
- 用中文回复

示例：
用户：我有点累，想找个安静的地方
助手：理解你的心情，安静的环境能让人放松。[情绪:安静]

用户：我想去三里屯玩一下午
助手：三里屯是个好去处！下午有很多选择。[地点:三里屯] [时长:4小时]

用户：你好
助手：你好！我是智行伴侣，可以帮你推荐去处或规划行程。今天想做什么？"""

async def generate_stream(messages: List[Dict], llm) -> AsyncGenerator[str, None]:
    """生成流式响应"""
    try:
        async for chunk in llm.chat_stream(messages, SYSTEM_PROMPT, temperature=0.7):
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"

@router.post("/chat")
async def smart_chat(request: ChatRequest):
    """智能对话接口"""
    llm = get_llm()
    
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    if request.stream:
        return StreamingResponse(
            generate_stream(messages, llm),
            media_type="text/event-stream"
        )
    
    try:
        response = await llm.chat(messages, SYSTEM_PROMPT, temperature=0.7)
        
        emotion = None
        location = None
        duration = None
        recommendations = None
        
        if "[情绪:" in response:
            import re
            emotion_match = re.search(r'\[情绪:(.*?)\]', response)
            if emotion_match:
                emotion = emotion_match.group(1)
                response = response.replace(emotion_match.group(0), "").strip()
                
                vibe_agent = get_vibe_agent()
                recommendations = vibe_agent.match(f"我想找个{emotion}的地方", top_k=5)
        
        if "[地点:" in response:
            import re
            loc_match = re.search(r'\[地点:(.*?)\]', response)
            if loc_match:
                location = loc_match.group(1)
                response = response.replace(loc_match.group(0), "").strip()
        
        if "[时长:" in response:
            import re
            dur_match = re.search(r'\[时长:(.*?)小时\]', response)
            if dur_match:
                duration = float(dur_match.group(1))
                response = response.replace(dur_match.group(0), "").strip()
        
        return {
            "success": True,
            "response": response,
            "metadata": {
                "emotion": emotion,
                "location": location,
                "duration": duration
            },
            "recommendations": recommendations
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "response": "抱歉，我遇到了一些问题。请稍后再试。"
        }

@router.post("/recommend")
async def smart_recommend(
    emotion: Optional[str] = None,
    location: Optional[str] = None,
    duration: Optional[float] = None
):
    """智能推荐接口"""
    results = {}
    
    if emotion:
        vibe_agent = get_vibe_agent()
        results["emotion_based"] = vibe_agent.match(f"我想找个{emotion}的地方", top_k=5)
    
    if location and duration:
        itinerary_agent = get_itinerary_agent()
        
        loc_coords = {
            "五道口": (39.99, 116.34),
            "三里屯": (39.931, 116.453),
            "王府井": (39.914, 116.412),
        }
        
        if location in loc_coords:
            lat, lon = loc_coords[location]
            plan = itinerary_agent.plan(lat, lon, stay_hours=duration)
            results["itinerary"] = plan
    
    return {
        "success": True,
        "results": results
    }

@router.get("/suggest")
async def get_suggestions():
    """获取对话建议"""
    return {
        "success": True,
        "suggestions": [
            {"text": "我想找个安静的地方", "type": "emotion"},
            {"text": "心情不好想散散心", "type": "emotion"},
            {"text": "我想去三里屯玩一下午", "type": "plan"},
            {"text": "附近有什么好吃的", "type": "query"},
            {"text": "帮我规划一个浪漫的约会", "type": "plan"},
            {"text": "推荐适合发呆的地方", "type": "emotion"},
        ]
    }
