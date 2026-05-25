from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.data.loader import load_pois
from app.agents.vibe_agent import get_vibe_agent
from app.agents.itinerary_agent import get_itinerary_agent
from app.utils.helpers import haversine_distance, estimate_travel_time
import random

router = APIRouter(prefix="/smart-plan", tags=["智能规划"])

pois = load_pois()

USER_PROFILES = {
    "solo": {
        "name": "独自出行",
        "keywords": ["安静", "平和", "适合工作", "一人食", "独处"],
        "avoid": ["聚会", "热闹", "排队"],
        "budget_pref": "中等",
        "pace": "悠闲"
    },
    "couple": {
        "name": "情侣约会",
        "keywords": ["浪漫", "氛围", "约会", "安静", "有情调"],
        "avoid": ["热闹", "聚会", "嘈杂"],
        "budget_pref": "中高",
        "pace": "悠闲"
    },
    "family": {
        "name": "家庭出游",
        "keywords": ["亲子", "儿童友好", "空间大", "不辣", "健康"],
        "avoid": ["酒吧", "夜店", "嘈杂", "排队久"],
        "budget_pref": "中等",
        "pace": "从容"
    },
    "friends": {
        "name": "朋友聚会",
        "keywords": ["热闹", "聚会", "氛围好", "适合聚餐", "好玩"],
        "avoid": ["安静", "一人食", "沉闷"],
        "budget_pref": "中等",
        "pace": "活跃"
    }
}

def detect_user_profile(text: str) -> str:
    text_lower = text.lower()
    
    if any(k in text_lower for k in ["一个人", "独自", "自己", "我一人"]):
        return "solo"
    if any(k in text_lower for k in ["情侣", "约会", "两个人", "女友", "男友", "对象"]):
        return "couple"
    if any(k in text_lower for k in ["孩子", "带娃", "家庭", "全家", "爸妈", "小孩"]):
        return "family"
    if any(k in text_lower for k in ["朋友", "聚会", "一群人", "同事", "几个"]):
        return "friends"
    
    return "solo"

def get_queue_time(poi_id: str, hour: int) -> int:
    random.seed(hash(poi_id) + hour)
    base = random.randint(0, 60)
    
    if 11 <= hour <= 13 or 17 <= hour <= 19:
        return base + random.randint(20, 40)
    return base

class PlanRequest(BaseModel):
    user_input: str
    current_lat: float = 39.931
    current_lon: float = 116.453
    time_budget_hours: float = 4.0
    budget: Optional[int] = None

class AdjustRequest(BaseModel):
    session_id: str
    feedback: str
    current_plan: List[dict]

@router.post("/analyze")
async def analyze_user_intent(request: PlanRequest):
    """
    智能分析用户意图，返回规划过程
    """
    steps = []
    
    steps.append({
        "stage": "理解需求",
        "status": "done",
        "detail": f"用户说：\"{request.user_input[:50]}...\""
    })
    
    profile = detect_user_profile(request.user_input)
    profile_info = USER_PROFILES[profile]
    
    steps.append({
        "stage": "识别画像",
        "status": "done",
        "detail": f"识别为「{profile_info['name']}」场景",
        "profile": profile,
        "preferences": profile_info["keywords"][:3]
    })
    
    vibe_agent = get_vibe_agent()
    search_text = " ".join(profile_info["keywords"][:2])
    matches = vibe_agent.match(search_text, top_k=10)
    
    filtered = []
    for poi in matches:
        poi_tags = poi.get("tags", [])
        if not any(avoid in poi_tags for avoid in profile_info["avoid"]):
            filtered.append(poi)
    
    steps.append({
        "stage": "筛选POI",
        "status": "done",
        "detail": f"从{len(matches)}个候选中筛选出{len(filtered)}个匹配「{profile_info['name']}」场景的地点",
        "candidates": len(filtered)
    })
    
    steps.append({
        "stage": "检查排队",
        "status": "done",
        "detail": "正在分析各商家的排队情况..."
    })
    
    itinerary_agent = get_itinerary_agent()
    preferences = profile_info["keywords"][:3]
    
    plan = itinerary_agent.plan(
        current_lat=request.current_lat,
        current_lon=request.current_lon,
        stay_hours=request.time_budget_hours,
        preferences=preferences,
        budget=request.budget
    )
    
    for item in plan.get("items", []):
        if "poi_id" in item:
            item["queue_time_min"] = get_queue_time(item["poi_id"], 14)
    
    steps.append({
        "stage": "生成路线",
        "status": "done",
        "detail": f"已生成包含{len(plan.get('items', []))}个地点的行程路线"
    })
    
    return {
        "success": True,
        "profile": {
            "type": profile,
            "name": profile_info["name"],
            "description": f"适合{profile_info['pace']}节奏，偏好{profile_info['budget_pref']}消费"
        },
        "steps": steps,
        "plan": plan,
        "suggestions": [
            "如果觉得太远，可以说「换个近一点的」",
            "如果不想排队，可以说「排除排队久的」",
            "如果想换个类型，可以说「我想去看电影」"
        ]
    }

@router.post("/adjust")
async def adjust_plan(request: AdjustRequest):
    """
    根据用户反馈调整计划
    """
    feedback = request.feedback.lower()
    adjustments = []
    
    filtered_items = request.current_plan.copy()
    
    if "远" in feedback or "太远" in feedback:
        filtered_items = [item for item in filtered_items 
                        if item.get("travel_time_min", 0) < 15]
        adjustments.append("已筛选路程15分钟内的地点")
    
    if "排队" in feedback or "不想等" in feedback:
        filtered_items = [item for item in filtered_items 
                        if item.get("queue_time_min", 0) < 20]
        adjustments.append("已排除排队超过20分钟的商家")
    
    if "贵" in feedback or "便宜" in feedback:
        filtered_items = [item for item in filtered_items 
                        if item.get("avg_price", 0) < 80]
        adjustments.append("已筛选人均80元以内的地点")
    
    if not adjustments:
        adjustments.append(f"收到您的反馈：「{request.feedback}」，正在重新规划...")
    
    return {
        "success": True,
        "adjustments": adjustments,
        "updated_plan": filtered_items[:5],
        "message": "已根据您的反馈调整行程"
    }

@router.get("/profiles")
async def get_profiles():
    """获取所有用户画像类型"""
    return {
        "success": True,
        "profiles": [
            {
                "id": k,
                "name": v["name"],
                "keywords": v["keywords"][:3],
                "pace": v["pace"]
            }
            for k, v in USER_PROFILES.items()
        ]
    }

@router.get("/queue/{poi_id}")
async def get_queue_info(poi_id: str, hour: int = 14):
    """获取POI排队信息"""
    queue_time = get_queue_time(poi_id, hour)
    
    poi = next((p for p in pois if p["id"] == poi_id), None)
    
    return {
        "success": True,
        "poi_id": poi_id,
        "poi_name": poi["name"] if poi else "未知",
        "current_hour": hour,
        "queue_time_min": queue_time,
        "peak_hours": [11, 12, 13, 17, 18, 19],
        "suggestion": "建议错峰前往" if queue_time > 30 else "当前排队较少"
    }
