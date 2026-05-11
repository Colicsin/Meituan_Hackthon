"""
启动脚本
"""
import os
import sys

# 确保当前目录在Python路径中
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,  # 使用8001端口
        reload=False,
        log_level="info"
    )
