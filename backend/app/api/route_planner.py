from fastapi import APIRouter, Query
from typing import List, Optional
from app.data.loader import load_pois
from app.utils.helpers import haversine_distance, estimate_travel_time
from app.agents.vibe_agent import get_vibe_agent
from datetime import datetime, timedelta

router = APIRouter(prefix="/route", tags=["路线规划"])

pois = load_pois()

LOCATION_COORDS = {
    "wudaokou": {"lat": 39.99, "lon": 116.34, "name": "五道口"},
    "sanlitun": {"lat": 39.931, "lon": 116.453, "name": "三里屯"},
    "wangfujing": {"lat": 39.914, "lon": 116.412, "name": "王府井"},
    "chaoyangpark": {"lat": 39.935, "lon": 116.478, "name": "朝阳公园"},
    "zhongguancun": {"lat": 39.98, "lon": 116.31, "name": "中关村"},
    "xidan": {"lat": 39.91, "lon": 116.37, "name": "西单"},
    "guomao": {"lat": 39.91, "lon": 116.46, "name": "国贸"},
}

TASK_KEYWORDS = {
    "看电影": ["电影院"],
    "吃饭": ["川菜", "日料", "西餐", "火锅", "快餐", "云南菜", "素食", "苏帮菜"],
    "喝咖啡": ["咖啡厅"],
    "喝酒": ["酒吧"],
    "逛街": ["书店", "商场"],
    "散步": ["公园"],
    "约会": ["西餐", "酒吧", "咖啡厅", "公园"],
    "聚会": ["火锅", "川菜", "酒吧"],
    "发呆": ["咖啡厅", "公园", "书店"],
    "拍照": ["公园", "书店", "咖啡厅"],
}

@router.get("/destination")
async def plan_destination_route(
    from_loc: str = Query(..., description="起点位置ID"),
    to_loc: str = Query(..., description="终点位置ID"),
    mode: str = Query("walk", description="出行方式: walk/bike/drive"),
    max_detour: float = Query(2.0, description="最大绕行距离(km)")
):
    """
    目的地规划：从A到B，推荐沿途好去处
    
    返回：
    - 直达路线（时间、距离）
    - 沿途推荐POI（距离路线500米内）
    - 优化路线（插入POI后）
    """
    if from_loc not in LOCATION_COORDS or to_loc not in LOCATION_COORDS:
        return {"success": False, "error": "无效的起点或终点"}
    
    start = LOCATION_COORDS[from_loc]
    end = LOCATION_COORDS[to_loc]
    
    direct_distance = haversine_distance(start["lat"], start["lon"], end["lat"], end["lon"])
    direct_time = estimate_travel_time(direct_distance, mode)
    
    nearby_pois = []
    for poi in pois:
        poi_to_start = haversine_distance(start["lat"], start["lon"], poi["latitude"], poi["longitude"])
        poi_to_end = haversine_distance(poi["latitude"], poi["longitude"], end["lat"], end["lon"])
        
        detour = poi_to_start + poi_to_end - direct_distance
        
        if detour <= max_detour and poi_to_start > 0.3 and poi_to_end > 0.3:
            nearby_pois.append({
                **poi,
                "detour_km": round(detour, 2),
                "distance_to_route": round(min(poi_to_start, poi_to_end), 2)
            })
    
    nearby_pois.sort(key=lambda x: x["detour_km"])
    recommended_pois = nearby_pois[:5]
    
    routes = []
    
    routes.append({
        "name": "直达路线",
        "type": "direct",
        "total_distance_km": round(direct_distance, 2),
        "total_time_min": direct_time,
        "segments": [{
            "from": start["name"],
            "to": end["name"],
            "distance_km": round(direct_distance, 2),
            "time_min": direct_time
        }],
        "summary": f"直达最快，{direct_time}分钟"
    })
    
    if recommended_pois:
        best_poi = recommended_pois[0]
        route_to_poi_dist = haversine_distance(start["lat"], start["lon"], best_poi["latitude"], best_poi["longitude"])
        route_to_poi_time = estimate_travel_time(route_to_poi_dist, mode)
        poi_to_end_dist = haversine_distance(best_poi["latitude"], best_poi["longitude"], end["lat"], end["lon"])
        poi_to_end_time = estimate_travel_time(poi_to_end_dist, mode)
        stay_time = best_poi.get("duration_min", 60)
        
        routes.append({
            "name": "顺路看看",
            "type": "detour",
            "total_distance_km": round(route_to_poi_dist + poi_to_end_dist, 2),
            "total_time_min": route_to_poi_time + stay_time + poi_to_end_time,
            "stop": {
                "name": best_poi["name"],
                "category": best_poi["category"],
                "rating": best_poi["rating"],
                "stay_time_min": stay_time
            },
            "segments": [
                {"from": start["name"], "to": best_poi["name"], "distance_km": round(route_to_poi_dist, 2), "time_min": route_to_poi_time},
                {"from": best_poi["name"], "to": end["name"], "distance_km": round(poi_to_end_dist, 2), "time_min": poi_to_end_time, "stay_time_min": stay_time}
            ],
            "summary": f"顺路去{best_poi['name']}，多走{best_poi['detour_km']}km"
        })
    
    return {
        "success": True,
        "from": {"id": from_loc, **start},
        "to": {"id": to_loc, **end},
        "direct_distance_km": round(direct_distance, 2),
        "direct_time_min": direct_time,
        "nearby_pois": recommended_pois[:3],
        "routes": routes
    }

@router.get("/task")
async def plan_task_route(
    tasks: str = Query(..., description="任务列表，逗号分隔，如'看电影,吃饭'"),
    location: str = Query(..., description="所在位置ID"),
    mode: str = Query("walk", description="出行方式"),
    time_budget: float = Query(4.0, description="时间预算(小时)")
):
    """
    目的任务规划：我要做这些事，推荐地点组合
    
    例如：["看电影","吃饭"] → 推荐"电影院+餐厅"组合+路线
    """
    task_list = [t.strip() for t in tasks.split(",")]
    
    if location not in LOCATION_COORDS:
        return {"success": False, "error": "无效的位置"}
    
    start = LOCATION_COORDS[location]
    
    task_categories = []
    for task in task_list:
        categories = TASK_KEYWORDS.get(task, [])
        if categories:
            task_categories.append({"task": task, "categories": categories})
    
    if not task_categories:
        return {"success": False, "error": "无法识别的任务"}
    
    candidates = []
    for task_cat in task_categories:
        matching_pois = []
        for poi in pois:
            if poi["category"] in task_cat["categories"]:
                distance = haversine_distance(start["lat"], start["lon"], poi["latitude"], poi["longitude"])
                travel_time = estimate_travel_time(distance, mode)
                matching_pois.append({**poi, "travel_time_min": travel_time})
        
        matching_pois.sort(key=lambda x: x["travel_time_min"])
        candidates.append({
            "task": task_cat["task"],
            "pois": matching_pois[:5]
        })
    
    combinations = []
    if len(candidates) >= 2:
        for poi1 in candidates[0]["pois"][:3]:
            for poi2 in candidates[1]["pois"][:3]:
                if poi1["id"] == poi2["id"]:
                    continue
                
                dist1 = haversine_distance(start["lat"], start["lon"], poi1["latitude"], poi1["longitude"])
                time1 = estimate_travel_time(dist1, mode)
                stay1 = poi1.get("duration_min", 60)
                
                dist2 = haversine_distance(poi1["latitude"], poi1["longitude"], poi2["latitude"], poi2["longitude"])
                time2 = estimate_travel_time(dist2, mode)
                stay2 = poi2.get("duration_min", 60)
                
                total_time = time1 + stay1 + time2 + stay2
                
                if total_time <= time_budget * 60:
                    combinations.append({
                        "places": [
                            {"name": poi1["name"], "category": poi1["category"], "rating": poi1["rating"], "task": candidates[0]["task"]},
                            {"name": poi2["name"], "category": poi2["category"], "rating": poi2["rating"], "task": candidates[1]["task"]}
                        ],
                        "total_time_min": total_time,
                        "total_distance_km": round(dist1 + dist2, 2),
                        "route": [
                            {"from": start["name"], "to": poi1["name"], "time_min": time1, "stay_min": stay1},
                            {"from": poi1["name"], "to": poi2["name"], "time_min": time2, "stay_min": stay2}
                        ],
                        "score": poi1["rating"] + poi2["rating"] - total_time / 60
                    })
    
    combinations.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "success": True,
        "location": {"id": location, **start},
        "tasks": tasks,
        "task_candidates": candidates,
        "combinations": combinations[:5],
        "best_plan": combinations[0] if combinations else None
    }

@router.get("/locations")
async def get_available_locations():
    """获取所有可用位置列表"""
    return {
        "success": True,
        "locations": [
            {"id": k, "name": v["name"], "lat": v["lat"], "lon": v["lon"]}
            for k, v in LOCATION_COORDS.items()
        ]
    }

@router.get("/tasks")
async def get_available_tasks():
    """获取所有可用任务类型"""
    return {
        "success": True,
        "tasks": [
            {"task": k, "categories": v}
            for k, v in TASK_KEYWORDS.items()
        ]
    }
