"""
情绪匹配Agent - 根据用户情绪文本推荐匹配的商家

核心逻辑：
1. 用户输入情绪文本（如"我想找个安静的地方发呆"）
2. 将用户文本转换成向量
3. 计算与所有商家评论向量的相似度
4. 返回最匹配的商家列表
"""
from app.data.loader import load_pois
from app.services.embedding import encode, cosine_similarity
from typing import List, Dict, Any

class VibeAgent:
    """情绪匹配智能体"""
    
    def __init__(self):
        """初始化Agent，预计算所有商家的向量"""
        print("🎭 初始化 VibeAgent...")
        
        # 加载所有商家数据
        self.pois = load_pois()
        
        # 预计算所有商家的向量（使用评论文本）
        self.poi_embeddings: Dict[str, Any] = {}
        
        for poi in self.pois:
            # 将商家的所有信息组合成文本
            text_parts = []
            
            # 评论
            if poi.get("demo_reviews"):
                text_parts.extend(poi["demo_reviews"])
            
            # 标签
            if poi.get("tags"):
                text_parts.extend(poi["tags"])
            
            # 品类
            if poi.get("category"):
                text_parts.append(poi["category"])
            
            # 组合文本
            combined_text = " ".join(text_parts)
            
            if combined_text:
                # 转成向量并缓存
                vec = encode([combined_text])[0]
                self.poi_embeddings[poi["id"]] = vec
        
        print(f"✅ VibeAgent初始化完成，已计算{len(self.poi_embeddings)}个商家向量")
    
    def match(self, user_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        根据用户输入的情绪文本，返回最匹配的商家
        
        Args:
            user_text: 用户输入的情绪文本
            top_k: 返回前K个匹配结果
        
        Returns:
            匹配结果列表，每个包含：
            - poi_id: 商家ID
            - name: 商家名称
            - match_score: 匹配分数（0-100）
            - category: 品类
            - tags: 标签
            - rating: 评分
        """
        # 将用户文本转换成向量
        user_vec = encode([user_text])[0]
        
        # 计算与所有商家的相似度
        scores = []
        for poi in self.pois:
            poi_id = poi["id"]
            
            if poi_id not in self.poi_embeddings:
                continue
            
            # 计算相似度
            sim = cosine_similarity(user_vec, self.poi_embeddings[poi_id])
            
            # 将相似度转换成0-100的匹配分数
            # 余弦相似度范围[-1, 1]，转换到[0, 100]
            match_score = int((sim + 1) / 2 * 100)
            
            scores.append({
                "poi": poi,
                "similarity": sim,
                "match_score": match_score
            })
        
        # 按相似度排序
        scores.sort(key=lambda x: x["similarity"], reverse=True)
        
        # 取前K个
        results = []
        for item in scores[:top_k]:
            poi = item["poi"]
            results.append({
                "poi_id": poi["id"],
                "name": poi["name"],
                "category": poi["category"],
                "rating": poi["rating"],
                "avg_price": poi["avg_price"],
                "match_score": item["match_score"],
                "tags": poi["tags"][:3],  # 最多显示3个标签
                "address": poi["address"]
            })
        
        return results
    
    def match_by_emotion(
        self, 
        emotion: str, 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        根据情绪类型推荐商家
        
        Args:
            emotion: 情绪类型，如：开心、平静、烦躁、疲惫、浪漫
            top_k: 返回前K个
        
        Returns:
            匹配结果列表
        """
        # 情绪到文本的映射
        emotion_map = {
            "开心": "热闹 有趣 开心 欢快 氛围好 适合聚餐",
            "平静": "安静 舒适 放松 适合工作 安静舒服",
            "烦躁": "安静 治愈 放松 一个人 发呆 安静",
            "疲惫": "舒适 放松 安静 休息 咖啡 补充能量",
            "浪漫": "浪漫 约会 氛围 适合拍照 漂亮",
        }
        
        # 获取对应文本
        text = emotion_map.get(emotion, emotion)
        
        return self.match(text, top_k)


# 全局单例
_agent = None

def get_vibe_agent() -> VibeAgent:
    """获取VibeAgent单例"""
    global _agent
    if _agent is None:
        _agent = VibeAgent()
    return _agent
