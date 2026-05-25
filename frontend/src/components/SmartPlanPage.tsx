import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../config/api";

interface Step {
  stage: string;
  status: string;
  detail: string;
}

interface Plan {
  items: any[];
  total_time_min: number;
  total_distance_km: number;
  total_cost: number;
}

export function SmartPlanPage() {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showInput, setShowInput] = useState(true);

  const examples = [
    "周末想在北京轻松玩一天",
    "带女朋友约会，想去浪漫的地方",
    "带孩子出去玩，不要太累",
    "和几个朋友聚会，想热闹一点"
  ];

  const handlePlan = async (text: string) => {
    setUserInput(text);
    setLoading(true);
    setSteps([]);
    setPlan(null);
    setShowInput(false);

    try {
      const res = await fetch(`${API_BASE_URL}/smart-plan/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_input: text,
          time_budget_hours: 4
        })
      });

      const data = await res.json();
      
      for (let i = 0; i < data.steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSteps(data.steps.slice(0, i + 1));
      }
      
      setProfile(data.profile);
      setPlan(data.plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {showInput && (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/50 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-slate-700 mb-2">智能规划</h2>
            <p className="text-sm text-slate-400">告诉我你想怎么玩，我来帮你规划</p>
          </div>

          <div className="mb-5">
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="例如：周末想带家人在北京玩一天，不要太累..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white/50 min-h-[100px] resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {examples.map((ex, idx) => (
              <button
                key={idx}
                onClick={() => handlePlan(ex)}
                className="px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePlan(userInput)}
            disabled={loading || !userInput.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 text-sm"
          >
            开始规划
          </button>
        </div>
      )}

      {/* 规划过程展示 */}
      {steps.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/50 p-6">
          <div className="mb-4">
            <h3 className="text-base font-medium text-slate-700">规划过程</h3>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.status === "done" 
                      ? "bg-green-100 text-green-600"
                      : "bg-blue-100 text-blue-600"
                  }`}>
                    {step.status === "done" ? "✓" : "●"}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-medium text-slate-700 text-sm">{step.stage}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{step.detail}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-slate-400 text-sm"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span>正在处理...</span>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* 用户画像 */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg">
              {profile.type === "solo" && "🧑"}
              {profile.type === "couple" && "💑"}
              {profile.type === "family" && "👨‍👩‍👧"}
              {profile.type === "friends" && "👥"}
            </div>
            <div>
              <div className="font-medium text-slate-700">{profile.name}</div>
              <div className="text-xs text-slate-500">{profile.description}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 行程结果 */}
      {plan && plan.items && plan.items.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/50 p-6">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-base font-medium text-slate-700">推荐行程</h3>
            <div className="flex gap-3 text-xs text-slate-400">
              <span>⏱️ {plan.total_time_min}分钟</span>
              <span>📍 {plan.total_distance_km}km</span>
              <span>💰 ¥{plan.total_cost}</span>
            </div>
          </div>

          <div className="space-y-3">
            {plan.items.filter((item: any) => item.type !== "rest").slice(0, 5).map((item: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-700 text-sm">{item.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{item.category}</span>
                    <span>⭐{item.rating}</span>
                    <span>¥{item.avg_price}/人</span>
                    {item.queue_time_min !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        item.queue_time_min > 30 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                      }`}>
                        排队{item.queue_time_min}分钟
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {item.arrival_time}到达 · 停留{item.stay_time_min}分钟
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center">
              💡 觉得不满意？可以说"太远了"、"不想排队"来调整
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
