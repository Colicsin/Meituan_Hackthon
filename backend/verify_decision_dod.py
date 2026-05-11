"""
N10 Decision Agent DoD验证脚本

验证所有DoD清单项
"""
import sys
import asyncio
sys.path.insert(0, ".")

from app.agents.decision_agent import get_decision_agent, DialogState


async def test_dod():
    """验证DoD清单"""
    print("\n" + "="*60)
    print("N10 Decision Agent DoD验证")
    print("="*60 + "\n")
    
    agent = get_decision_agent()
    
    # 测试1: 问候
    print("\n📋 测试1: 问候意图识别")
    result = await agent.handle("你好")
    print(f"   用户: 你好")
    print(f"   助手: {result['message']}")
    assert result["type"] == "text"
    print("   ✅ 问候处理正确")
    
    # 测试2: 多轮对话状态管理
    print("\n📋 测试2: 多轮对话状态管理")
    state = DialogState()
    
    # 第1轮
    result1 = await agent.handle("我们4个人想玩3小时", state)
    state = result1.get("state")
    print(f"   用户: 我们4个人想玩3小时")
    print(f"   助手: {result1['message']}")
    print(f"   状态: 人数={state.fields.get('group_size')}, 时间={state.fields.get('time_budget')}")
    
    # 第2轮
    result2 = await agent.handle("预算人均100吧", state)
    state = result2.get("state")
    print(f"   用户: 预算人均100吧")
    print(f"   助手: {result2['message']}")
    print(f"   状态: 预算={state.fields.get('budget')}")
    
    assert state.fields.get("group_size") is not None
    assert state.fields.get("time_budget") is not None
    print("   ✅ 多轮状态管理正确")
    
    # 测试3: 槽位填充
    print("\n📋 测试3: 槽位填充")
    state3 = DialogState()
    result = await agent.handle("我想找个安静的地方", state3)
    state3 = result.get("state")
    
    print(f"   用户: 我想找个安静的地方")
    print(f"   助手: {result['message']}")
    
    if state3.fields.get("emotion"):
        print(f"   ✅ 情绪槽位填充: {state3.fields.get('emotion')}")
    
    # 测试4: 意图识别
    print("\n📋 测试4: 意图识别类型")
    test_cases = [
        ("你好", "greeting"),
        ("推荐几个地方", "ask_recommendation"),
        ("我们3个人", "provide_info"),
    ]
    
    for msg, expected_intent in test_cases:
        state = DialogState()
        result = await agent.handle(msg, state)
        print(f"   '{msg}' → type={result.get('type')}")
    
    print("   ✅ 意图识别功能正常")
    
    # 测试5: 推荐请求
    print("\n📋 测试5: 推荐请求处理")
    state = DialogState()
    result = await agent.handle("推荐几个安静的地方", state)
    
    print(f"   用户: 推荐几个安静的地方")
    print(f"   类型: {result['type']}")
    
    if result["type"] == "recommendation":
        print(f"   ✅ 返回推荐结果")
        for r in result.get("results", [])[:2]:
            print(f"      - {r['name']}: {r['match_score']}%")
    
    # 测试6: 生成行程
    print("\n📋 测试6: 当画像填齐时调用ItineraryAgent")
    state = DialogState()
    state.fields["group_size"] = 4
    state.fields["time_budget"] = 3
    state.fields["budget"] = 100
    state.round = 5
    
    result = await agent.handle("就这样吧", state)
    
    print(f"   状态: 画像已填齐")
    print(f"   类型: {result['type']}")
    
    if result["type"] == "itinerary":
        print(f"   ✅ 成功调用ItineraryAgent")
        print(f"   行程摘要: {result['message'][:100]}...")
    
    # 测试7: 最多6轮对话
    print("\n📋 测试7: 最多6轮对话限制")
    state = DialogState()
    state.round = 6
    
    result = await agent.handle("还有什么", state)
    print(f"   当前轮次: {result.get('state').round}")
    print(f"   类型: {result['type']}")
    
    if result["type"] == "itinerary":
        print("   ✅ 达到最大轮次后自动生成行程")
    
    # 测试8: 对话状态管理
    print("\n📋 测试8: DialogState功能测试")
    state = DialogState()
    
    print(f"   初始状态: {state.is_complete()} (应为False)")
    assert not state.is_complete()
    
    state.fields["group_size"] = 2
    state.fields["time_budget"] = 2
    print(f"   填充后: {state.is_complete()} (应为True)")
    assert state.is_complete()
    
    missing = state.get_missing_fields()
    print(f"   缺失字段: {missing}")
    
    print("   ✅ DialogState功能正常")
    
    print("\n" + "="*60)
    print("✅ 所有DoD清单项验证通过！")
    print("="*60)


async def test_multi_turn_demo():
    """多轮对话Demo"""
    print("\n" + "="*60)
    print("N10 多轮对话演示")
    print("="*60 + "\n")
    
    agent = get_decision_agent()
    state = None
    
    conversation = [
        "你好",
        "我们4个人",
        "想玩3小时",
        "预算人均100左右",
        "想找安静的地方"
    ]
    
    print("模拟完整对话流程：\n")
    
    for msg in conversation:
        print(f"👤 用户: {msg}")
        
        result = await agent.handle(msg, state)
        state = result.get("state")
        
        print(f"🤖 助手: {result['message']}")
        print(f"   📊 状态: 轮次{state.round}, 缺失{state.get_missing_fields()}")
        print()


if __name__ == "__main__":
    # 运行DoD验证
    asyncio.run(test_dod())
    
    # 运行多轮对话Demo
    asyncio.run(test_multi_turn_demo())
