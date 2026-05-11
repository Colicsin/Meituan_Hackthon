"""
微气候API接口
"""
from fastapi import APIRouter, Query
from typing import List
from app.data.loader import load_climate_segments

router = APIRouter(prefix="/climate", tags=["微气候"])

@router.get("/segments")
async def get_climate_segments():
    """
    获取所有微气候路段
    
    示例: GET /climate/segments
    """
    segments = load_climate_segments()
    
    return {
        "success": True,
        "total": len(segments),
        "segments": segments
    }

@router.get("/nearby")
async def get_nearby_climate_segments(
    lat: float = Query(..., description="当前纬度"),
    lng: float = Query(..., description="当前经度"),
    radius: int = Query(1000, description="搜索半径（米）")
):
    """
    查询附近的微气候路段
    
    示例: GET /climate/nearby?lat=39.931&lng=116.453&radius=1000
    """
    from app.utils.helpers import haversine_distance
    
    segments = load_climate_segments()
    nearby = []
    
    for seg in segments:
        mid_lat = (seg["start_lat"] + seg["end_lat"]) / 2
        mid_lng = (seg["start_lng"] + seg["end_lng"]) / 2
        
        dist_km = haversine_distance(lat, lng, mid_lat, mid_lng)
        dist_m = int(dist_km * 1000)
        
        if dist_m <= radius:
            nearby.append({
                **seg,
                "distance_m": dist_m
            })
    
    nearby.sort(key=lambda x: x["distance_m"])
    
    return {
        "success": True,
        "total": len(nearby),
        "nearby": nearby
    }
