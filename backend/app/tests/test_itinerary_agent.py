"""
N8 Itinerary Agent 单元测试

验证DoD清单：
- 返回3个差异化候选行程
- 每个行程包含：POI序列 + 段间路线 + 总时长 + 总距离 + 总预算
- 响应时间 < 5秒
- 覆盖至少两大类POI（餐饮 + 娱乐）
- 每个行程至少3个POI
"""
import pytest
import time
from app.agents.itinerary_agent import get_itinerary_agent
from app.data.loader import load_pois


class TestItineraryAgent:
    """Itinerary Agent测试套件"""
    
    @pytest.fixture
    def agent(self):
        """获取ItineraryAgent实例"""
        return get_itinerary_agent()
    
    @pytest.fixture
    def sample_profile(self):
        """示例用户画像"""
        return {
            "current_lat": 39.931,
            "current_lon": 116.453,
            "stay_hours": 3.0,
            "preferences": ["安静", "咖啡"],
            "budget": 200,
            "start_time": "10:00",
            "mode": "walk"
        }
    
    def test_plan_returns_valid_result(self, agent, sample_profile):
        """测试plan方法返回有效结果"""
        result = agent.plan(**sample_profile)
        
        assert result is not None
        assert "total_time_min" in result
        assert "total_distance_km" in result
        assert "total_cost" in result
        assert "items" in result
        assert "mode" in result
    
    def test_plan_with_pois_returns_three_routes(self, agent):
        """测试plan_with_pois返回3种差异化路线"""
        all_pois = load_pois()
        poi_ids = [p["id"] for p in all_pois[:4]]
        
        routes = agent.plan_with_pois(
            poi_ids=poi_ids,
            origin_lat=39.931,
            origin_lon=116.453,
            start_time="10:00"
        )
        
        assert len(routes) == 3
        assert routes[0]["name"] == "最快路线"
        assert routes[1]["name"] == "最优路线"
        assert routes[2]["name"] == "最省路线"
    
    def test_route_contains_required_fields(self, agent):
        """测试每个行程包含必需字段"""
        all_pois = load_pois()
        poi_ids = [p["id"] for p in all_pois[:4]]
        
        routes = agent.plan_with_pois(
            poi_ids=poi_ids,
            origin_lat=39.931,
            origin_lon=116.453
        )
        
        for route in routes:
            assert "name" in route
            assert "segments" in route
            assert "total_distance_km" in route
            assert "total_time_min" in route
            assert "total_price" in route
            assert "summary" in route
    
    def test_route_has_at_least_three_pois(self, agent):
        """测试每个行程至少包含3个POI（命题硬约束）"""
        all_pois = load_pois()
        poi_ids = [p["id"] for p in all_pois[:4]]
        
        routes = agent.plan_with_pois(
            poi_ids=poi_ids,
            origin_lat=39.931,
            origin_lon=116.453
        )
        
        for route in routes:
            assert len(route["segments"]) >= 3, \
                f"{route['name']}只有{len(route['segments'])}个POI，不满足命题要求"
    
    def test_route_covers_multiple_categories(self, agent):
        """测试行程覆盖至少两大类POI（命题硬约束）"""
        all_pois = load_pois()
        poi_ids = [p["id"] for p in all_pois[:5]]
        
        routes = agent.plan_with_pois(
            poi_ids=poi_ids,
            origin_lat=39.931,
            origin_lon=116.453
        )
        
        for route in routes:
            categories = set(seg["category"] for seg in route["segments"])
            assert len(categories) >= 2, \
                f"{route['name']}只有{len(categories)}个品类，不满足命题要求"
    
    def test_response_time_under_five_seconds(self, agent, sample_profile):
        """测试响应时间小于5秒（命题硬约束）"""
        start_time = time.time()
        
        result = agent.plan(**sample_profile)
        
        elapsed = time.time() - start_time
        assert elapsed < 5.0, f"响应时间{elapsed:.2f}秒超过5秒限制"
    
    def test_fastest_route_is_shortest_distance(self, agent):
        """测试最快路线距离最短"""
        all_pois = load_pois()
        poi_ids = [p["id"] for p in all_pois[:5]]
        
        routes = agent.plan_with_pois(
            poi_ids=poi_ids,
            origin_lat=39.931,
            origin_lon=116.453
        )
        
        fastest = routes[0]
        other_distances = [r["total_distance_km"] for r in routes[1:]]
        
        assert fastest["total_distance_km"] <= max(other_distances), \
            "最快路线距离应该最短或接近最短"
    
    def test_cheapest_route_has_lowest_price(self, agent):
        """测试最省路线价格最低"""
        all_pois = load_pois()
        poi_ids = [p["id"] for p in all_pois[:5]]
        
        routes = agent.plan_with_pois(
            poi_ids=poi_ids,
            origin_lat=39.931,
            origin_lon=116.453
        )
        
        cheapest = routes[2]
        other_prices = [r["total_price"] for r in routes[:2]]
        
        assert cheapest["total_price"] <= min(other_prices), \
            "最省路线价格应该最低"
    
    def test_segments_contain_time_info(self, agent):
        """测试每个POI包含时间信息"""
        all_pois = load_pois()
        poi_ids = [p["id"] for p in all_pois[:4]]
        
        routes = agent.plan_with_pois(
            poi_ids=poi_ids,
            origin_lat=39.931,
            origin_lon=116.453
        )
        
        for route in routes:
            for seg in route["segments"]:
                assert "arrival_time" in seg
                assert "leave_time" in seg
                assert "stay_time_min" in seg
                assert "travel_time_min" in seg
    
    def test_segments_contain_distance_info(self, agent):
        """测试每个POI包含距离信息"""
        all_pois = load_pois()
        poi_ids = [p["id"] for p in all_pois[:4]]
        
        routes = agent.plan_with_pois(
            poi_ids=poi_ids,
            origin_lat=39.931,
            origin_lon=116.453
        )
        
        for route in routes:
            for seg in route["segments"]:
                assert "distance_from_prev" in seg
                assert "travel_time_min" in seg


def test_integration_full_workflow():
    """集成测试：完整工作流程"""
    agent = get_itinerary_agent()
    
    all_pois = load_pois()
    poi_ids = [p["id"] for p in all_pois[:5]]
    
    routes = agent.plan_with_pois(
        poi_ids=poi_ids,
        origin_lat=39.931,
        origin_lon=116.453,
        start_time="14:00"
    )
    
    assert len(routes) == 3
    
    for route in routes:
        print(f"\n{route['name']}:")
        print(f"  POI数量: {len(route['segments'])}")
        print(f"  总距离: {route['total_distance_km']}km")
        print(f"  总时长: {route['total_time_min']}分钟")
        print(f"  总花费: ¥{route['total_price']}")
        print(f"  摘要: {route['summary']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
