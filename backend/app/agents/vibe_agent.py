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
    
    MOOD_KEYWORDS = {"安静", "热闹", "高能", "静谧", "平和", "浪漫", "舒适", "惬意", "活跃", "氛围", "独处", "放松"}
    
    def __init__(self):
        """初始化Agent，预计算所有商家的向量"""
        print("🎭 初始化 VibeAgent...")
        
        self.pois = load_pois()
        self.poi_embeddings: Dict[str, Any] = {}
        
        for poi in self.pois:
            text_parts = []
            
            mood_tags = self._extract_mood_tags(poi)
            text_parts.extend(mood_tags * 3)
            
            if poi.get("demo_reviews"):
                text_parts.extend(poi["demo_reviews"])
            
            if poi.get("category"):
                text_parts.append(poi["category"])
            
            combined_text = " ".join(text_parts)
            
            if combined_text:
                vec = encode([combined_text])[0]
                self.poi_embeddings[poi["id"]] = vec
        
        print(f"✅ VibeAgent初始化完成，已计算{len(self.poi_embeddings)}个商家向量")
    
    def _extract_mood_tags(self, poi: Dict) -> List[str]:
        """提取POI的情绪标签"""
        mood_tags = []
        for tag in poi.get("tags", []):
            if tag in self.MOOD_KEYWORDS:
                mood_tags.append(tag)
        return mood_tags
    
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
        user_vec = encode([user_text])[0]
        
        user_mood_keywords = []
        for word in user_text.split():
            if word in self.MOOD_KEYWORDS:
                user_mood_keywords.append(word)
        
        scores = []
        for poi in self.pois:
            poi_id = poi["id"]
            
            if poi_id not in self.poi_embeddings:
                continue
            
            sim = cosine_similarity(user_vec, self.poi_embeddings[poi_id])
            
            poi_mood_tags = self._extract_mood_tags(poi)
            vibe_overlap = 0
            if user_mood_keywords and poi_mood_tags:
                intersection = len(set(user_mood_keywords) & set(poi_mood_tags))
                vibe_overlap = intersection / max(len(user_mood_keywords), 1)
            
            final_score = sim * 0.7 + vibe_overlap * 0.3
            
            match_score = int((final_score + 1) / 2 * 100)
            
            scores.append({
                "poi": poi,
                "similarity": sim,
                "final_score": final_score,
                "match_score": match_score,
                "vibe_overlap": vibe_overlap
            })
        
        scores.sort(key=lambda x: x["final_score"], reverse=True)
        
        results = []
        categories_seen = set()
        
        for item in scores:
            poi = item["poi"]
            cat = poi["category"]
            
            if cat in categories_seen and len(results) >= top_k:
                continue
            
            results.append({
                "poi_id": poi["id"],
                "name": poi["name"],
                "category": poi["category"],
                "rating": poi["rating"],
                "avg_price": poi["avg_price"],
                "match_score": item["match_score"],
                "tags": poi["tags"][:3],
                "address": poi["address"]
            })
            
            categories_seen.add(cat)
            
            if len(results) >= top_k:
                break
        
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
