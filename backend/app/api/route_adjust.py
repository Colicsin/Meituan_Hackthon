from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.data.loader import load_pois
from app.utils.helpers import haversine_distance, estimate_travel_time

router = APIRouter(prefix="/route-adjust", tags=["路线微调"])

pois = load_pois()

class DetourRequest(BaseModel):
    current_lat: float
    current_lon: float
    target_lat: float
    target_lon: float
    final_dest_lat: float
    final_dest_lon: float
    mode: str = "walk"

class ShortcutRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    mode: str = "walk"

SHORTCUTS = [
    {
        "id": "shortcut_001",
        "name": "三里屯SOHO内部通道",
        "type": "internal_path",
        "start": {"lat": 39.920, "lon": 116.457},
        "end": {"lat": 39.918, "lon": 116.459},
        "distance_m": 180,
        "save_m": 120,
        "save_min": 3,
        "conditions": ["人车分流", "有遮阳", "平坦"],
        "warnings": [],
        "accessible": True
    },
    {
        "id": "shortcut_002",
        "name": "工体北路小巷",
        "type": "alley",
        "start": {"lat": 39.930, "lon": 116.448},
        "end": {"lat": 39.932, "lon": 116.450},
        "distance_m": 250,
        "save_m": 200,
        "save_min": 4,
        "conditions": ["安静", "有树荫"],
        "warnings": ["雨天可能积水"],
        "accessible": False
    },
    {
        "id": "shortcut_003",
        "name": "王府井地下通道",
        "type": "underground",
        "start": {"lat": 39.913, "lon": 116.410},
        "end": {"lat": 39.915, "lon": 116.413},
        "distance_m": 300,
        "save_m": 150,
        "save_min": 2,
        "conditions": ["室内", "空调", "无日晒雨淋"],
        "warnings": [],
        "accessible": True
    }
]

ENTERTAINMENT_CONTENT = [
    {"type": "fact", "content": "前方这座三里屯太古里建于2008年，是北京首个开放式购物街区"},
    {"type": "fact", "content": "你正在经过的工体北路，曾举办过1961年世乒赛"},
    {"type": "joke", "content": "堵车时最适合思考人生，比如：为什么前面的车总是比我快？"},
    {"type": "joke", "content": "好消息：前面有家星巴克！坏消息：排队也要等"},
    {"type": "tip", "content": "附近500米有家评分4.8的书店，要不要下车走走？"},
    {"type": "tip", "content": "再等10分钟还不如去前面便利店买瓶水"},
]

@router.post("/detour")
async def calculate_detour(request: DetourRequest):
    """
    计算绕道方案
    用户在地图上长按某个位置，计算绕道方案
    """
    to_target_dist = haversine_distance(
        request.current_lat, request.current_lon,
        request.target_lat, request.target_lon
    )
    
    to_target_time = estimate_travel_time(to_target_dist, request.mode)
    
    target_to_final_dist = haversine_distance(
        request.target_lat, request.target_lon,
        request.final_dest_lat, request.final_dest_lon
    )
    target_to_final_time = estimate_travel_time(target_to_final_dist, request.mode)
    
    direct_dist = haversine_distance(
        request.current_lat, request.current_lon,
        request.final_dest_lat, request.final_dest_lon
    )
    direct_time = estimate_travel_time(direct_dist, request.mode)
    
    detour_dist = to_target_dist + target_to_final_dist
    detour_time = to_target_time + target_to_final_time
    
    extra_dist = detour_dist - direct_dist
    extra_time = detour_time - direct_time
    
    nearby_poi = None
    min_poi_dist = float('inf')
    for poi in pois:
        poi_dist = haversine_distance(
            request.target_lat, request.target_lon,
            poi["latitude"], poi["longitude"]
        )
        if poi_dist < min_poi_dist and poi_dist < 0.1:
            min_poi_dist = poi_dist
            nearby_poi = poi
    
    return {
        "success": True,
        "detour": {
            "to_target": {
                "distance_km": round(to_target_dist, 2),
                "time_min": to_target_time
            },
            "target_to_final": {
                "distance_km": round(target_to_final_dist, 2),
                "time_min": target_to_final_time
            },
            "total_distance_km": round(detour_dist, 2),
            "total_time_min": detour_time,
            "extra_distance_km": round(extra_dist, 2),
            "extra_time_min": extra_time
        },
        "direct": {
            "distance_km": round(direct_dist, 2),
            "time_min": direct_time
        },
        "nearby_poi": nearby_poi,
        "recommendation": "绕道合理" if extra_time < 15 else "建议考虑直达",
        "message": f"绕道{round(extra_dist, 0)}公里，多花{extra_time}分钟" if extra_dist > 0.1 else "几乎不绕路"
    }

@router.post("/shortcuts")
async def find_shortcuts(request: ShortcutRequest):
    """
    发现捷径
    最后500米的捷径推荐
    """
    direct_dist = haversine_distance(
        request.start_lat, request.start_lon,
        request.end_lat, request.end_lon
    )
    
    if direct_dist > 1.0:
        return {
            "success": True,
            "message": "捷径功能仅适用于最后1公里内",
            "shortcuts": []
        }
    
    direct_time = estimate_travel_time(direct_dist, request.mode)
    
    matching_shortcuts = []
    
    for shortcut in SHORTCUTS:
        start_to_shortcut_start = haversine_distance(
            request.start_lat, request.start_lon,
            shortcut["start"]["lat"], shortcut["start"]["lon"]
        )
        
        shortcut_end_to_dest = haversine_distance(
            shortcut["end"]["lat"], shortcut["end"]["lon"],
            request.end_lat, request.end_lon
        )
        
        if start_to_shortcut_start < 0.3 and shortcut_end_to_dest < 0.3:
            matching_shortcuts.append({
                **shortcut,
                "distance_from_start": round(start_to_shortcut_start * 1000),
                "recommendation": f"省{shortcut['save_min']}分钟，但{' '.join(shortcut.get('warnings', ['无风险']))}"
            })
    
    return {
        "success": True,
        "direct_route": {
            "distance_km": round(direct_dist, 2),
            "time_min": direct_time
        },
        "shortcuts": matching_shortcuts,
        "total_shortcuts": len(matching_shortcuts)
    }

@router.get("/entertainment")
async def get_traffic_entertainment():
    """
    拥堵情绪调节
    堵车时推荐的内容
    """
    import random
    
    selected = random.sample(ENTERTAINMENT_CONTENT, min(3, len(ENTERTAINMENT_CONTENT)))
    
    nearby_options = []
    nearby_pois = sorted(pois, key=lambda p: p["rating"], reverse=True)[:3]
    for poi in nearby_pois:
        nearby_options.append({
            "name": poi["name"],
            "category": poi["category"],
            "rating": poi["rating"],
            "action": f"下车去{poi['name']}逛逛？"
        })
    
    return {
        "success": True,
        "content": selected,
        "nearby_options": nearby_options,
        "message": "堵车不堵心，这些内容帮你打发时间"
    }

@router.post("/report-traffic")
async def report_user_traffic(
    lat: float,
    lon: float,
    message: str,
    event_type: str = "congestion"
):
    """
    用户上报路况弹幕
    """
    return {
        "success": True,
        "message": "感谢上报！你的情报将帮助其他用户",
        "report": {
            "location": {"lat": lat, "lon": lon},
            "message": message,
            "event_type": event_type,
            "expire_min": 30
        }
    }
