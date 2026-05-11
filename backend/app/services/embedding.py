"""
文本向量化服务 - 使用sentence-transformers
"""
import os
from pathlib import Path
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Union

# 本地模型路径：backend/models/text2vec-base-chinese/
# 位置：embedding.py -> services -> app -> backend，向上 3 层到 backend/
_LOCAL_MODEL_DIR = Path(__file__).resolve().parents[2] / "models" / "text2vec-base-chinese"

_model = None

def get_model():
    """获取模型实例（懒加载，首次调用才加载）"""
    global _model
    if _model is None:
        if _LOCAL_MODEL_DIR.exists() and (_LOCAL_MODEL_DIR / "config.json").exists():
            print(f"📦 从本地加载向量模型: {_LOCAL_MODEL_DIR}")
            _model = SentenceTransformer(str(_LOCAL_MODEL_DIR))
        else:
            print("⚠️ 本地模型不存在，尝试从 HuggingFace 下载（需要网络）...")
            _model = SentenceTransformer('shibing624/text2vec-base-chinese')
        print("✅ 模型加载完成")
    return _model

def encode(texts: Union[str, List[str]]) -> np.ndarray:
    """
    将文本转换成向量
    
    Args:
        texts: 单个文本或文本列表
    
    Returns:
        向量数组，shape为 (n, 768)
    """
    if isinstance(texts, str):
        texts = [texts]
    return get_model().encode(texts, convert_to_numpy=True)

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    计算两个向量的余弦相似度
    
    Args:
        a: 向量a
        b: 向量b
    
    Returns:
        相似度，范围[-1, 1]，值越大越相似
    """
    # 归一化
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(np.dot(a, b) / (norm_a * norm_b))

def batch_similarity(query_vec: np.ndarray, vecs: List[np.ndarray]) -> List[float]:
    """
    批量计算查询向量与多个向量的相似度
    
    Args:
        query_vec: 查询向量
        vecs: 向量列表
    
    Returns:
        相似度列表
    """
    similarities = []
    for vec in vecs:
        sim = cosine_similarity(query_vec, vec)
        similarities.append(sim)
    return similarities
