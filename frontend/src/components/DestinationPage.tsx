import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapView } from "./MapView";

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
    fetch("http://localhost:8002/route/locations")
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
        `http://localhost:8002/route/destination?from_loc=${fromLoc}&to_loc=${toLoc}&mode=${mode}`
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
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🗺️</span> 目的地规划
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          从A到B，顺便发现沿途好去处
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">起点</label>
            <select
              value={fromLoc}
              onChange={e => setFromLoc(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
            >
              <option value="">选择起点...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">终点</label>
            <select
              value={toLoc}
              onChange={e => setToLoc(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
            >
              <option value="">选择终点...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              📍 {result.from.name} → {result.to.name}
            </h3>
            <div className="text-sm text-gray-500">
              直线距离 {result.direct_distance_km}km
            </div>
          </div>

          {result.nearby_pois.length > 0 && (
            <div className="mb-4 p-4 bg-green-50 rounded-xl">
              <div className="text-sm font-medium text-green-800 mb-2">
                🎯 沿途发现 {result.nearby_pois.length} 个好去处
              </div>
              <div className="flex gap-2 flex-wrap">
                {result.nearby_pois.map((poi: any) => (
                  <span
                    key={poi.id}
                    className="px-3 py-1 bg-white rounded-lg text-sm text-gray-700 border border-green-200"
                  >
                    {poi.name} · {poi.category}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            {result.routes.map((route: RoutePlan) => (
              <button
                key={route.type}
                onClick={() => setSelectedRoute(route)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedRoute?.type === route.type
                    ? "bg-purple-50 border-2 border-purple-500"
                    : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-800">{route.name}</div>
                    <div className="text-sm text-gray-500">{route.summary}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-600">{route.total_time_min}分钟</div>
                    <div className="text-sm text-gray-500">{route.total_distance_km}km</div>
                  </div>
                </div>
                {route.stop && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-600">
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
