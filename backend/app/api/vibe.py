"""
情绪匹配API接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.agents.vibe_agent import get_vibe_agent

router = APIRouter(prefix="/api/vibe", tags=["情绪匹配"])


class MatchRequest(BaseModel):
    """情绪匹配请求"""
    text: str = Field(..., description="用户输入的情绪文本", min_length=1)
    top_k: int = Field(5, description="返回结果数量", ge=1, le=10)


class EmotionMatchRequest(BaseModel):
    """情绪类型匹配请求"""
    emotion: str = Field(..., description="情绪类型：开心/平静/烦躁/疲惫/浪漫")
    top_k: int = Field(5, description="返回结果数量", ge=1, le=10)


class MatchResult(BaseModel):
    """匹配结果"""
    poi_id: str
    name: str
    category: str
    rating: float
    avg_price: int
    match_score: int = Field(..., description="匹配分数(0-100)")
    tags: List[str]
    address: str


@router.post("/match", response_model=List[MatchResult])
async def match_emotion(request: MatchRequest):
    """
    根据用户输入的情绪文本，推荐匹配的商家
    
    **示例：**
    ```json
    {
      "text": "我想找个安静的地方发呆",
      "top_k": 5
    }
    ```
    
    **返回：**
    匹配分数最高的5个商家
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="请输入情绪文本")
    
    agent = get_vibe_agent()
    results = agent.match(request.text, request.top_k)
    
    return results


@router.get("/match")
async def match_emotion_get(text: str, top_k: int = 5):
    """
    GET方法：根据情绪文本推荐商家
    
    示例: GET /api/vibe/match?text=安静&top_k=5
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="请输入情绪文本")
    
    agent = get_vibe_agent()
    results = agent.match(text, top_k)
    
    return results


@router.post("/match/emotion", response_model=List[MatchResult])
async def match_by_emotion_type(request: EmotionMatchRequest):
    """
    根据情绪类型推荐商家
    
    **支持的情绪类型：**
    - 开心：推荐热闹、有趣的地方
    - 平静：推荐安静、舒适的地方
    - 烦躁：推荐安静、治愈的地方
    - 疲惫：推荐放松、补充能量的地方
    - 浪漫：推荐氛围感、适合约会的地方
    
    **示例：**
    ```json
    {
      "emotion": "烦躁",
      "top_k": 3
    }
    ```
    """
    if not request.emotion.strip():
        raise HTTPException(status_code=400, detail="请输入情绪类型")
    
    agent = get_vibe_agent()
    results = agent.match_by_emotion(request.emotion, request.top_k)
    
    return results


@router.get("/test")
async def test_vibe_agent():
    """
    测试VibeAgent是否正常工作
    
    返回示例匹配结果
    """
    agent = get_vibe_agent()
    
    # 测试几个典型场景
    test_cases = [
        "我想找个安静的地方发呆",
        "想和朋友聚餐热闹一下",
        "需要安静的地方工作",
    ]
    
    results = {}
    for text in test_cases:
        matched = agent.match(text, top_k=2)
        results[text] = [
            {"name": m["name"], "score": m["match_score"]}
            for m in matched
        ]
    
    return {
        "status": "ok",
        "message": "VibeAgent工作正常",
        "test_results": results
    }
