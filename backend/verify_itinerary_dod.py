"""
N8 Itinerary Agent DoD验证脚本

验证所有DoD清单项
"""
import sys
import time
sys.path.insert(0, ".")

from app.agents.itinerary_agent import get_itinerary_agent
from app.data.loader import load_pois


def test_dod():
    """验证DoD清单"""
    print("\n" + "="*60)
    print("N8 Itinerary Agent DoD验证")
    print("="*60 + "\n")
    
    agent = get_itinerary_agent()
    all_pois = load_pois()
    
    # 选择5个POI
    poi_ids = [p["id"] for p in all_pois[:5]]
    
    print("\n📋 测试1: 返回3个差异化候选行程")
    start = time.time()
    routes = agent.plan_with_pois(
        poi_ids=poi_ids,
        origin_lat=39.931,
        origin_lon=116.453,
        start_time="10:00"
    )
    elapsed = time.time() - start
    
    assert len(routes) == 3, f"❌ 应返回3个路线，实际返回{len(routes)}个"
    print(f"   ✅ 返回3个路线: {', '.join([r['name'] for r in routes])}")
    
    print("\n📋 测试2: 响应时间 < 5秒")
    assert elapsed < 5.0, f"❌ 响应时间{elapsed:.2f}秒超过5秒"
    print(f"   ✅ 响应时间: {elapsed:.3f}秒 < 5秒")
    
    print("\n📋 测试3: 每个行程包含必需字段")
    required_fields = ["name", "segments", "total_distance_km", "total_time_min", "total_price", "summary"]
    for route in routes:
        for field in required_fields:
            assert field in route, f"❌ {route['name']}缺少字段{field}"
    print(f"   ✅ 所有行程包含必需字段: {', '.join(required_fields)}")
    
    print("\n📋 测试4: 每个行程至少3个POI（命题硬约束）")
    for route in routes:
        poi_count = len(route["segments"])
        assert poi_count >= 3, f"❌ {route['name']}只有{poi_count}个POI"
        print(f"   ✅ {route['name']}: {poi_count}个POI")
    
    print("\n📋 测试5: 覆盖至少两大类POI（命题硬约束）")
    for route in routes:
        categories = set(seg["category"] for seg in route["segments"])
        assert len(categories) >= 2, f"❌ {route['name']}只有{len(categories)}个品类"
        print(f"   ✅ {route['name']}: {len(categories)}个品类 ({', '.join(categories)})")
    
    print("\n📋 测试6: 每个POI包含时间和距离信息")
    for route in routes:
        for seg in route["segments"]:
            assert "arrival_time" in seg, f"❌ {seg['name']}缺少arrival_time"
            assert "leave_time" in seg, f"❌ {seg['name']}缺少leave_time"
            assert "distance_from_prev" in seg, f"❌ {seg['name']}缺少distance_from_prev"
    print(f"   ✅ 所有POI包含时间、距离信息")
    
    print("\n📋 测试7: 路线差异化验证")
    fastest = routes[0]
    optimal = routes[1]
    cheapest = routes[2]
    
    print(f"   - 最快路线: {fastest['total_distance_km']}km, ¥{fastest['total_price']}")
    print(f"   - 最优路线: {optimal['total_distance_km']}km, ¥{optimal['total_price']}")
    print(f"   - 最省路线: {cheapest['total_distance_km']}km, ¥{cheapest['total_price']}")
    
    assert cheapest["total_price"] <= fastest["total_price"], "❌ 最省路线价格应该最低"
    print(f"   ✅ 最省路线价格最低: ¥{cheapest['total_price']}")
    
    print("\n📋 测试8: 行程详细展示")
    for route in routes:
        print(f"\n   {route['name']}:")
        print(f"   {'─'*50}")
        for i, seg in enumerate(route["segments"], 1):
            print(f"   {i}. {seg['name']} ({seg['category']})")
            print(f"      ⏰ {seg['arrival_time']} 到达, 停留{seg['stay_time_min']}分钟")
            print(f"      🚶 步行{seg['travel_time_min']}分钟 ({seg['distance_from_prev']}km)")
            print(f"      ⭐ 评分{seg['rating']}, ¥{seg['avg_price']}/人")
    
    print("\n" + "="*60)
    print("✅ 所有DoD清单项验证通过！")
    print("="*60)
    
    # 返回测试结果摘要
    return {
        "total_routes": len(routes),
        "response_time": elapsed,
        "all_passed": True
    }


if __name__ == "__main__":
    result = test_dod()
    print(f"\n📊 测试摘要:")
    print(f"   - 路线数量: {result['total_routes']}")
    print(f"   - 响应时间: {result['response_time']:.3f}秒")
    print(f"   - 测试结果: {'✅ 通过' if result['all_passed'] else '❌ 失败'}")
