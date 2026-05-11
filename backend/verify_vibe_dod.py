"""
N9 Vibe Agent DoD验证脚本

验证所有DoD清单项
"""
import sys
import time
sys.path.insert(0, ".")

from app.agents.vibe_agent import get_vibe_agent
from app.services.embedding import encode, cosine_similarity


def test_dod():
    """验证DoD清单"""
    print("\n" + "="*60)
    print("N9 Vibe Agent DoD验证")
    print("="*60 + "\n")
    
    # 初始化Agent
    print("\n📋 测试1: 启动时为所有POI评论计算embedding并缓存")
    start = time.time()
    agent = get_vibe_agent()
    elapsed = time.time() - start
    
    assert len(agent.poi_embeddings) > 0, "❌ 未预计算POI embedding"
    print(f"   ✅ 预计算了 {len(agent.poi_embeddings)} 个POI的embedding")
    print(f"   ✅ 初始化耗时: {elapsed:.3f}秒")
    
    # 测试embedding服务
    print("\n📋 测试2: sentence-transformers模型加载")
    test_texts = ["我想找个安静的地方", "热闹的聚餐场所"]
    start = time.time()
    embeddings = encode(test_texts)
    elapsed = time.time() - start
    
    assert embeddings is not None, "❌ 模型未加载"
    assert len(embeddings) == len(test_texts), "❌ embedding数量不匹配"
    print(f"   ✅ 模型加载成功")
    print(f"   ✅ 编码耗时: {elapsed:.3f}秒/文本")
    
    # 测试余弦相似度
    print("\n📋 测试3: 余弦相似度计算")
    sim = cosine_similarity(embeddings[0], embeddings[1])
    assert -1 <= sim <= 1, f"❌ 相似度{sim}超出范围[-1, 1]"
    print(f"   ✅ 相似度计算正常: {sim:.4f}")
    
    # 测试match方法
    print("\n📋 测试4: VibeAgent.match()方法")
    user_input = "我想找个安静的地方发呆"
    start = time.time()
    results = agent.match(user_input, top_k=5)
    elapsed = time.time() - start
    
    assert len(results) > 0, "❌ match方法未返回结果"
    print(f"   ✅ 返回 {len(results)} 个匹配结果")
    print(f"   ✅ 响应时间: {elapsed:.3f}秒 < 1秒")
    assert elapsed < 1.0, f"❌ 响应时间{elapsed:.3f}秒超过1秒"
    
    # 验证返回格式
    print("\n📋 测试5: 返回格式验证")
    for result in results:
        assert "poi_id" in result, "❌ 缺少poi_id"
        assert "name" in result, "❌ 缺少name"
        assert "match_score" in result, "❌ 缺少match_score"
        assert "tags" in result, "❌ 缺少tags"
        assert 0 <= result["match_score"] <= 100, f"❌ match_score {result['match_score']} 超出范围"
        print(f"   ✅ {result['name']}: {result['match_score']}%, 标签: {result['tags'][:2]}")
    
    # 测试情绪类型匹配
    print("\n📋 测试6: 情绪类型匹配")
    emotion_results = agent.match_by_emotion("烦躁", top_k=3)
    assert len(emotion_results) > 0, "❌ 情绪匹配未返回结果"
    print(f"   ✅ '烦躁'情绪匹配返回 {len(emotion_results)} 个结果")
    for result in emotion_results:
        print(f"      - {result['name']}: {result['match_score']}%")
    
    # 测试不同情绪输入
    print("\n📋 测试7: 多种情绪输入测试")
    emotions = [
        "我想找个安静的地方发呆",
        "想和朋友聚餐热闹一下",
        "需要安静的地方工作",
        "想找个浪漫的地方约会"
    ]
    
    for emotion in emotions:
        start = time.time()
        results = agent.match(emotion, top_k=3)
        elapsed = time.time() - start
        
        assert elapsed < 1.0, f"❌ '{emotion}'响应时间{elapsed:.3f}秒超限"
        print(f"   ✅ '{emotion[:15]}...': {results[0]['name']} ({results[0]['match_score']}%) [{elapsed:.3f}s]")
    
    # 测试API接口
    print("\n📋 测试8: API接口验证（模拟请求）")
    test_cases = [
        {"text": "安静", "top_k": 3},
        {"text": "热闹 聚餐", "top_k": 5},
    ]
    
    for case in test_cases:
        results = agent.match(case["text"], top_k=case["top_k"])
        assert len(results) == case["top_k"], f"❌ 返回数量不正确"
        print(f"   ✅ '{case['text']}': 返回{len(results)}个结果")
    
    # 测试标签匹配
    print("\n📋 测试9: 标签推荐能力")
    for result in results[:3]:
        poi_tags = result.get("tags", [])
        assert isinstance(poi_tags, list), "❌ tags不是列表"
        print(f"   ✅ {result['name']}: 标签={poi_tags}")
    
    print("\n" + "="*60)
    print("✅ 所有DoD清单项验证通过！")
    print("="*60)
    
    return {
        "pois_cached": len(agent.poi_embeddings),
        "match_time": elapsed,
        "all_passed": True
    }


def test_live_demo():
    """Demo关键能力：现场输入评论，实时输出情绪标签"""
    print("\n" + "="*60)
    print("N9 Demo关键能力演示")
    print("="*60 + "\n")
    
    agent = get_vibe_agent()
    
    demo_inputs = [
        "我今天心情不好，想找个地方一个人静静",
        "周末和朋友聚会，想找个热闹的地方",
        "想找个安静的地方写代码",
        "和女朋友约会，想找个浪漫的餐厅"
    ]
    
    print("现场输入评论 → 实时输出情绪标签\n")
    
    for user_input in demo_inputs:
        print(f"💬 用户输入: \"{user_input}\"")
        
        start = time.time()
        results = agent.match(user_input, top_k=3)
        elapsed = (time.time() - start) * 1000  # 毫秒
        
        print(f"⏱️  响应时间: {elapsed:.1f}ms")
        print(f"🎯 推荐结果:")
        
        for i, result in enumerate(results, 1):
            print(f"   {i}. {result['name']}")
            print(f"      📊 匹配度: {result['match_score']}%")
            print(f"      🏷️  情绪标签: {', '.join(result['tags'][:3])}")
            print(f"      📍 品类: {result['category']}")
            print(f"      ⭐ 评分: {result['rating']}, 💰 ¥{result['avg_price']}/人")
        
        print("─" * 60)


if __name__ == "__main__":
    # 运行DoD验证
    result = test_dod()
    
    print(f"\n📊 测试摘要:")
    print(f"   - 缓存的POI embedding: {result['pois_cached']}个")
    print(f"   - 匹配响应时间: {result['match_time']:.3f}秒")
    print(f"   - 测试结果: {'✅ 通过' if result['all_passed'] else '❌ 失败'}")
    
    # 运行Demo演示
    test_live_demo()
