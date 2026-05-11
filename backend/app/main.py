"""
智行伴侣后端应用
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 创建应用
app = FastAPI(title="智行伴侣 API", version="1.0.0")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入路由（在app创建之后）
from app.api import routes, vibe, itinerary, rest, climate, llm_test, chat, live

# 注册路由
app.include_router(routes.router, prefix="/api", tags=["POI"])
app.include_router(vibe.router, tags=["情绪匹配"])
app.include_router(itinerary.router, tags=["行程规划"])
app.include_router(rest.router, tags=["休憩"])
app.include_router(climate.router, tags=["微气候"])
app.include_router(llm_test.router, tags=["LLM测试"])
app.include_router(chat.router, tags=["对话"])
app.include_router(live.router, tags=["实时事件"])

@app.get("/")
def root():
    """根路由"""
    return {"ok": True, "message": "智行伴侣后端运行正常"}

@app.get("/health")
def health():
    """健康检查"""
    return {"status": "ok"}
