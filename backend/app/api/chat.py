"""
Chat API - 对话接口（支持流式输出）
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
from app.agents.decision_agent import get_decision_agent, DialogState

router = APIRouter(prefix="/chat", tags=["对话"])


class ChatRequest(BaseModel):
    """对话请求"""
    message: str
    session_id: Optional[str] = None


# 简单的会话管理（生产环境应该用Redis）
_sessions: Dict[str, DialogState] = {}


@router.post("/message")
async def chat_message(request: ChatRequest):
    """
    对话接口（非流式）
    
    示例:
    POST /chat/message
    {
      "message": "我们4个人想玩3小时"
    }
    """
    agent = get_decision_agent()
    
    # 获取或创建会话状态
    session_id = request.session_id or "default"
    state = _sessions.get(session_id)
    
    # 处理消息
    result = await agent.handle(request.message, state)
    
    # 保存状态
    _sessions[session_id] = result.get("state")
    
    return {
        "success": True,
        "type": result.get("type"),
        "message": result.get("message"),
        "session_id": session_id,
        "round": result.get("state").round if result.get("state") else 0,
        "data": result.get("itinerary") or result.get("results")
    }


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    对话接口（流式SSE）
    
    示例:
    POST /chat/stream
    {
      "message": "我们4个人想玩3小时"
    }
    """
    agent = get_decision_agent()
    
    # 获取或创建会话状态
    session_id = request.session_id or "default"
    state = _sessions.get(session_id)
    
    # 处理消息
    result = await agent.handle(request.message, state)
    
    # 保存状态
    _sessions[session_id] = result.get("state")
    
    # 流式生成
    async def generate():
        message = result.get("message", "")
        
        # 模拟打字机效果
        for i in range(0, len(message), 3):
            chunk = message[i:i+3]
            data = json.dumps({"text": chunk}, ensure_ascii=False)
            yield f"data: {data}\n\n"
        
        # 发送结束标记
        final_data = {
            "done": True,
            "type": result.get("type"),
            "session_id": session_id
        }
        yield f"data: {json.dumps(final_data, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


@router.get("/reset")
async def reset_session(session_id: str = "default"):
    """
    重置会话
    
    GET /chat/reset?session_id=xxx
    """
    if session_id in _sessions:
        del _sessions[session_id]
    
    return {
        "success": True,
        "message": "会话已重置"
    }


@router.get("/state")
async def get_session_state(session_id: str = "default"):
    """
    获取会话状态
    
    GET /chat/state?session_id=xxx
    """
    state = _sessions.get(session_id)
    
    if state is None:
        return {
            "success": False,
            "message": "会话不存在"
        }
    
    return {
        "success": True,
        "round": state.round,
        "fields": state.fields,
        "is_complete": state.is_complete(),
        "missing": state.get_missing_fields()
    }
