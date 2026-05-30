"""
智能多轮对话 - 槽位驱动 / 路线生成 / 多轮调整

主链路（与产品文档一致）：
  对话历史 → LLM抽取槽位 → 槽位齐 → 调用 itinerary_agent → 生成结构化路线 + 方案匹配度
  用户提调整 → LLM识别 adjustment_action → 局部替换/筛选 POI → 更新方案匹配度
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from app.services.llm_client import get_llm
from app.agents.itinerary_agent import get_itinerary_agent
from app.data.loader import load_pois
import json
import random

router = APIRouter(prefix="/smart-chat", tags=["智能对话"])


# ============================================================
# 配置：地点/情绪/场景映射
# ============================================================

LOCATION_COORDS: Dict[str, tuple] = {
    "三里屯": (39.931, 116.453),
    "五道口": (39.99, 116.34),
    "王府井": (39.914, 116.412),
    "朝阳公园": (39.935, 116.478),
    "中关村": (39.98, 116.31),
    "西单": (39.91, 116.37),
    "国贸": (39.91, 116.46),
}

EMOTION_PROFILE: Dict[str, Dict] = {
    "静谧": {"preferences": ["安静", "静谧", "平和"], "avoid": ["热闹", "聚会"], "intensity": "低"},
    "热闹": {"preferences": ["热闹", "氛围", "聚会"], "avoid": ["安静", "独处"], "intensity": "中高"},
    "独处": {"preferences": ["独处", "适合一个人", "安静"], "avoid": ["聚会", "热闹"], "intensity": "低"},
    "高能": {"preferences": ["好玩", "刺激", "互动"], "avoid": ["静谧", "安静"], "intensity": "高"},
}

SCENE_PROFILE: Dict[str, Dict] = {
    "solo": {"name": "独自出行", "preferences": ["独处", "适合一个人"], "avoid": ["聚会"]},
    "couple": {"name": "情侣约会", "preferences": ["浪漫", "氛围", "约会"], "avoid": ["嘈杂"]},
    "friends": {"name": "朋友聚会", "preferences": ["热闹", "聚会"], "avoid": ["独处"]},
    "family": {"name": "家庭出游", "preferences": ["亲子", "儿童友好"], "avoid": ["酒吧"]},
    "outoftowner": {"name": "外地朋友", "preferences": ["本地特色", "网红"], "avoid": []},
    "business": {"name": "商务接待", "preferences": ["安静", "高端"], "avoid": ["嘈杂"]},
}

REQUIRED_SLOTS = ["location", "time_budget_hours", "scene", "emotion"]
SLOT_ORDER = ["scene", "emotion", "location", "time_budget_hours"]


# ============================================================
# LLM Prompt
# ============================================================

EXTRACT_PROMPT_TEMPLATE = """你是「智行伴侣」的需求理解模块，任务：从用户的对话中提取出行规划槽位。

【槽位定义】
- location: 出发/目的地点。仅识别这7个北京地标（其他统一为 null）：三里屯、五道口、王府井、朝阳公园、中关村、西单、国贸
- time_budget_hours: 时长（数字，单位小时）。"半天"=4，"一整天"=8，"一上午/下午/晚上"=4，"两小时"=2
- scene: 必须是这6种之一，否则 null：
  * solo（一个人/独自/我自己）
  * couple（情侣/约会/对象/男女朋友/两个人）
  * friends（朋友/同事/聚会/几个人）
  * family（家庭/带娃/带孩子/爸妈）
  * outoftowner（外地朋友来玩/北京旅游）
  * business（商务/接待客户）
- emotion: 必须是这4种之一，否则 null：静谧、热闹、独处、高能。"想安静"→静谧，"想放松"→静谧，"想找点刺激"→高能，"想热闹热闹"→热闹
- budget: 人均预算（整数，元）。无明确数字填 null
- preferences: 正向偏好关键词数组，如 ["拍照","本地特色","brunch","咖啡"]
- negative_constraints: 负向约束数组，如 ["不要排队","不要太贵","不要太赶"]

【意图判断（intent 字段）】
- greeting: 仅打招呼（你好/在吗）
- collecting: 用户表达了部分需求，但4个必填槽位（location/time_budget_hours/scene/emotion）至少缺1个
- ready_to_plan: 4个必填槽位都齐了
- adjusting: 用户在已有路线基础上要求调整，例如"第二站换一家"、"换个不排队的"、"换贵点的"、"重新规划"
- chat: 闲聊/无关问题

【输出要求】
返回纯 JSON，不要 markdown 代码块。结构：
{{
  "intent": "...",
  "slots": {{
    "location": null 或 字符串,
    "time_budget_hours": null 或 数字,
    "scene": null 或 上述枚举,
    "emotion": null 或 上述枚举,
    "budget": null 或 整数,
    "preferences": [],
    "negative_constraints": []
  }},
  "reply": "给用户的中文回复，要求：1)简短确认听到的需求(一句话) 2)若collecting则自然地追问下一个缺失槽位 3)若ready_to_plan则说'好的，正在为你生成路线'  4)若adjusting则说'明白，正在为你调整'",
  "next_question_target": "scene|emotion|location|time_budget_hours|null（仅collecting时填）",
  "adjustment_action": null 或 {{
    "type": "replace_poi|add_constraint|regenerate",
    "index": 1开始的位次，整体调整填null,
    "requirement": "用户原话的核心要求"
  }}
}}

【追问优先级（collecting 模式）】
按这个顺序问下一个：scene → emotion → location → time_budget_hours

【已识别的槽位状态（请合并保留，除非用户明确改变）】：
{existing_slots}

【是否已生成路线（影响 adjusting 判断）】：{has_plan}

请基于完整对话历史输出 JSON。"""


REASON_PROMPT_TEMPLATE = """你是路线推荐解释员。根据用户需求，为下面每个 POI 生成一句简短的推荐理由（每句 ≤25 字，要具体说出"为什么这个 POI 适合"，不要套话）。

用户需求：
- 出行场景：{scene_name}
- 情绪：{emotion}
- 时长：{time_budget}小时
- 偏好：{preferences}
- 不要：{negative}

POI 列表（按顺序）：
{pois_text}

返回 JSON：{{"reasons": [{{"step": 1, "reason": "..."}}, ...]}}。只输出 JSON，不要 markdown。"""


# ============================================================
# 数据模型
# ============================================================

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    current_plan: Optional[Dict[str, Any]] = None
    current_slots: Optional[Dict[str, Any]] = None


# ============================================================
# 工具函数
# ============================================================

def _empty_slots() -> Dict:
    return {
        "location": None,
        "time_budget_hours": None,
        "scene": None,
        "emotion": None,
        "budget": None,
        "preferences": [],
        "negative_constraints": [],
    }


def _merge_slots(old: Dict, new: Dict) -> Dict:
    """合并新旧槽位：标量字段非空则覆盖；数组取并集"""
    merged = {**_empty_slots(), **(old or {})}
    if not new:
        return merged
    for key in ["location", "time_budget_hours", "scene", "emotion", "budget"]:
        v = new.get(key)
        if v not in (None, "", "null"):
            merged[key] = v
    for key in ["preferences", "negative_constraints"]:
        old_v = list(merged.get(key) or [])
        new_v = list(new.get(key) or [])
        merged[key] = list(dict.fromkeys(old_v + new_v))
    return merged


def _missing_slots(slots: Dict) -> List[str]:
    return [k for k in REQUIRED_SLOTS if not slots.get(k)]


def _quick_replies_for(target: Optional[str]) -> List[str]:
    if target == "scene":
        return ["一个人", "情侣约会", "朋友聚会", "带娃出门"]
    if target == "emotion":
        return ["静谧", "热闹", "独处", "高能"]
    if target == "location":
        return ["三里屯", "五道口", "王府井", "朝阳公园"]
    if target == "time_budget_hours":
        return ["2小时", "半天", "一天"]
    return []


def _estimate_queue(item: Dict) -> int:
    """根据 poi_id + 到达小时数估计排队"""
    seed = abs(hash(item.get("poi_id", ""))) % 10000
    rng = random.Random(seed)
    arr = item.get("arrival_time", "12:00")
    try:
        h = int(arr.split(":")[0])
    except Exception:
        h = 12
    base = rng.randint(0, 25)
    if 11 <= h <= 13 or 17 <= h <= 19:
        base += rng.randint(15, 30)
    return base


# ============================================================
# 主接口
# ============================================================

@router.post("/chat")
async def smart_chat(request: ChatRequest):
    llm = get_llm()
    existing_slots = _merge_slots({}, request.current_slots)

    extract_system = EXTRACT_PROMPT_TEMPLATE.format(
        existing_slots=json.dumps(existing_slots, ensure_ascii=False),
        has_plan="true" if request.current_plan else "false",
    )

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        raw = await llm.chat(messages, extract_system, json_mode=True, temperature=0.3)
        parsed = json.loads(raw)
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "reply": "抱歉，我处理消息时遇到问题，能换种说法吗？",
            "slots": existing_slots,
            "missing": _missing_slots(existing_slots),
            "intent": "chat",
            "quick_replies": _quick_replies_for(_missing_slots(existing_slots)[0] if _missing_slots(existing_slots) else None),
            "plan": request.current_plan,
        }

    intent = parsed.get("intent", "chat")
    slots = _merge_slots(existing_slots, parsed.get("slots") or {})
    reply = parsed.get("reply", "")
    next_q_target = parsed.get("next_question_target")
    adjustment = parsed.get("adjustment_action")

    missing = _missing_slots(slots)

    plan = request.current_plan
    quick_replies = _quick_replies_for(next_q_target or (missing[0] if missing else None))

    # 如果 LLM 判 ready_to_plan 但其实有缺口，回退到 collecting
    if intent == "ready_to_plan" and missing:
        intent = "collecting"
        next_q_target = missing[0]
        quick_replies = _quick_replies_for(next_q_target)
        if not reply:
            reply = f"差一点信息我就能开始规划了，{_slot_question(next_q_target)}"

    # 反向兜底：4个必填槽位都齐了，但 LLM 还在 collecting/chat（追问预算之类的可选项），
    # 强制升级到 ready_to_plan 直接出路线
    if not missing and intent in ("collecting", "chat") and not request.current_plan:
        intent = "ready_to_plan"

    if intent == "ready_to_plan":
        plan = await _build_plan(slots, llm)
        reply = plan["intro_text"]
        quick_replies = ["换更高评分", "避开排队", "降低预算", "少走路", "重新规划"]

    elif intent == "adjusting" and request.current_plan and adjustment:
        plan = await _adjust_plan(request.current_plan, slots, adjustment, llm)
        if plan.get("adjust_reason"):
            reply = plan["adjust_reason"]
        quick_replies = ["再调整一次", "换更高评分", "避开排队", "重新规划"]

    return {
        "success": True,
        "intent": intent,
        "reply": reply,
        "slots": slots,
        "missing": missing,
        "next_question_target": next_q_target,
        "quick_replies": quick_replies,
        "plan": plan,
    }


def _slot_question(target: str) -> str:
    return {
        "scene": "你们是一个人、情侣、朋友还是带娃呢？",
        "emotion": "想要静谧、热闹、独处还是高能的氛围？",
        "location": "打算在哪个区域？三里屯、五道口、王府井都可以。",
        "time_budget_hours": "打算玩多久？2小时、半天还是一天？",
    }.get(target, "再补充点细节吧～")


# ============================================================
# 路线生成
# ============================================================

async def _build_plan(slots: Dict, llm) -> Dict:
    location = slots["location"]
    coords = LOCATION_COORDS.get(location) or LOCATION_COORDS["三里屯"]

    emotion = slots.get("emotion") or "静谧"
    scene = slots.get("scene") or "solo"

    emotion_p = EMOTION_PROFILE.get(emotion, EMOTION_PROFILE["静谧"])
    scene_p = SCENE_PROFILE.get(scene, SCENE_PROFILE["solo"])

    preferences = list(dict.fromkeys(
        (slots.get("preferences") or []) + emotion_p["preferences"] + scene_p["preferences"]
    ))

    itinerary_agent = get_itinerary_agent()
    raw_plan = itinerary_agent.plan(
        current_lat=coords[0],
        current_lon=coords[1],
        stay_hours=float(slots["time_budget_hours"]),
        preferences=preferences,
        budget=slots.get("budget"),
        start_time="10:00",
        mode="walk",
    )

    items = [it for it in raw_plan.get("items", []) if it.get("type") != "rest"]

    pois = load_pois()
    poi_map = {p["id"]: p for p in pois}

    enriched = []
    for idx, item in enumerate(items):
        full = poi_map.get(item.get("poi_id"), {})
        enriched.append({
            "step": idx + 1,
            "poi_id": item.get("poi_id"),
            "name": item["name"],
            "category": item["category"],
            "rating": item["rating"],
            "avg_price": item["avg_price"],
            "tags": list(item.get("tags") or [])[:4],
            "address": item["address"],
            "latitude": full.get("latitude"),
            "longitude": full.get("longitude"),
            "arrival_time": item.get("arrival_time"),
            "leave_time": item.get("leave_time"),
            "stay_time_min": item.get("stay_time_min", 60),
            "travel_time_min": item.get("travel_time_min", 0),
            "distance_from_prev": item.get("distance_from_prev", 0),
            "queue_time_min": _estimate_queue(item),
            "ai_reason": "",
        })

    if enriched:
        reasons = await _generate_reasons(enriched, slots, llm)
        for it, r in zip(enriched, reasons):
            it["ai_reason"] = r

    match = _compute_match_score(enriched, raw_plan, slots)

    title = f"{location}{scene_p['name']}·{emotion}路线"
    h = raw_plan["total_time_min"] // 60
    m = raw_plan["total_time_min"] % 60
    intro = (
        f"为你生成「{title}」：共{len(enriched)}站，"
        f"预计{h}小时{m}分钟，人均约{raw_plan['total_cost']}元，"
        f"方案匹配度 {match['total']}%。"
    )

    return {
        "title": title,
        "total_time_min": raw_plan["total_time_min"],
        "total_distance_km": raw_plan["total_distance_km"],
        "total_cost": raw_plan["total_cost"],
        "items": enriched,
        "match_score": match,
        "intro_text": intro,
        "adjust_reason": None,
    }


async def _generate_reasons(items: List[Dict], slots: Dict, llm) -> List[str]:
    pois_text = "\n".join([
        f"{i+1}. {it['name']}（{it['category']}，⭐{it['rating']}，人均{it['avg_price']}元，标签：{','.join(it.get('tags') or []) or '无'}）"
        for i, it in enumerate(items)
    ])
    scene_name = SCENE_PROFILE.get(slots.get("scene") or "solo", {}).get("name", "出行")
    prompt = REASON_PROMPT_TEMPLATE.format(
        scene_name=scene_name,
        emotion=slots.get("emotion") or "舒适",
        time_budget=slots.get("time_budget_hours") or 4,
        preferences=",".join(slots.get("preferences") or []) or "无特殊",
        negative=",".join(slots.get("negative_constraints") or []) or "无",
        pois_text=pois_text,
    )
    try:
        raw = await llm.chat(
            [{"role": "user", "content": "请生成推荐理由"}],
            prompt, json_mode=True, temperature=0.5,
        )
        data = json.loads(raw)
        if isinstance(data, dict):
            arr = data.get("reasons") or data.get("items") or []
        else:
            arr = data
        reasons = []
        for entry in arr:
            if isinstance(entry, dict):
                reasons.append(entry.get("reason", ""))
            else:
                reasons.append(str(entry))
        while len(reasons) < len(items):
            reasons.append("")
        return reasons[:len(items)]
    except Exception:
        # 模板兜底
        emo = slots.get("emotion") or "舒适"
        return [
            f"匹配「{emo}」氛围，{it.get('category','')}评分{it.get('rating', '')}"
            for it in items
        ]


def _compute_match_score(items: List[Dict], raw_plan: Dict, slots: Dict) -> Dict:
    """5 维度方案匹配度，与文档 5.2 节对齐"""
    if not items:
        return {"total": 0, "dimensions": {}, "explanation": "暂未匹配到合适地点"}

    # 1) 时间匹配
    target_min = (slots.get("time_budget_hours") or 4) * 60
    actual_min = raw_plan.get("total_time_min", 0)
    time_match = max(0, 100 - abs(actual_min - target_min) / max(target_min, 1) * 100)

    # 2) 预算匹配
    budget = slots.get("budget")
    cost = raw_plan.get("total_cost", 0)
    if budget:
        budget_match = 100 if cost <= budget else max(50, 100 - (cost - budget) / budget * 100)
    else:
        budget_match = 90

    # 3) 动线匹配（距离短得分高）
    total_km = raw_plan.get("total_distance_km", 0)
    avg_km = total_km / max(len(items), 1)
    route_match = max(50, 100 - avg_km * 25)

    # 4) 偏好匹配（POI tag 与 用户preferences+emotion 标签的并集 重合度）
    target_tags = set(slots.get("preferences") or [])
    if slots.get("emotion"):
        target_tags.update(EMOTION_PROFILE.get(slots["emotion"], {}).get("preferences", []))
    if slots.get("scene"):
        target_tags.update(SCENE_PROFILE.get(slots["scene"], {}).get("preferences", []))
    overlaps = []
    for it in items:
        tags = set(it.get("tags") or [])
        if target_tags:
            ratio = len(tags & target_tags) / max(len(target_tags), 1)
            overlaps.append(min(1.0, ratio * 2.5))
        else:
            overlaps.append(0.6)
    pref_match = (sum(overlaps) / len(overlaps)) * 100

    # 5) 数据可信度
    cred = sum(min(it.get("rating", 0) / 5.0, 1.0) for it in items) / len(items) * 100

    total = round(
        time_match * 0.20
        + budget_match * 0.20
        + route_match * 0.20
        + pref_match * 0.25
        + cred * 0.15
    )

    explanation = (
        f"时间 预计{actual_min // 60}小时{actual_min % 60}分钟；"
        f"预算 人均{cost}元；"
        f"动线 {len(items)}站平均间距{round(avg_km, 1)}km；"
        f"偏好 基于「{slots.get('emotion') or '-'}/{SCENE_PROFILE.get(slots.get('scene') or 'solo', {}).get('name','-')}」匹配；"
        f"数据 评分/人均/标签综合判定。"
    )

    return {
        "total": total,
        "dimensions": {
            "time_match": round(time_match),
            "budget_match": round(budget_match),
            "route_match": round(route_match),
            "preference_match": round(pref_match),
            "data_credibility": round(cred),
        },
        "explanation": explanation,
    }


# ============================================================
# 路线调整
# ============================================================

async def _adjust_plan(current_plan: Dict, slots: Dict, adjustment: Dict, llm) -> Dict:
    action = (adjustment or {}).get("type", "regenerate")
    requirement = (adjustment or {}).get("requirement", "") or ""
    index = (adjustment or {}).get("index")

    if action == "regenerate":
        new_plan = await _build_plan(slots, llm)
        new_plan["adjust_reason"] = "已根据最新需求重新规划路线。"
        return new_plan

    items = list(current_plan.get("items", []))
    pois = load_pois()
    excluded_ids = {it.get("poi_id") for it in items}

    adjust_reason = ""

    if action == "replace_poi" and isinstance(index, int) and 1 <= index <= len(items):
        target = items[index - 1]
        target_cat = target.get("category")
        req_lower = requirement.lower()
        candidates = []
        for p in pois:
            if p["id"] in excluded_ids or p["category"] != target_cat:
                continue
            score = p["rating"] * 4
            tags = p.get("tags") or []
            if any(k in req_lower for k in ["安静", "通话", "打电话", "办公"]):
                if any(t in tags for t in ["安静", "静谧", "适合办公", "适合聊天"]):
                    score += 40
            if any(k in req_lower for k in ["便宜", "省钱", "降低"]):
                score += max(0, 100 - p["avg_price"]) / 2
            if any(k in req_lower for k in ["高评分", "好吃", "更好"]):
                score += p["rating"] * 6
            if any(k in req_lower for k in ["拍照", "出片"]):
                if any(t in tags for t in ["拍照", "出片", "氛围", "网红"]):
                    score += 30
            if any(k in req_lower for k in ["排队", "不排队", "少排"]):
                if any(t in tags for t in ["小众", "安静"]):
                    score += 25
            candidates.append((p, score))
        candidates.sort(key=lambda x: x[1], reverse=True)
        if candidates:
            new_poi = candidates[0][0]
            old_name = target.get("name")
            items[index - 1] = {
                **target,
                "poi_id": new_poi["id"],
                "name": new_poi["name"],
                "category": new_poi["category"],
                "rating": new_poi["rating"],
                "avg_price": new_poi["avg_price"],
                "tags": list(new_poi.get("tags") or [])[:4],
                "address": new_poi["address"],
                "latitude": new_poi["latitude"],
                "longitude": new_poi["longitude"],
                "ai_reason": f"替换为「{new_poi['name']}」：{requirement or '更匹配你的需求'}",
                "queue_time_min": _estimate_queue({"poi_id": new_poi["id"], "arrival_time": target.get("arrival_time", "12:00")}),
            }
            adjust_reason = f"已将第{index}站从「{old_name}」换成「{new_poi['name']}」。{requirement}"
        else:
            adjust_reason = f"暂时找不到比第{index}站更合适的同类替换。要我重新规划整条路线吗？"

    elif action == "add_constraint":
        req_lower = requirement.lower()
        before = len(items)

        def _apply(filter_fn, label):
            return [it for it in items if filter_fn(it)], label

        if any(k in req_lower for k in ["排队", "不排队"]):
            items, label = _apply(lambda it: it.get("queue_time_min", 0) < 30, "排队<30分钟")
            adjust_reason = f"移除排队≥30分钟的地点（{before}→{len(items)}站）。"
        elif any(k in req_lower for k in ["便宜", "降低预算", "省钱"]):
            items, label = _apply(lambda it: it.get("avg_price", 0) <= 100, "人均≤100元")
            adjust_reason = f"保留人均≤100元的地点（{before}→{len(items)}站）。"
        elif any(k in req_lower for k in ["少走路", "近一点", "近点"]):
            items, label = _apply(lambda it: it.get("distance_from_prev", 0) <= 1.0, "相邻≤1km")
            adjust_reason = f"保留相邻距离≤1km的地点（{before}→{len(items)}站）。"
        elif any(k in req_lower for k in ["高评分"]):
            items, label = _apply(lambda it: it.get("rating", 0) >= 4.5, "评分≥4.5")
            adjust_reason = f"保留评分≥4.5的地点（{before}→{len(items)}站）。"
        else:
            label = None
            adjust_reason = f"按「{requirement}」筛选后路线已更新。"

        # 太少则触发整条重生，并再次套用约束以避免约束失效
        if len(items) < 2:
            new_plan = await _build_plan(slots, llm)
            after_filter = list(new_plan["items"])
            if label and any(k in req_lower for k in ["排队", "不排队"]):
                after_filter = [it for it in after_filter if it.get("queue_time_min", 0) < 30]
            elif label and any(k in req_lower for k in ["便宜", "降低预算", "省钱"]):
                after_filter = [it for it in after_filter if it.get("avg_price", 0) <= 100]
            elif label and any(k in req_lower for k in ["高评分"]):
                after_filter = [it for it in after_filter if it.get("rating", 0) >= 4.5]
            # 二次过滤后仍不足两站，则放弃硬过滤，返回完整新方案 + 备注
            if len(after_filter) >= 2:
                new_plan["items"] = after_filter
                note = f"已重新规划并尽量满足「{label or requirement}」。"
            else:
                note = f"已重新规划路线；同区域内符合「{label or requirement}」的地点不够 2 个，先按整体最佳方案展示。"
            for i, it in enumerate(new_plan["items"]):
                it["step"] = i + 1
            new_plan["total_cost"] = sum(it.get("avg_price") or 0 for it in new_plan["items"])
            new_plan["total_time_min"] = sum((it.get("travel_time_min") or 0) + (it.get("stay_time_min") or 0) for it in new_plan["items"])
            new_plan["total_distance_km"] = round(sum(it.get("distance_from_prev") or 0 for it in new_plan["items"]), 2)
            new_plan["match_score"] = _compute_match_score(new_plan["items"], {
                "total_time_min": new_plan["total_time_min"],
                "total_cost": new_plan["total_cost"],
                "total_distance_km": new_plan["total_distance_km"],
            }, slots)
            new_plan["adjust_reason"] = f"{adjust_reason} {note}"
            return new_plan

    else:
        adjust_reason = "已收到调整请求。"

    # 重新计算 step / 总计
    for i, it in enumerate(items):
        it["step"] = i + 1

    total_time = sum((it.get("travel_time_min") or 0) + (it.get("stay_time_min") or 0) for it in items)
    total_cost = sum(it.get("avg_price") or 0 for it in items)
    total_dist = sum(it.get("distance_from_prev") or 0 for it in items)

    raw_plan = {
        "total_time_min": total_time,
        "total_cost": total_cost,
        "total_distance_km": round(total_dist, 2),
    }
    match = _compute_match_score(items, raw_plan, slots)

    return {
        **current_plan,
        "items": items,
        "total_time_min": total_time,
        "total_cost": total_cost,
        "total_distance_km": round(total_dist, 2),
        "match_score": match,
        "adjust_reason": adjust_reason,
    }


# ============================================================
# 辅助接口
# ============================================================

@router.get("/suggest")
async def get_suggestions():
    """对话开场建议"""
    return {
        "success": True,
        "suggestions": [
            {"text": "周末情侣约会，三里屯玩半天，预算300内", "type": "plan"},
            {"text": "朋友来北京想吃 brunch，下午要安静地方", "type": "plan"},
            {"text": "一个人想放松，五道口逛逛", "type": "plan"},
            {"text": "带娃出门，朝阳公园附近不想排队", "type": "plan"},
        ],
    }
