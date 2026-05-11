"""
行程规划Agent - 根据位置、时间、偏好生成行程方案

核心逻辑：
1. 用户输入当前位置、停留时长、偏好
2. 计算所有候选POI的综合评分
3. 使用贪心算法选择最优路线
4. 在合适位置插入休憩点
"""
from app.data.loader import load_pois, load_rest_points
from app.utils.helpers import haversine_distance, estimate_travel_time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

class ItineraryAgent:
    """行程规划智能体"""
    
    def __init__(self):
        """初始化Agent"""
        print("🗺️ 初始化 ItineraryAgent...")
        
        self.pois = load_pois()
        self.rest_points = load_rest_points()
        
        print(f"✅ ItineraryAgent初始化完成，{len(self.pois)}个商家，{len(self.rest_points)}个休憩点")
    
    def plan(
        self,
        current_lat: float,
        current_lon: float,
        stay_hours: float = 3.0,
        preferences: Optional[List[str]] = None,
        budget: Optional[int] = None,
        start_time: str = "10:00",
        mode: str = "walk"
    ) -> Dict[str, Any]:
        """
        规划行程方案
        
        Args:
            current_lat: 当前纬度
            current_lon: 当前经度
            stay_hours: 停留时长(小时)
            preferences: 用户偏好标签(如["安静", "咖啡"])
            budget: 预算上限(人均)
            start_time: 开始时间 "HH:MM"
            mode: 出行方式 (walk/bike/drive)
        
        Returns:
            行程方案，包含：
            - total_time: 总时间(分钟)
            - total_distance: 总距离(公里)
            - total_cost: 预估消费(元)
            - items: 行程项列表
            - summary: 摘要
        """
        preferences = preferences or []
        total_budget_minutes = int(stay_hours * 60)
        
        candidates = self._filter_candidates(preferences, budget)
        
        selected = []
        remaining_time = total_budget_minutes
        current_pos = (current_lat, current_lon)
        current_time = self._parse_time(start_time)
        
        while candidates and remaining_time > 30:
            best = self._select_next(
                candidates, 
                current_pos, 
                remaining_time,
                preferences,
                mode
            )
            
            if not best:
                break
            
            distance = haversine_distance(
                current_pos[0], current_pos[1],
                best["latitude"], best["longitude"]
            )
            
            travel_time = estimate_travel_time(distance, mode)
            stay_time = best.get("duration_min", 60)
            total_item_time = travel_time + stay_time
            
            if total_item_time > remaining_time:
                candidates.remove(best)
                continue
            
            arrival_time = current_time + timedelta(minutes=travel_time)
            leave_time = arrival_time + timedelta(minutes=stay_time)
            
            selected.append({
                "poi_id": best["id"],
                "name": best["name"],
                "category": best["category"],
                "rating": best["rating"],
                "avg_price": best["avg_price"],
                "distance_from_prev": round(distance, 2),
                "travel_time_min": travel_time,
                "stay_time_min": stay_time,
                "arrival_time": self._format_time(arrival_time),
                "leave_time": self._format_time(leave_time),
                "address": best["address"],
                "tags": best["tags"][:3]
            })
            
            candidates.remove(best)
            current_pos = (best["latitude"], best["longitude"])
            current_time = leave_time
            remaining_time -= total_item_time
        
        if len(selected) >= 2:
            selected = self._insert_rest_points(selected, mode)
        
        return self._build_result(selected, current_lat, current_lon, mode)
    
    def _filter_candidates(
        self, 
        preferences: List[str], 
        budget: Optional[int]
    ) -> List[Dict]:
        """筛选候选POI"""
        candidates = []
        
        for poi in self.pois:
            if budget and poi["avg_price"] > budget:
                continue
            
            if preferences:
                match_score = 0
                for pref in preferences:
                    if pref in poi["tags"] or pref in poi["category"]:
                        match_score += 1
                
                if match_score == 0:
                    continue
            
            candidates.append(poi)
        
        return candidates
    
    def _select_next(
        self,
        candidates: List[Dict],
        current_pos: Tuple[float, float],
        remaining_time: int,
        preferences: List[str],
        mode: str
    ) -> Optional[Dict]:
        """选择下一个最优POI"""
        scored = []
        
        for poi in candidates:
            distance = haversine_distance(
                current_pos[0], current_pos[1],
                poi["latitude"], poi["longitude"]
            )
            
            travel_time = estimate_travel_time(distance, mode)
            stay_time = poi.get("duration_min", 60)
            
            if travel_time + stay_time > remaining_time:
                continue
            
            distance_score = max(0, 10 - distance)
            rating_score = poi["rating"] * 2
            pref_score = 0
            for pref in preferences:
                if pref in poi["tags"]:
                    pref_score += 3
            
            total_score = distance_score + rating_score + pref_score
            
            scored.append((poi, total_score))
        
        if not scored:
            return None
        
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[0][0]
    
    def _insert_rest_points(
        self, 
        items: List[Dict], 
        mode: str
    ) -> List[Dict]:
        """在行程中插入休憩点"""
        result = []
        
        for i, item in enumerate(items):
            result.append(item)
            
            if i < len(items) - 1:
                next_item = items[i + 1]
                
                if item["travel_time_min"] + next_item["travel_time_min"] > 20:
                    rest = self._find_nearby_rest_point(item)
                    
                    if rest:
                        result.append({
                            "type": "rest",
                            "name": rest["name"],
                            "rest_type": rest["type"],
                            "description": rest.get("description", ""),
                            "tip": "建议休息5-10分钟"
                        })
        
        return result
    
    def plan_with_pois(
        self,
        poi_ids: List[str],
        origin_lat: float,
        origin_lon: float,
        start_time: str = "10:00"
    ) -> List[Dict[str, Any]]:
        """
        根据用户选择的POI规划多种路线方案
        
        Args:
            poi_ids: 用户选择的POI ID列表
            origin_lat: 起点纬度
            origin_lon: 起点经度
            start_time: 开始时间
        
        Returns:
            多种路线方案（最快、最优、最省）
        """
        selected_pois = []
        for poi in self.pois:
            if poi["id"] in poi_ids:
                selected_pois.append(poi)
        
        if len(selected_pois) < 2:
            return []
        
        routes = []
        
        fastest = self._plan_route_fastest(selected_pois, origin_lat, origin_lon, start_time)
        routes.append(fastest)
        
        optimal = self._plan_route_optimal(selected_pois, origin_lat, origin_lon, start_time)
        routes.append(optimal)
        
        cheapest = self._plan_route_cheapest(selected_pois, origin_lat, origin_lon, start_time)
        routes.append(cheapest)
        
        return routes
    
    def _plan_route_fastest(
        self,
        pois: List[Dict],
        origin_lat: float,
        origin_lon: float,
        start_time: str
    ) -> Dict[str, Any]:
        """规划最快路线（距离最短）"""
        items = []
        remaining = pois.copy()
        current_pos = (origin_lat, origin_lon)
        current_time = self._parse_time(start_time)
        
        while remaining:
            nearest = min(remaining, key=lambda p: haversine_distance(
                current_pos[0], current_pos[1], p["latitude"], p["longitude"]
            ))
            
            distance = haversine_distance(
                current_pos[0], current_pos[1],
                nearest["latitude"], nearest["longitude"]
            )
            
            travel_time = estimate_travel_time(distance, "walk")
            stay_time = nearest.get("duration_min", 60)
            
            arrival_time = current_time + timedelta(minutes=travel_time)
            leave_time = arrival_time + timedelta(minutes=stay_time)
            
            items.append({
                "poi_id": nearest["id"],
                "name": nearest["name"],
                "category": nearest["category"],
                "rating": nearest["rating"],
                "avg_price": nearest["avg_price"],
                "latitude": nearest["latitude"],
                "longitude": nearest["longitude"],
                "distance_from_prev": round(distance, 2),
                "travel_time_min": travel_time,
                "stay_time_min": stay_time,
                "arrival_time": self._format_time(arrival_time),
                "leave_time": self._format_time(leave_time),
                "address": nearest["address"],
                "tags": nearest["tags"][:3]
            })
            
            remaining.remove(nearest)
            current_pos = (nearest["latitude"], nearest["longitude"])
            current_time = leave_time
        
        total_distance = sum(item["distance_from_prev"] for item in items)
        total_time = sum(item["travel_time_min"] + item["stay_time_min"] for item in items)
        total_price = sum(item["avg_price"] for item in items)
        
        return {
            "name": "最快路线",
            "style": "fastest",
            "segments": items,
            "total_distance_km": round(total_distance, 2),
            "total_time_min": total_time,
            "total_price": total_price,
            "summary": f"最短距离，总路程{round(total_distance, 1)}km，耗时{total_time//60}小时{total_time%60}分钟"
        }
    
    def _plan_route_optimal(
        self,
        pois: List[Dict],
        origin_lat: float,
        origin_lon: float,
        start_time: str
    ) -> Dict[str, Any]:
        """规划最优路线（评分权重最高）"""
        items = []
        remaining = pois.copy()
        current_pos = (origin_lat, origin_lon)
        current_time = self._parse_time(start_time)
        
        while remaining:
            def score(p):
                distance = haversine_distance(
                    current_pos[0], current_pos[1], p["latitude"], p["longitude"]
                )
                return -distance * 0.3 + p["rating"] * 2
            
            best = max(remaining, key=score)
            
            distance = haversine_distance(
                current_pos[0], current_pos[1],
                best["latitude"], best["longitude"]
            )
            
            travel_time = estimate_travel_time(distance, "walk")
            stay_time = best.get("duration_min", 60)
            
            arrival_time = current_time + timedelta(minutes=travel_time)
            leave_time = arrival_time + timedelta(minutes=stay_time)
            
            items.append({
                "poi_id": best["id"],
                "name": best["name"],
                "category": best["category"],
                "rating": best["rating"],
                "avg_price": best["avg_price"],
                "latitude": best["latitude"],
                "longitude": best["longitude"],
                "distance_from_prev": round(distance, 2),
                "travel_time_min": travel_time,
                "stay_time_min": stay_time,
                "arrival_time": self._format_time(arrival_time),
                "leave_time": self._format_time(leave_time),
                "address": best["address"],
                "tags": best["tags"][:3]
            })
            
            remaining.remove(best)
            current_pos = (best["latitude"], best["longitude"])
            current_time = leave_time
        
        total_distance = sum(item["distance_from_prev"] for item in items)
        total_time = sum(item["travel_time_min"] + item["stay_time_min"] for item in items)
        total_price = sum(item["avg_price"] for item in items)
        
        return {
            "name": "最优路线",
            "style": "optimal",
            "segments": items,
            "total_distance_km": round(total_distance, 2),
            "total_time_min": total_time,
            "total_price": total_price,
            "summary": f"平衡评分与距离，总路程{round(total_distance, 1)}km，耗时{total_time//60}小时{total_time%60}分钟"
        }
    
    def _plan_route_cheapest(
        self,
        pois: List[Dict],
        origin_lat: float,
        origin_lon: float,
        start_time: str
    ) -> Dict[str, Any]:
        """规划最省路线（价格最低）"""
        items = []
        remaining = sorted(pois, key=lambda p: p["avg_price"])
        current_pos = (origin_lat, origin_lon)
        current_time = self._parse_time(start_time)
        
        for poi in remaining:
            distance = haversine_distance(
                current_pos[0], current_pos[1],
                poi["latitude"], poi["longitude"]
            )
            
            travel_time = estimate_travel_time(distance, "walk")
            stay_time = poi.get("duration_min", 60)
            
            arrival_time = current_time + timedelta(minutes=travel_time)
            leave_time = arrival_time + timedelta(minutes=stay_time)
            
            items.append({
                "poi_id": poi["id"],
                "name": poi["name"],
                "category": poi["category"],
                "rating": poi["rating"],
                "avg_price": poi["avg_price"],
                "latitude": poi["latitude"],
                "longitude": poi["longitude"],
                "distance_from_prev": round(distance, 2),
                "travel_time_min": travel_time,
                "stay_time_min": stay_time,
                "arrival_time": self._format_time(arrival_time),
                "leave_time": self._format_time(leave_time),
                "address": poi["address"],
                "tags": poi["tags"][:3]
            })
            
            current_pos = (poi["latitude"], poi["longitude"])
            current_time = leave_time
        
        total_distance = sum(item["distance_from_prev"] for item in items)
        total_time = sum(item["travel_time_min"] + item["stay_time_min"] for item in items)
        total_price = sum(item["avg_price"] for item in items)
        
        return {
            "name": "最省路线",
            "style": "cheapest",
            "segments": items,
            "total_distance_km": round(total_distance, 2),
            "total_time_min": total_time,
            "total_price": total_price,
            "summary": f"最低消费，人均¥{total_price}，总路程{round(total_distance, 1)}km"
        }

    def _find_nearby_rest_point(self, item: Dict) -> Optional[Dict]:
        """查找附近的休憩点"""
        for rp in self.rest_points:
            if rp.get("nearby_poi") == item.get("poi_id"):
                return rp
        
        return None
    
    def _build_result(
        self,
        items: List[Dict],
        start_lat: float,
        start_lon: float,
        mode: str
    ) -> Dict[str, Any]:
        """构建最终结果"""
        total_distance = 0.0
        total_time = 0
        total_cost = 0
        
        prev_pos = (start_lat, start_lon)
        
        for item in items:
            if item.get("type") == "rest":
                continue
            
            total_distance += item.get("distance_from_prev", 0)
            total_time += item.get("travel_time_min", 0) + item.get("stay_time_min", 0)
            total_cost += item.get("avg_price", 0)
        
        return {
            "total_time_min": total_time,
            "total_distance_km": round(total_distance, 2),
            "total_cost": total_cost,
            "item_count": len([i for i in items if i.get("type") != "rest"]),
            "mode": mode,
            "items": items,
            "summary": self._generate_summary(items, total_time, total_cost)
        }
    
    def _generate_summary(
        self, 
        items: List[Dict], 
        total_time: int, 
        total_cost: int
    ) -> str:
        """生成摘要文本"""
        poi_items = [i for i in items if i.get("type") != "rest"]
        rest_items = [i for i in items if i.get("type") == "rest"]
        
        hours = total_time // 60
        minutes = total_time % 60
        
        summary = f"为您规划了{len(poi_items)}个地点"
        
        if rest_items:
            summary += f"，含{len(rest_items)}个休憩点"
        
        summary += f"，预计耗时{hours}小时{minutes}分钟"
        summary += f"，人均消费约{total_cost}元"
        
        return summary
    
    def _parse_time(self, time_str: str) -> datetime:
        """解析时间字符串"""
        h, m = map(int, time_str.split(":"))
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return today + timedelta(hours=h, minutes=m)
    
    def _format_time(self, dt: datetime) -> str:
        """格式化时间"""
        return dt.strftime("%H:%M")


_agent = None

def get_itinerary_agent() -> ItineraryAgent:
    """获取ItineraryAgent单例"""
    global _agent
    if _agent is None:
        _agent = ItineraryAgent()
    return _agent
