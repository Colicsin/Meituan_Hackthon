"""
工具函数模块
"""
import math
from typing import Tuple

def haversine_distance(
    lat1: float, 
    lon1: float, 
    lat2: float, 
    lon2: float
) -> float:
    """
    计算两个经纬度坐标之间的距离(单位:公里)
    使用Haversine公式
    
    Args:
        lat1, lon1: 第一个点的纬度和经度
        lat2, lon2: 第二个点的纬度和经度
    
    Returns:
        两点之间的距离(公里)
    """
    R = 6371  # 地球半径(公里)
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance


def estimate_travel_time(distance_km: float, mode: str = "walk") -> int:
    """
    根据距离估算出行时间(分钟)
    
    Args:
        distance_km: 距离(公里)
        mode: 出行方式 (walk/bike/drive)
    
    Returns:
        估算时间(分钟)
    """
    speeds = {
        "walk": 5,    # 步行: 5km/h
        "bike": 15,   # 骑行: 15km/h
        "drive": 30   # 驾车: 30km/h (城市道路)
    }
    
    speed = speeds.get(mode, 5)  # 默认步行
    hours = distance_km / speed
    minutes = int(hours * 60)
    
    return max(minutes, 1)  # 至少1分钟


def is_time_in_range(
    check_time: str, 
    start_time: str, 
    end_time: str
) -> bool:
    """
    检查时间是否在范围内
    
    Args:
        check_time: 要检查的时间 "HH:MM"
        start_time: 开始时间 "HH:MM"
        end_time: 结束时间 "HH:MM"
    
    Returns:
        是否在范围内
    """
    def to_minutes(t: str) -> int:
        h, m = map(int, t.split(":"))
        return h * 60 + m
    
    check = to_minutes(check_time)
    start = to_minutes(start_time)
    end = to_minutes(end_time)
    
    return start <= check <= end
