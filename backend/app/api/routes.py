"""
API路由 - 商家查询接口
"""
from fastapi import APIRouter, Query, HTTPException
from app.models.poi import POI
from app.data import loader
from typing import List, Optional, Dict, Any

router = APIRouter()


@router.get("/pois")
def get_pois(
    category: Optional[str] = Query(None, description="按品类筛选，如：咖啡厅、火锅"),
    tag: Optional[str] = Query(None, description="按标签筛选，如：安静、网红"),
    keyword: Optional[str] = Query(None, description="关键词搜索（名称、地址、标签）"),
    format: str = Query("standard", description="返回格式：standard(列表) 或 paginated(分页)")
) -> Any:
    """
    获取POI列表
    
    **返回格式：**
    - standard: 直接返回列表 `[...]`
    - paginated: 返回分页格式 `{"total": 30, "items": [...]}`
    
    **筛选参数：**
    - category: 按品类筛选（咖啡厅、餐厅、书店、公园等）
    - tag: 按标签筛选（安静、网红、适合工作等）
    - keyword: 关键词搜索（匹配名称、地址、标签）
    """
    # 获取数据
    if keyword:
        pois = loader.search_pois(keyword)
    elif category:
        pois = loader.query_pois_by_category(category)
    elif tag:
        pois = loader.query_pois_by_tag(tag)
    else:
        pois = loader.load_pois()
    
    # 根据format参数返回不同格式
    if format == "paginated":
        return {
            "total": len(pois),
            "items": pois
        }
    else:
        return pois


@router.get("/pois/{poi_id}", response_model=POI)
def get_poi(poi_id: str):
    """
    获取单个POI详情
    
    **示例：**
    - GET /api/pois/poi_001 → 返回"渝信川菜"的详细信息
    """
    poi = loader.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail=f"商家不存在: {poi_id}")
    return poi


@router.get("/pois/{poi_id}/reviews")
def get_poi_reviews(poi_id: str):
    """
    获取某个POI的所有评论
    
    **示例：**
    - GET /api/pois/poi_001/reviews → 返回渝信川菜的所有评论
    """
    # 先检查POI是否存在
    poi = loader.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail=f"商家不存在: {poi_id}")
    
    reviews = loader.get_reviews_by_poi_id(poi_id)
    return {
        "poi_id": poi_id,
        "poi_name": poi["name"],
        "total": len(reviews),
        "reviews": reviews
    }


@router.get("/rest-points")
def get_rest_points(
    rest_type: Optional[str] = Query(None, description="类型筛选：free_seat 或 paid_low"),
    format: str = Query("standard", description="返回格式")
) -> Any:
    """
    获取休憩点列表
    
    **类型说明：**
    - free_seat: 免费座位（公园长椅、广场座椅等）
    - paid_low: 低消场所（咖啡厅、便利店等）
    
    **示例：**
    - GET /api/rest-points → 所有休憩点
    - GET /api/rest-points?rest_type=free_seat → 只返回免费座位
    """
    if rest_type:
        rest_points = loader.get_rest_points_by_type(rest_type)
    else:
        rest_points = loader.load_rest_points()
    
    if format == "paginated":
        return {
            "total": len(rest_points),
            "items": rest_points
        }
    else:
        return rest_points


@router.get("/categories")
def get_categories():
    """
    获取所有品类列表（用于前端筛选器）
    
    **返回示例：**
    ```json
    {
      "categories": ["川菜", "咖啡厅", "书店", ...]
    }
    ```
    """
    pois = loader.load_pois()
    categories = list(set(poi["category"] for poi in pois))
    categories.sort()
    
    # 统计每个品类的数量
    category_stats = {}
    for poi in pois:
        cat = poi["category"]
        category_stats[cat] = category_stats.get(cat, 0) + 1
    
    return {
        "total": len(categories),
        "categories": [
            {"name": cat, "count": category_stats[cat]}
            for cat in categories
        ]
    }


@router.get("/tags")
def get_tags():
    """
    获取所有标签列表（用于前端筛选器）
    
    **返回示例：**
    ```json
    {
      "tags": ["安静", "网红", "适合工作", ...]
    }
    ```
    """
    pois = loader.load_pois()
    all_tags = []
    for poi in pois:
        all_tags.extend(poi["tags"])
    
    unique_tags = list(set(all_tags))
    unique_tags.sort()
    
    # 统计每个标签的数量
    tag_stats = {}
    for tag in all_tags:
        tag_stats[tag] = tag_stats.get(tag, 0) + 1
    
    return {
        "total": len(unique_tags),
        "tags": [
            {"name": tag, "count": tag_stats[tag]}
            for tag in unique_tags
        ]
    }
