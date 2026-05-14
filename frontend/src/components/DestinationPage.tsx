import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapView } from "./MapView";
import { API_BASE_URL } from "../config/api";

interface Location {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface RoutePlan {
  name: string;
  type: string;
  total_distance_km: number;
  total_time_min: number;
  summary: string;
  stop?: {
    name: string;
    category: string;
    rating: number;
  };
  segments: any[];
}

export function DestinationPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [mode, setMode] = useState<"walk" | "bike" | "drive">("walk");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<RoutePlan | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/route/locations`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLocations(data.locations);
        }
      });
  }, []);

  const handlePlan = async () => {
    if (!fromLoc || !toLoc) {
      alert("请选择起点和终点");
      return;
    }
    if (fromLoc === toLoc) {
      alert("起点和终点不能相同");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/route/destination?from_loc=${fromLoc}&to_loc=${toLoc}&mode=${mode}`
      );
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setSelectedRoute(data.routes[0]);
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
            <span className="text-xl">🗺️</span> 目的地规划
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            从A到B，发现沿途的惊喜
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">起点</label>
            <select
              value={fromLoc}
              onChange={e => setFromLoc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white/50"
            >
              <option value="">选择起点...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">终点</label>
            <select
              value={toLoc}
              onChange={e => setToLoc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white/50"
            >
              <option value="">选择终点...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-slate-700">
              {result.from.name} → {result.to.name}
            </h3>
            <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
              直线 {result.direct_distance_km}km
            </div>
          </div>

          {result.nearby_pois.length > 0 && (
            <div className="mb-5 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
              <div className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                <span>💡</span> 沿途发现 {result.nearby_pois.length} 个好去处
              </div>
              <div className="flex gap-2 flex-wrap">
                {result.nearby_pois.map((poi: any) => (
                  <span
                    key={poi.id}
                    className="px-2.5 py-1 bg-white rounded-lg text-xs text-slate-600 border border-blue-100/50"
                  >
                    {poi.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 mb-5">
            {result.routes.map((route: RoutePlan) => (
              <button
                key={route.type}
                onClick={() => setSelectedRoute(route)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  selectedRoute?.type === route.type
                    ? "bg-blue-50 border-2 border-blue-300"
                    : "bg-slate-50 border-2 border-transparent hover:border-slate-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-700 text-sm">{route.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{route.summary}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-blue-600 text-sm">{route.total_time_min}分钟</div>
                    <div className="text-xs text-slate-400">{route.total_distance_km}km</div>
                  </div>
                </div>
                {route.stop && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 text-xs text-slate-500">
                    途经：{route.stop.name} ({route.stop.category}) ⭐{route.stop.rating}
                  </div>
                )}
              </button>
            ))}
          </div>

          {selectedRoute && selectedRoute.segments && selectedRoute.segments.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-3">路线详情</h4>
              <div className="space-y-2">
                {selectedRoute.segments.map((seg: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-800">{seg.from}</span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className="text-gray-800">{seg.to}</span>
                    </div>
                    <div className="text-gray-500">
                      {seg.distance_km}km · {seg.time_min}分钟
                      {seg.stay_time_min && ` (停留${seg.stay_time_min}分钟)`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
