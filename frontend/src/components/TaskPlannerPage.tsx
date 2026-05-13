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
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>📋</span> 目的任务规划
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          要做什么事？帮你安排最佳地点组合
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择要做的任务 <span className="text-gray-400">(可多选)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {tasks.map(t => (
              <button
                key={t.task}
                onClick={() => toggleTask(t.task)}
                className={`p-3 rounded-xl text-left transition-all ${
                  selectedTasks.includes(t.task)
                    ? "bg-purple-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <div className="font-medium">{t.task}</div>
                <div className={`text-xs mt-1 ${selectedTasks.includes(t.task) ? "text-purple-100" : "text-gray-500"}`}>
                  {t.categories.slice(0, 2).join("、")}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">所在位置</label>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
            >
              <option value="">选择位置...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              时间预算 <span className="text-gray-400">{timeBudget}小时</span>
            </label>
            <input
              type="range"
              min="1"
              max="8"
              value={timeBudget}
              onChange={e => setTimeBudget(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">出行方式</label>
          <div className="flex gap-2">
            {[
              { id: "walk", label: "步行", icon: "🚶" },
              { id: "bike", label: "骑行", icon: "🚴" },
              { id: "drive", label: "驾车", icon: "🚗" }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as any)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  mode === m.id
                    ? "bg-purple-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? "规划中..." : "开始规划"}
        </button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            📊 规划结果
          </h3>

          {result.best_plan ? (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                <div className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <span>⭐</span> 推荐方案
                </div>
                <div className="space-y-2">
                  {result.best_plan.places.map((place: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{place.name}</div>
                        <div className="text-sm text-gray-500">
                          {place.category} · ⭐{place.rating} · {place.task}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200 flex justify-between text-sm text-gray-600">
                  <span>⏱️ 总时长 {result.best_plan.total_time_min}分钟</span>
                  <span>📍 总路程 {result.best_plan.total_distance_km}km</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">路线安排</h4>
                <div className="space-y-2">
                  {result.best_plan.route.map((seg: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center text-sm">
                        <div>
                          <span className="font-medium text-gray-800">{seg.from}</span>
                          <span className="text-gray-400 mx-2">→</span>
                          <span className="font-medium text-gray-800">{seg.to}</span>
                        </div>
                        <div className="text-gray-500">
                          {seg.time_min}分钟
                          {seg.stay_min && ` + 停留${seg.stay_min}分钟`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {result.combinations.length > 1 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">其他方案</h4>
                  <div className="space-y-2">
                    {result.combinations.slice(1, 3).map((combo: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex justify-between items-center">
                          <div className="text-gray-700">
                            {combo.places.map((p: any) => p.name).join(" → ")}
                          </div>
                          <div className="text-gray-500">{combo.total_time_min}分钟</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 rounded-xl text-yellow-800">
              <div className="font-medium mb-1">未找到合适方案</div>
              <div className="text-sm">
                时间预算可能不足，建议增加时间或减少任务
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
