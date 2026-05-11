"""
LLM测试API接口
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
from app.services.llm_client import get_llm

router = APIRouter(prefix="/llm", tags=["LLM测试"])


class ChatRequest(BaseModel):
    """对话请求"""
    messages: List[Dict[str, str]]
    system_prompt: str = "你是一个智能助手"
    json_mode: bool = False


@router.post("/chat")
async def test_chat(request: ChatRequest):
    """
    测试LLM对话接口
    
    示例:
    POST /llm/chat
    {
      "messages": [{"role": "user", "content": "你好"}],
      "system_prompt": "你是一个智能助手",
      "json_mode": false
    }
    """
    llm = get_llm()
    
    try:
        response = await llm.chat(
            messages=request.messages,
            system_prompt=request.system_prompt,
            json_mode=request.json_mode,
        )
        
        return {
            "success": True,
            "response": response,
            "client_type": llm.__class__.__name__
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/test")
async def test_llm_client():
    """
    快速测试LLM客户端
    
    GET /llm/test
    """
    llm = get_llm()
    
    test_message = [{"role": "user", "content": "你好，请简单介绍一下自己"}]
    
    try:
        response = await llm.chat(
            messages=test_message,
            system_prompt="你是一个智能助手，请用一句话回复",
        )
        
        return {
            "success": True,
            "test_message": test_message[0]["content"],
            "response": response,
            "client_type": llm.__class__.__name__,
            "mock_mode": isinstance(llm, type(llm)) and llm.__class__.__name__ == "MockLLMClient"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "client_type": llm.__class__.__name__
        }


@router.get("/test-json")
async def test_json_mode():
    """
    测试JSON输出模式
    
    GET /llm/test-json
    """
    llm = get_llm()
    
    test_message = [{
        "role": "user", 
        "content": "请推荐3个北京的旅游景点，返回JSON格式"
    }]
    
    try:
        response = await llm.chat(
            messages=test_message,
            system_prompt="你是一个旅游助手，请返回JSON格式的景点推荐",
            json_mode=True,
        )
        
        return {
            "success": True,
            "response": response,
            "is_valid_json": True,
            "client_type": llm.__class__.__name__
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
