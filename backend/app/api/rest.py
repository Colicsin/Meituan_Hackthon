"""
休憩点API接口
"""
from fastapi import APIRouter, Query
from typing import List
from app.data.loader import load_rest_points
from app.utils.helpers import haversine_distance

router = APIRouter(prefix="/rest", tags=["休憩"])

@router.get("/nearby")
async def get_nearby_rest_points(
    lat: float = Query(..., description="当前纬度"),
    lng: float = Query(..., description="当前经度"),
    radius: int = Query(500, description="搜索半径（米）")
):
    """
    查询附近的休憩点
    
    示例: GET /rest/nearby?lat=39.931&lng=116.453&radius=1000
    """
    points = load_rest_points()
    nearby = []
    
    for p in points:
        dist_km = haversine_distance(lat, lng, p["latitude"], p["longitude"])
        dist_m = int(dist_km * 1000)
        
        if dist_m <= radius:
            nearby.append({
                "id": p["id"],
                "name": p["name"],
                "latitude": p["latitude"],
                "longitude": p["longitude"],
                "type": p["type"],
                "has_roof": p.get("has_roof", False),
                "has_backrest": p.get("has_backrest", False),
                "description": p["description"],
                "distance_m": dist_m
            })
    
    nearby.sort(key=lambda x: x["distance_m"])
    
    return {
        "success": True,
        "total": len(nearby),
        "nearby": nearby
    }
