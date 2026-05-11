"""
数据加载器 - 启动时加载所有Mock数据到内存
"""
import json
from pathlib import Path
from typing import List, Dict, Optional

# 数据目录
DATA_DIR = Path(__file__).parent / "mock"

# 模块级缓存（启动时加载，避免每次请求都读文件）
_pois_cache: List[Dict] = []
_reviews_cache: List[Dict] = []
_rest_points_cache: List[Dict] = []


def load_pois() -> List[Dict]:
    """
    加载所有POI数据
    启动时调用一次，数据缓存在模块级变量中
    """
    global _pois_cache
    
    if not _pois_cache:
        pois_file = DATA_DIR / "pois.json"
        with open(pois_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            _pois_cache = data["pois"]
    
    return _pois_cache


def load_reviews() -> List[Dict]:
    """
    加载所有评论数据
    """
    global _reviews_cache
    
    if not _reviews_cache:
        reviews_file = DATA_DIR / "reviews.json"
        with open(reviews_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            _reviews_cache = data["reviews"]
    
    return _reviews_cache


def load_rest_points() -> List[Dict]:
    """
    加载所有休憩点数据
    """
    global _rest_points_cache
    
    if not _rest_points_cache:
        rest_file = DATA_DIR / "rest_points.json"
        with open(rest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            _rest_points_cache = data["rest_points"]
    
    return _rest_points_cache


def get_poi_by_id(poi_id: str) -> Optional[Dict]:
    """
    根据ID获取单个POI
    """
    pois = load_pois()
    for poi in pois:
        if poi["id"] == poi_id:
            return poi
    return None


def query_pois_by_category(category: str) -> List[Dict]:
    """
    按品类筛选POI
    """
    pois = load_pois()
    return [poi for poi in pois if poi["category"] == category]


def query_pois_by_tag(tag: str) -> List[Dict]:
    """
    按标签筛选POI
    """
    pois = load_pois()
    return [poi for poi in pois if tag in poi["tags"]]


def get_reviews_by_poi_id(poi_id: str) -> List[Dict]:
    """
    获取某个POI的所有评论
    """
    reviews = load_reviews()
    return [r for r in reviews if r["poi_id"] == poi_id]


def get_rest_points_by_type(rest_type: str) -> List[Dict]:
    """
    按类型筛选休憩点
    type: free_seat 或 paid_low
    """
    rest_points = load_rest_points()
    return [rp for rp in rest_points if rp["type"] == rest_type]


def search_pois(keyword: str) -> List[Dict]:
    """
    关键词搜索POI（名称、地址、标签）
    """
    pois = load_pois()
    keyword_lower = keyword.lower()
    
    results = []
    for poi in pois:
        if (keyword_lower in poi["name"].lower() or
            keyword_lower in poi["address"].lower() or
            any(keyword_lower in tag.lower() for tag in poi["tags"])):
            results.append(poi)
    
    return results


# 启动时预加载所有数据
def init_data():
    """
    应用启动时调用，预加载所有数据到内存
    """
    print(f"📍 加载POI数据: {len(load_pois())} 个商家")
    print(f"💬 加载评论数据: {len(load_reviews())} 条评论")
    print(f"🪑 加载休憩点数据: {len(load_rest_points())} 个休憩点")
    print("✅ 数据加载完成")


_climate_cache: List[Dict] = []

def load_climate_segments() -> List[Dict]:
    """
    加载微气候路段数据
    """
    global _climate_cache
    
    if not _climate_cache:
        climate_file = DATA_DIR / "climate_segments.json"
        with open(climate_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            _climate_cache = data["segments"]
    
    return _climate_cache
