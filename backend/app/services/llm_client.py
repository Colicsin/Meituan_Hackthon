"""
LLM客户端封装 - 统一LLM调用接口，支持切换不同提供商

功能：
1. 统一的chat接口（同步/异步）
2. JSON输出模式
3. 流式输出
4. 重试机制
5. Mock模式
"""
import httpx
import asyncio
import json
from typing import AsyncGenerator, List, Dict, Any, Optional
from abc import ABC, abstractmethod
from app.config import settings


class LLMClient(ABC):
    """LLM客户端抽象基类"""
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.7,
    ) -> str:
        """
        异步对话接口
        
        Args:
            messages: 消息列表 [{"role": "user", "content": "..."}]
            system_prompt: 系统提示词
            json_mode: 是否返回JSON格式
            temperature: 温度参数
        
        Returns:
            模型回复内容
        """
        pass
    
    @abstractmethod
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        流式对话接口
        
        Args:
            messages: 消息列表
            system_prompt: 系统提示词
            temperature: 温度参数
        
        Yields:
            逐步返回的文本片段
        """
        pass
    
    def chat_sync(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.7,
    ) -> str:
        """
        同步对话接口（包装异步方法）
        """
        return asyncio.run(self.chat(messages, system_prompt, json_mode, temperature))


class MockLLMClient(LLMClient):
    """
    Mock客户端 - 用于测试和演示
    
    当USE_LLM_MOCK=true时使用，返回预设响应
    """
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.7,
    ) -> str:
        """返回Mock响应"""
        last_message = messages[-1]["content"] if messages else ""
        
        if json_mode:
            import re
            
            intent = "chat"
            slots = {
                "group_size": None,
                "budget": None,
                "time_budget": None,
                "category_pref": None,
                "emotion": None,
                "location": None
            }
            next_question = None
            
            user_msg_match = re.search(r'用户说："([^"]+)"', last_message)
            if not user_msg_match:
                user_msg_match = re.search(r'用户说："([^"]+)"', last_message)
            user_msg = user_msg_match.group(1) if user_msg_match else last_message
            
            if "你好" in user_msg or "您好" in user_msg:
                intent = "greeting"
                next_question = "你们几个人一起去呢？"
            
            elif "推荐" in user_msg:
                intent = "ask_recommendation"
                if "安静" in user_msg:
                    slots["emotion"] = "安静"
            
            else:
                intent = "provide_info"
                
                group_match = re.search(r'(\d+)\s*个?人', user_msg)
                if group_match:
                    slots["group_size"] = int(group_match.group(1))
                
                time_match = re.search(r'(\d+(?:\.\d+)?)\s*小时', user_msg)
                if time_match:
                    slots["time_budget"] = float(time_match.group(1))
                
                budget_match = re.search(r'(?:人均|每人).*?(\d+)', user_msg)
                if budget_match:
                    slots["budget"] = int(budget_match.group(1))
                
                if "安静" in user_msg or "放松" in user_msg:
                    slots["emotion"] = "安静"
                elif "热闹" in user_msg or "好玩" in user_msg:
                    slots["emotion"] = "热闹"
                
                if slots["group_size"] and slots["time_budget"]:
                    next_question = "有预算要求吗？"
                elif slots["group_size"]:
                    next_question = "打算玩多长时间？"
                elif slots["time_budget"]:
                    next_question = "你们几个人呢？"
                else:
                    next_question = "还有什么要求吗？"
            
            return json.dumps({
                "intent": intent,
                "slots": slots,
                "next_question": next_question
            }, ensure_ascii=False)
        
        return f"[Mock响应] 收到您的消息：{last_message[:50]}..."
    
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Mock流式输出"""
        mock_response = "这是一段模拟的流式输出文本，用于演示流式对话功能。"
        for char in mock_response:
            yield char
            await asyncio.sleep(0.05)


class DeepSeekClient(LLMClient):
    """
    DeepSeek客户端
    
    文档：https://platform.deepseek.com/docs
    """
    
    BASE_URL = "https://api.deepseek.com/v1"
    MAX_RETRIES = 2
    RETRY_DELAY = 1.0
    
    def __init__(self, api_key: Optional[str] = None):
        """
        初始化DeepSeek客户端
        
        Args:
            api_key: API密钥（可选，默认从settings读取）
        """
        self.api_key = api_key or settings.deepseek_api_key
        
        if not self.api_key:
            print("⚠️ DeepSeek API Key未设置，将使用Mock模式")
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.7,
        model: str = "deepseek-chat",
    ) -> str:
        """
        异步对话接口
        
        Args:
            messages: 消息列表
            system_prompt: 系统提示词
            json_mode: 是否返回JSON格式
            temperature: 温度参数
            model: 模型名称
        
        Returns:
            模型回复内容
        
        Raises:
            Exception: 重试次数用尽后抛出异常
        """
        if not self.api_key:
            mock_client = MockLLMClient()
            return await mock_client.chat(messages, system_prompt, json_mode, temperature)
        
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)
        
        payload = {
            "model": model,
            "messages": full_messages,
            "temperature": temperature,
        }
        
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        last_error = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        f"{self.BASE_URL}/chat/completions",
                        json=payload,
                        headers=headers,
                    )
                    
                    if resp.status_code != 200:
                        raise Exception(f"API调用失败: {resp.status_code} - {resp.text}")
                    
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    
                    if json_mode:
                        try:
                            json.loads(content)
                        except json.JSONDecodeError:
                            raise Exception("模型未返回有效JSON")
                    
                    return content
                    
            except Exception as e:
                last_error = e
                if attempt < self.MAX_RETRIES:
                    print(f"⚠️ LLM调用失败，{self.RETRY_DELAY}秒后重试 (尝试 {attempt + 1}/{self.MAX_RETRIES})")
                    await asyncio.sleep(self.RETRY_DELAY)
        
        raise Exception(f"LLM调用失败，已重试{self.MAX_RETRIES}次: {last_error}")
    
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        model: str = "deepseek-chat",
    ) -> AsyncGenerator[str, None]:
        """
        流式对话接口
        
        Args:
            messages: 消息列表
            system_prompt: 系统提示词
            temperature: 温度参数
            model: 模型名称
        
        Yields:
            逐步返回的文本片段
        """
        if not self.api_key:
            mock_client = MockLLMClient()
            async for chunk in mock_client.chat_stream(messages, system_prompt, temperature):
                yield chunk
            return
        
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)
        
        payload = {
            "model": model,
            "messages": full_messages,
            "temperature": temperature,
            "stream": True,
        }
        
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{self.BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            ) as resp:
                if resp.status_code != 200:
                    raise Exception(f"流式调用失败: {resp.status_code}")
                
                async for line in resp.aiter_lines():
                    if not line or line == "data: [DONE]":
                        continue
                    
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue


def get_llm_client() -> LLMClient:
    """
    获取LLM客户端实例
    
    根据配置自动选择真实客户端或Mock客户端
    
    Returns:
        LLMClient实例
    """
    if settings.use_llm_mock:
        print("🎭 使用Mock LLM客户端")
        return MockLLMClient()
    
    if not settings.deepseek_api_key:
        print("⚠️ 未配置DEEPSEEK_API_KEY，使用Mock客户端")
        return MockLLMClient()
    
    print("✅ 使用DeepSeek客户端")
    return DeepSeekClient()


llm = None

def get_llm() -> LLMClient:
    """获取全局LLM客户端单例"""
    global llm
    if llm is None:
        llm = get_llm_client()
    return llm
