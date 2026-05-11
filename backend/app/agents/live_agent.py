"""
Live Agent - 出行中事件触发Agent

模拟3个预设触发场景：
1. 目的地客流激增 → 推荐替代POI
2. 天气转阴 → 推荐有顶棚的路线
3. 步频减慢 → 推荐小憩点
"""
from typing import Dict, Any, List
from app.data.loader import load_pois, load_rest_points
import random


class LiveAgent:
    """出行中实时事件Agent"""
    
    def __init__(self):
        """初始化Live Agent"""
        print("🔔 初始化 LiveAgent...")
        self.pois = load_pois()
        self.rest_points = load_rest_points()
        print(f"✅ LiveAgent初始化完成，{len(self.pois)}个商家，{len(self.rest_points)}个休憩点")
    
    def handle_crowd_surge(self, current_poi_id: str) -> Dict[str, Any]:
        """
        场景1: 目的地客流激增
        
        Args:
            current_poi_id: 当前目的地ID
        
        Returns:
            推荐替代POI
        """
        current_poi = None
        for poi in self.pois:
            if poi['poi_id'] == current_poi_id:
                current_poi = poi
                break
        
        if not current_poi:
            return {
                'success': False,
                'message': '未找到当前目的地'
            }
        
        category = current_poi.get('category', '')
        
        alternatives = [
            poi for poi in self.pois
            if poi['category'] == category and poi['poi_id'] != current_poi_id
        ]
        
        if not alternatives:
            alternatives = [
                poi for poi in self.pois
                if poi['poi_id'] != current_poi_id
            ]
        
        selected = random.sample(alternatives, min(3, len(alternatives)))
        
        return {
            'success': True,
            'event_type': 'crowd_surge',
            'title': '🔔 客流提醒',
            'message': f'"{current_poi["name"]}"目前客流较大，为您推荐以下替代地点：',
            'alternatives': selected,
            'urgency': 'medium',
            'icon': '👥'
        }
    
    def handle_weather_change(self) -> Dict[str, Any]:
        """
        场景2: 天气转阴
        
        Returns:
            推荐有顶棚的休憩点和室内场所
        """
        indoor_pois = [
            poi for poi in self.pois
            if poi.get('category') in ['咖啡厅', '书店', '购物中心', '电影院', '餐厅']
        ]
        
        roofed_rest = [
            rest for rest in self.rest_points
            if rest.get('has_roof', False)
        ]
        
        selected_indoor = random.sample(indoor_pois, min(3, len(indoor_pois)))
        selected_rest = random.sample(roofed_rest, min(2, len(roofed_rest)))
        
        return {
            'success': True,
            'event_type': 'weather_change',
            'title': '🌧️ 天气提醒',
            'message': '天气转阴，可能下雨。为您推荐有顶棚或室内的地点：',
            'indoor_places': selected_indoor,
            'roofed_rest': selected_rest,
            'urgency': 'high',
            'icon': '☔'
        }
    
    def handle_fatigue_detected(self, current_lat: float, current_lng: float) -> Dict[str, Any]:
        """
        场景3: 步频减慢（疲劳检测）
        
        Args:
            current_lat: 当前纬度
            current_lng: 当前经度
        
        Returns:
            推荐附近小憩点
        """
        for rest in self.rest_points:
            lat_diff = abs(rest['latitude'] - current_lat)
            lng_diff = abs(rest['longitude'] - current_lng)
            distance = ((lat_diff ** 2) + (lng_diff ** 2)) ** 0.5
            rest['distance_deg'] = distance
            rest['distance_m'] = int(distance * 111000)
        
        nearby_rest = sorted(self.rest_points, key=lambda x: x['distance_deg'])[:5]
        
        comfortable_rest = [
            rest for rest in nearby_rest
            if rest.get('has_backrest', False) or rest.get('has_roof', False)
        ]
        
        return {
            'success': True,
            'event_type': 'fatigue_detected',
            'title': '😊 休息提醒',
            'message': '检测到您走得有点累了，附近有舒适的休息点：',
            'rest_points': comfortable_rest[:3] if comfortable_rest else nearby_rest[:3],
            'urgency': 'low',
            'icon': '☕'
        }
    
    def trigger_event(self, event_type: str, **kwargs) -> Dict[str, Any]:
        """
        触发事件
        
        Args:
            event_type: 事件类型
            **kwargs: 事件参数
        
        Returns:
            事件处理结果
        """
        if event_type == 'crowd_surge':
            return self.handle_crowd_surge(
                kwargs.get('current_poi_id', 'poi_001')
            )
        elif event_type == 'weather_change':
            return self.handle_weather_change()
        elif event_type == 'fatigue_detected':
            return self.handle_fatigue_detected(
                kwargs.get('current_lat', 39.931),
                kwargs.get('current_lng', 116.453)
            )
        else:
            return {
                'success': False,
                'message': f'未知事件类型: {event_type}'
            }


_agent = None


def get_live_agent() -> LiveAgent:
    """获取LiveAgent单例"""
    global _agent
    if _agent is None:
        _agent = LiveAgent()
    return _agent
