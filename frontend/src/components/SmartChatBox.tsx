import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../config/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Slots {
  location: string | null;
  time_budget_hours: number | null;
  scene: string | null;
  emotion: string | null;
  budget: number | null;
  preferences: string[];
  negative_constraints: string[];
}

interface PlanItem {
  step: number;
  poi_id: string;
  name: string;
  category: string;
  rating: number;
  avg_price: number;
  tags: string[];
  address: string;
  arrival_time: string;
  leave_time: string;
  stay_time_min: number;
  travel_time_min: number;
  distance_from_prev: number;
  queue_time_min: number;
  ai_reason: string;
}

interface MatchScore {
  total: number;
  dimensions: {
    time_match: number;
    budget_match: number;
    route_match: number;
    preference_match: number;
    data_credibility: number;
  };
  explanation: string;
}

interface Plan {
  title: string;
  total_time_min: number;
  total_distance_km: number;
  total_cost: number;
  items: PlanItem[];
  match_score: MatchScore;
  intro_text: string;
  adjust_reason: string | null;
}

interface ChatResponse {
  success: boolean;
  intent: string;
  reply: string;
  slots: Slots;
  missing: string[];
  next_question_target: string | null;
  quick_replies: string[];
  plan: Plan | null;
}

const SLOT_LABELS: Record<string, string> = {
  scene: "出行场景",
  emotion: "情绪",
  location: "地点",
  time_budget_hours: "时长",
};

const SCENE_NAME: Record<string, string> = {
  solo: "一个人",
  couple: "情侣",
  friends: "朋友",
  family: "带娃",
  outoftowner: "外地朋友",
  business: "商务",
};

function emptySlots(): Slots {
  return {
    location: null,
    time_budget_hours: null,
    scene: null,
    emotion: null,
    budget: null,
    preferences: [],
    negative_constraints: [],
  };
}

export function SmartChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<Slots>(emptySlots());
  const [missing, setMissing] = useState<string[]>([
    "scene",
    "emotion",
    "location",
    "time_budget_hours",
  ]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "你好！我是智行伴侣 ✨ 告诉我你想做什么——我会通过几个问题帮你拼出一条完整的路线。",
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, plan]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMessage = text.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/smart-chat/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          current_plan: plan,
          current_slots: slots,
        }),
      });
      const data: ChatResponse = await res.json();

      if (data.success) {
        setSlots(data.slots);
        setMissing(data.missing || []);
        setQuickReplies(data.quick_replies || []);
        if (data.plan) setPlan(data.plan);
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: data.reply || "..." },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: data.reply || "出了点问题，再说一次？" },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "网络异常，请稍后再试。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "好嘞，重新来过。这次想做什么？",
      },
    ]);
    setSlots(emptySlots());
    setMissing(["scene", "emotion", "location", "time_budget_hours"]);
    setQuickReplies([]);
    setPlan(null);
    setExpandedItem(null);
  };

  const totalSlots = 4;
  const filledSlots = totalSlots - missing.length;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/30 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">✨</div>
            <div>
              <h3 className="font-medium text-sm">智行伴侣 AI</h3>
              <p className="text-xs opacity-80">多轮理解 · 路线生成 · 自由调整</p>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="text-xs px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 transition"
          >
            重开
          </button>
        </div>

        {/* Slot progress */}
        <div className="mt-3">
          <div className="flex justify-between items-center text-[11px] mb-1">
            <span className="opacity-90">需求收集 {filledSlots}/{totalSlots}</span>
            {plan && <span className="opacity-90">方案匹配度 {plan.match_score.total}%</span>}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(["scene", "emotion", "location", "time_budget_hours"] as const).map(key => {
              const filled = !missing.includes(key);
              let value: string = SLOT_LABELS[key];
              if (filled) {
                if (key === "scene") value = SCENE_NAME[slots.scene || ""] || slots.scene || "已填";
                else if (key === "time_budget_hours")
                  value = `${slots.time_budget_hours}h`;
                else value = String(slots[key] || "已填");
              }
              return (
                <div
                  key={key}
                  className={`text-[10.5px] px-1.5 py-1 rounded-md text-center transition-all ${
                    filled
                      ? "bg-white text-purple-600 font-medium"
                      : "bg-white/15 text-white/70"
                  }`}
                >
                  {filled ? "✓ " : ""}{value}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/30 to-white/50">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-slate-800 text-white rounded-br-md"
                  : "bg-white text-slate-700 rounded-bl-md shadow-sm border border-slate-100"
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-3.5 py-2.5 rounded-bl-md shadow-sm border border-slate-100">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Plan card */}
        <AnimatePresence>
          {plan && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4 mt-2"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-purple-500 font-medium">推荐路线</div>
                  <div className="text-base font-semibold text-slate-800 mt-0.5">{plan.title}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
                    {plan.match_score.total}%
                  </div>
                  <div className="text-[10px] text-slate-500">匹配度</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div className="bg-white/70 rounded-lg p-2">
                  <div className="text-slate-500 text-[10px]">总时长</div>
                  <div className="font-medium text-slate-700 mt-0.5">
                    {Math.floor(plan.total_time_min / 60)}h{plan.total_time_min % 60}m
                  </div>
                </div>
                <div className="bg-white/70 rounded-lg p-2">
                  <div className="text-slate-500 text-[10px]">人均</div>
                  <div className="font-medium text-slate-700 mt-0.5">¥{plan.total_cost}</div>
                </div>
                <div className="bg-white/70 rounded-lg p-2">
                  <div className="text-slate-500 text-[10px]">距离</div>
                  <div className="font-medium text-slate-700 mt-0.5">{plan.total_distance_km}km</div>
                </div>
              </div>

              {/* Match score breakdown */}
              <div className="bg-white/60 rounded-lg p-2.5 mb-3 text-[11px]">
                <div className="text-slate-600 leading-relaxed">{plan.match_score.explanation}</div>
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {Object.entries(plan.match_score.dimensions).map(([k, v]) => (
                    <div key={k} className="text-center">
                      <div className="text-[9px] text-slate-500">
                        {{
                          time_match: "时间",
                          budget_match: "预算",
                          route_match: "动线",
                          preference_match: "偏好",
                          data_credibility: "数据",
                        }[k]}
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${
                          v >= 80 ? "text-emerald-600" : v >= 60 ? "text-amber-600" : "text-rose-500"
                        }`}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {plan.adjust_reason && (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2 mb-3">
                  ✨ {plan.adjust_reason}
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-2">
                {plan.items.map((it, idx) => (
                  <div
                    key={`${it.poi_id}-${idx}`}
                    className="bg-white rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setExpandedItem(expandedItem === idx ? null : idx)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                          {it.step}
                        </div>
                        {idx < plan.items.length - 1 && (
                          <div className="w-px flex-1 bg-gradient-to-b from-purple-300 to-pink-300 my-1 min-h-[16px]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <div className="font-medium text-sm text-slate-800 truncate">{it.name}</div>
                          <div className="text-[10px] text-slate-400 whitespace-nowrap">
                            {it.arrival_time}-{it.leave_time}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span>{it.category}</span>
                          <span>⭐{it.rating}</span>
                          <span>¥{it.avg_price}</span>
                          {it.queue_time_min >= 20 && (
                            <span className="text-rose-500">排队~{it.queue_time_min}m</span>
                          )}
                        </div>
                        {it.ai_reason && (
                          <div className="text-[11px] text-purple-700 mt-1.5 bg-purple-50/50 rounded-md px-2 py-1">
                            💡 {it.ai_reason}
                          </div>
                        )}
                        {expandedItem === idx && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5"
                          >
                            <div>📍 {it.address}</div>
                            <div>停留 {it.stay_time_min}分钟 · 步行 {it.travel_time_min}分钟</div>
                            {it.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {it.tags.map((t, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="pt-1.5 flex gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  send(`第${it.step}站换一家更高评分的`);
                                }}
                                className="text-[10px] px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200"
                              >
                                换更高评分
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  send(`第${it.step}站换一家不排队的`);
                                }}
                                className="text-[10px] px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200"
                              >
                                换不排队
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  send(`第${it.step}站换一家便宜点的`);
                                }}
                                className="text-[10px] px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200"
                              >
                                换便宜的
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && !loading && (
        <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 border-t border-slate-100/80 bg-white/50">
          {quickReplies.map((q, idx) => (
            <button
              key={idx}
              onClick={() => send(q)}
              className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-700 hover:bg-purple-100 transition"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-100 flex gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send(input)}
          placeholder={
            plan
              ? "想调整哪一站？说一句给我听～"
              : missing.length > 0
              ? `还差 ${missing.length} 个信息...`
              : "聊点什么..."
          }
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-sm bg-white"
          disabled={loading}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-40 text-sm"
        >
          发送
        </button>
      </div>
    </div>
  );
}
