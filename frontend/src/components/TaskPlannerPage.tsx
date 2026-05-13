import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Task {
  task: string;
  categories: string[];
}

export function TaskPlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState<"walk" | "bike" | "drive">("walk");
  const [timeBudget, setTimeBudget] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8002/route/tasks")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTasks(data.tasks);
        }
      });
    
    fetch("http://localhost:8002/route/locations")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLocations(data.locations);
        }
      });
  }, []);

  const toggleTask = (task: string) => {
    setSelectedTasks(prev =>
      prev.includes(task)
        ? prev.filter(t => t !== task)
        : [...prev, task]
    );
  };

  const handlePlan = async () => {
    if (selectedTasks.length === 0) {
      alert("请至少选择一个任务");
      return;
    }
    if (!location) {
      alert("请选择所在位置");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        tasks: selectedTasks.join(","),
        location,
        mode,
        time_budget: timeBudget.toString()
      });
      
      const res = await fetch(`http://localhost:8002/route/task?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setResult(data);
      } else {
        alert(data.error || "规划失败");
      }
    } catch (err) {
      console.error(err);
      alert("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/50 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-slate-700 flex items-center gap-2">
            <span className="text-xl">📋</span> 目的任务规划
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            告诉我你想做什么，帮你安排最佳地点组合
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 mb-2">
            选择要做的任务
          </label>
          <div className="grid grid-cols-2 gap-2">
            {tasks.map(t => (
              <button
                key={t.task}
                onClick={() => toggleTask(t.task)}
                className={`p-2.5 rounded-xl text-left transition-all ${
                  selectedTasks.includes(t.task)
                    ? "bg-slate-800 text-white shadow-lg"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <div className="font-medium text-sm">{t.task}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">所在位置</label>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white/50"
            >
              <option value="">选择位置...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              时间预算 {timeBudget}小时
            </label>
            <input
              type="range"
              min="1"
              max="8"
              value={timeBudget}
              onChange={e => setTimeBudget(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 mb-2">出行方式</label>
          <div className="flex gap-2">
            {[
              { id: "walk", label: "步行", icon: "🚶" },
              { id: "bike", label: "骑行", icon: "🚴" },
              { id: "drive", label: "驾车", icon: "🚗" }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as any)}
                className={`flex-1 py-2.5 rounded-xl font-medium transition-all text-sm ${
                  mode === m.id
                    ? "bg-slate-800 text-white shadow-lg"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handlePlan}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 text-sm"
        >
          {loading ? "规划中..." : "开始规划"}
        </button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/50 p-6"
        >
          <h3 className="text-base font-medium text-slate-700 mb-4">
            规划结果
          </h3>

          {result.best_plan ? (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-xl border border-blue-100/30">
                <div className="text-xs font-medium text-blue-600 mb-3 flex items-center gap-1">
                  <span>⭐</span> 推荐方案
                </div>
                <div className="space-y-2">
                  {result.best_plan.places.map((place: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-medium text-xs">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-700 text-sm">{place.name}</div>
                        <div className="text-xs text-slate-400">
                          {place.category} · ⭐{place.rating}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-blue-100/50 flex justify-between text-xs text-slate-500">
                  <span>⏱️ {result.best_plan.total_time_min}分钟</span>
                  <span>📍 {result.best_plan.total_distance_km}km</span>
                </div>
              </div>

              {result.combinations.length > 1 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 mb-2">其他方案</h4>
                  <div className="space-y-1.5">
                    {result.combinations.slice(1, 3).map((combo: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600">
                        {combo.places.map((p: any) => p.name).join(" → ")} · {combo.total_time_min}分钟
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-amber-50/50 rounded-xl text-amber-600 text-sm">
              未找到合适方案，建议增加时间或减少任务
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
