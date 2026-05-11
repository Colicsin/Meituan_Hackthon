from pydantic import BaseModel
from typing import List

class POI(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    category: str  # 餐厅/咖啡厅/书店/公园
    rating: float   # 1-5
    avg_price: int
    open_hours: str  # "09:00-22:00"
    tags: List[str]
    demo_reviews: List[str]
    address: str
    duration_min: int = 60
