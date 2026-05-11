"""
Live Event API - 出行中事件触发接口
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.agents.live_agent import get_live_agent

router = APIRouter(prefix="/live", tags=["实时事件"])


class TriggerEventRequest(BaseModel):
    """触发事件请求"""
    event_type: str
    current_poi_id: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None


@router.post("/trigger")
async def trigger_event(request: TriggerEventRequest):
    """
    触发实时事件
    
    支持的事件类型：
    - crowd_surge: 客流激增
    - weather_change: 天气转阴
    - fatigue_detected: 疲劳检测
    """
    agent = get_live_agent()
    
    kwargs = {}
    if request.current_poi_id:
        kwargs['current_poi_id'] = request.current_poi_id
    if request.current_lat:
        kwargs['current_lat'] = request.current_lat
    if request.current_lng:
        kwargs['current_lng'] = request.current_lng
    
    result = agent.trigger_event(request.event_type, **kwargs)
    
    return result


@router.get("/events")
async def get_supported_events():
    """获取支持的事件类型"""
    return {
        'success': True,
        'events': [
            {
                'type': 'crowd_surge',
                'name': '客流激增',
                'description': '目的地客流激增，推荐替代POI',
                'icon': '👥'
            },
            {
                'type': 'weather_change',
                'name': '天气转阴',
                'description': '天气转阴可能下雨，推荐有顶棚地点',
                'icon': '☔'
            },
            {
                'type': 'fatigue_detected',
                'name': '疲劳检测',
                'description': '步频减慢，推荐附近小憩点',
                'icon': '☕'
            }
        ]
    }
