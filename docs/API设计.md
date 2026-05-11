# API设计文档

## 基础信息

- 基础URL: `http://localhost:8000`
- API文档: `http://localhost:8000/docs` (Swagger UI)
- 数据格式: JSON
- 编码: UTF-8

## 数据模型

### POI (兴趣点)

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| id | string | 是 | POI唯一标识 |
| name | string | 是 | 商家名称 |
| latitude | float | 是 | 纬度 |
| longitude | float | 是 | 经度 |
| category | string | 是 | 类别（餐厅/咖啡厅/书店/公园等） |
| rating | float | 是 | 评分（1-5） |
| avg_price | int | 是 | 人均消费（元） |
| open_hours | string | 是 | 营业时间（如"09:00-22:00"） |
| tags | string[] | 是 | 标签列表 |
| demo_reviews | string[] | 是 | 示例评论列表 |
| address | string | 是 | 详细地址 |
| duration_min | int | 否 | 建议停留时长（分钟），默认60 |

### 后端模型定义

```python
# backend/app/models/poi.py
from pydantic import BaseModel
from typing import List

class POI(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    category: str
    rating: float
    avg_price: int
    open_hours: str
    tags: List[str]
    demo_reviews: List[str]
    address: str
    duration_min: int = 60
```

### 前端类型定义

```typescript
// frontend/src/types/poi.ts
export interface POI {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  avg_price: number;
  open_hours: string;
  tags: string[];
  demo_reviews: string[];
  address: string;
  duration_min: number;
}
```

## API接口

### 1. 健康检查

**GET** `/health`

检查服务是否正常运行。

**响应示例：**
```json
{
  "status": "ok"
}
```

---

### 2. 根路由

**GET** `/`

获取服务基本信息。

**响应示例：**
```json
{
  "ok": true,
  "message": "智行伴侣后端运行正常"
}
```

---

### 3. 获取所有POI

**GET** `/api/pois`

获取所有POI数据列表。

**响应示例：**
```json
[
  {
    "id": "poi_001",
    "name": "虚拟火锅王",
    "latitude": 39.92,
    "longitude": 116.46,
    "category": "火锅",
    "rating": 4.8,
    "avg_price": 120,
    "open_hours": "11:00-22:00",
    "tags": ["网红", "辣", "排队王"],
    "demo_reviews": ["太好吃了，辣得爽！", "排队两小时，但值得"],
    "address": "朝阳区虚拟路123号",
    "duration_min": 90
  },
  ...
]
```

---

### 4. 获取单个POI

**GET** `/api/pois/{poi_id}`

根据ID获取单个POI详情。

**路径参数：**
- `poi_id` (string): POI的唯一标识

**响应示例：**
```json
{
  "id": "poi_001",
  "name": "虚拟火锅王",
  "latitude": 39.92,
  "longitude": 116.46,
  "category": "火锅",
  "rating": 4.8,
  "avg_price": 120,
  "open_hours": "11:00-22:00",
  "tags": ["网红", "辣", "排队王"],
  "demo_reviews": ["太好吃了，辣得爽！", "排队两小时，但值得"],
  "address": "朝阳区虚拟路123号",
  "duration_min": 90
}
```

**错误响应：**
```json
{
  "error": "POI not found"
}
```

## 待实现接口

以下接口将在后续Phase中实现：

### 出发前模块
- `POST /api/chat` - 多轮对话接口
- `POST /api/itinerary/generate` - 行程生成接口
- `GET /api/recommendations` - 个性化推荐接口

### 出行中模块
- `POST /api/route/adjust` - 路线微调接口
- `GET /api/shortcuts` - 捷径发现接口
- `GET /api/rest-points` - 休憩点推荐接口
- `GET /api/climate-segments` - 微气候查询接口

### 出行后模块
- `POST /api/feedback` - 用户反馈接口
- `GET /api/profile` - 用户画像获取接口
- `POST /api/profile/update` - 用户画像更新接口

## CORS配置

已配置允许前端跨域访问：
- 允许源: `http://localhost:5173`
- 允许方法: `*`
- 允许头部: `*`
- 允许凭证: `true`

## 错误处理

所有接口遵循统一的错误格式：

```json
{
  "detail": "错误描述信息"
}
```

常见HTTP状态码：
- 200: 成功
- 404: 资源不存在
- 422: 请求参数验证失败
- 500: 服务器内部错误
