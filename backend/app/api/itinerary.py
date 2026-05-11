"""
行程规划API接口
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
from app.agents.itinerary_agent import get_itinerary_agent

router = APIRouter(prefix="/itinerary", tags=["Itinerary"])


class PlanCustomRequest(BaseModel):
    """自定义POI规划请求"""
    poi_ids: List[str]
    origin_lat: float
    origin_lng: float
    start_time: Optional[str] = "10:00"


@router.post("/plan-custom")
async def plan_custom_itinerary(request: PlanCustomRequest):
    """
    根据用户选择的POI规划多种路线方案
    
    返回3种路线：
    - 最快路线（距离最短）
    - 最优路线（平衡评分和距离）
    - 最省路线（价格最低）
    """
    if len(request.poi_ids) < 2:
        return {
            "success": False,
            "error": "至少需要选择2个地点"
        }
    
    agent = get_itinerary_agent()
    
    routes = agent.plan_with_pois(
        poi_ids=request.poi_ids,
        origin_lat=request.origin_lat,
        origin_lon=request.origin_lng,
        start_time=request.start_time or "10:00"
    )
    
    return {
        "success": True,
        "routes": routes
    }


@router.get("/plan")
async def plan_itinerary(
    lat: float = Query(..., description="当前纬度"),
    lon: float = Query(..., description="当前经度"),
    hours: float = Query(3.0, description="停留时长(小时)"),
    preferences: Optional[str] = Query(None, description="偏好标签(逗号分隔)"),
    budget: Optional[int] = Query(None, description="预算上限"),
    start_time: str = Query("10:00", description="开始时间"),
    mode: str = Query("walk", description="出行方式")
):
    """
    规划行程方案
    
    示例:
    - GET /itinerary/plan?lat=39.90&lon=116.40&hours=2&preferences=安静,咖啡
    """
    agent = get_itinerary_agent()
    
    pref_list = []
    if preferences:
        pref_list = [p.strip() for p in preferences.split(",") if p.strip()]
    
    result = agent.plan(
        current_lat=lat,
        current_lon=lon,
        stay_hours=hours,
        preferences=pref_list,
        budget=budget,
        start_time=start_time,
        mode=mode
    )
    
    return {
        "success": True,
        "data": result
    }

@router.get("/quick-plan/{location_id}")
async def quick_plan(location_id: str):
    """
    快速规划 - 基于预设位置
    
    location_id: 
    - wudaokou: 五道口
    - sanlitun: 三里屯
    - wangfujing: 王府井
    """
    locations = {
        "wudaokou": {"lat": 39.990, "lon": 116.338, "name": "五道口"},
        "sanlitun": {"lat": 39.933, "lon": 116.456, "name": "三里屯"},
        "wangfujing": {"lat": 39.914, "lon": 116.411, "name": "王府井"}
    }
    
    if location_id not in locations:
        return {
            "success": False,
            "error": f"未知位置: {location_id}",
            "available": list(locations.keys())
        }
    
    loc = locations[location_id]
    
    agent = get_itinerary_agent()
    
    result = agent.plan(
        current_lat=loc["lat"],
        current_lon=loc["lon"],
        stay_hours=3.0,
        start_time="10:00",
        mode="walk"
    )
    
    return {
        "success": True,
        "location": loc["name"],
        "data": result
    }
