import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapView } from "./components/MapView";
import { MoodDial } from "./components/MoodDial";
import { ChatBox } from "./components/ChatBox";
import { ItineraryCardGroup } from "./components/ItineraryCard";

interface Recommendation {
  poi_id: string;
  name: string;
  category: string;
  rating: number;
  avg_price: number;
  match_score: number;
  tags: string[];
  address: string;
}

interface ItineraryItem {
  poi_id?: string;
  name: string;
  category?: string;
  rating?: number;
  avg_price?: number;
  distance_from_prev?: number;
  travel_time_min?: number;
  stay_time_min?: number;
  arrival_time?: string;
  leave_time?: string;
  address?: string;
  tags?: string[];
  type?: string;
  rest_type?: string;
  description?: string;
  tip?: string;
  latitude?: number;
  longitude?: number;
}

interface MoodVector {
  x: number;
  y: number;
}

interface DialogState {
  group_size: number | null;
  budget: number | null;
  time_budget: number | null;
  category_pref: string | null;
  emotion: string | null;
  location: string | null;
}

function moodVectorToText(v: MoodVector): string {
  const parts: string[] = [];
  
  if (v.x > 0.5) parts.push("热闹", "聚会", "社交");
  else if (v.x > 0) parts.push("热闹");
  else if (v.x < -0.5) parts.push("安静", "独处", "一个人");
  else if (v.x < 0) parts.push("安静");
  
  if (v.y > 0.5) parts.push("高能", "刺激", "好玩");
  else if (v.y > 0) parts.push("活跃");
  else if (v.y < -0.5) parts.push("静谧", "休息", "放松");
  else if (v.y < 0) parts.push("舒适");
  
  if (parts.length === 0) parts.push("舒适", "惬意");
  
  return parts.join(" ");
}

function App() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itinerary, setItinerary] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"mood" | "chat" | "itinerary">("mood");
  const [restPoints, setRestPoints] = useState<any[]>([]);
  const [showRest, setShowRest] = useState(false);
  const [climateSegments, setClimateSegments] = useState<any[]>([]);
  const [showClimate, setShowClimate] = useState(false);
  const [moodValue, setMoodValue] = useState<MoodVector>({ x: 0, y: 0 });
  const [selectedRoute, setSelectedRoute] = useState<any>(null);

  const handleMoodSelect = async (moodText: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8001/api/vibe/match?text=${encodeURIComponent(moodText)}&top_k=5`
      );
      const data = await response.json();
      console.log("API返回:", data);
      setRecommendations(data);
      setSelectedIds([]);
    } catch (err) {
      console.error("API调用失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoodDialChange = (value: MoodVector) => {
    setMoodValue(value);
    const moodText = moodVectorToText(value);
    console.log("情绪向量:", value, "→ 文本:", moodText);
    handleMoodSelect(moodText);
  };

  const handleChatComplete = (state: DialogState) => {
    console.log("对话完成，画像数据:", state);
    if (state.time_budget) {
      handlePlanItinerary("wudaokou");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePlanRoute = async () => {
    if (selectedIds.length < 2) {
      alert("请至少选择2个商家");
      return;
    }
    
    setPlanning(true);
    setRoutes([]);
    
    try {
      const originLat = 39.931;
      const originLng = 116.453;
      
      const response = await fetch("http://localhost:8001/itinerary/plan-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poi_ids: selectedIds,
          origin_lat: originLat,
          origin_lng: originLng,
          start_time: "10:00"
        }),
      });
      
      const data = await response.json();
      console.log("行程规划结果:", data);
      
      if (data.success) {
        setRoutes(data.routes);
      } else {
        alert(data.error || "规划失败，请重试");
      }
    } catch (err) {
      console.error("规划路线失败", err);
      alert("规划失败，请检查网络连接");
    } finally {
      setPlanning(false);
    }
  };

  const handlePlanItinerary = async (location: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8001/itinerary/quick-plan/${location}`
      );
      const data = await response.json();
      if (data.success) {
        setItinerary(data.data);
      }
    } catch (err) {
      console.error("API调用失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const mapPoints = useMemo(() => {
    if (routes.length > 0 && routes[0].segments) {
      return routes[0].segments.map((seg: any) => ({
        lat: seg.latitude,
        lng: seg.longitude,
        name: seg.name,
      }));
    }
    return [];
  }, [routes]);

  const handleNeedRest = async () => {
    if (mapPoints.length === 0) {
      alert("请先生成路线");
      return;
    }
    
    setLoading(true);
    try {
      const currentLat = mapPoints[0].lat;
      const currentLng = mapPoints[0].lng;
      
      const response = await fetch(
        `http://localhost:8001/rest/nearby?lat=${currentLat}&lng=${currentLng}&radius=1000`
      );
      const data = await response.json();
      
      if (data.success) {
        setRestPoints(data.nearby);
        setShowRest(true);
      }
    } catch (err) {
      console.error("查询休憩点失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowClimate = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8001/climate/segments");
      const data = await response.json();
      
      if (data.success) {
        setClimateSegments(data.segments);
        setShowClimate(true);
      }
    } catch (err) {
      console.error("查询微气候失败:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          现在就出发
        </h1>
        <p className="text-center text-gray-500 mb-8">
          拖动情绪拨盘或对话，找到最适合你的地方
        </p>

        <div className="flex gap-2 mb-6 justify-center">
          <button
            onClick={() => setActiveTab("mood")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "mood"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            🎭 情绪拨盘
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "chat"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            💬 智能对话
          </button>
          <button
            onClick={() => setActiveTab("itinerary")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "itinerary"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            🗺️ 行程规划
          </button>
        </div>

        {activeTab === "mood" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-6 text-center text-gray-800">
              拖动拨盘选择你的心情
            </h2>
            <div className="flex justify-center">
              <MoodDial onChange={handleMoodDialChange} size={280} />
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                当前情绪向量: x={moodValue.x.toFixed(2)}, y={moodValue.y.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                → "{moodVectorToText(moodValue)}"
              </p>
            </div>
          </div>
        )}

        {routes.length > 0 && (
          <div className="mb-6">
            <ItineraryCardGroup
              routes={routes}
              onSelect={(route) => {
                console.log("选择路线:", route);
                setSelectedRoute(route);
              }}
            />
          </div>
        )}

        {selectedRoute && selectedRoute.segments && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6"
          >
            <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span>🗺️</span>
                {selectedRoute.name} - 路线地图
              </h3>
              <p className="text-sm opacity-90 mt-1">{selectedRoute.summary}</p>
            </div>
            <MapView
              points={selectedRoute.segments.map((seg: any) => ({
                id: seg.poi_id,
                lat: seg.latitude,
                lng: seg.longitude,
                name: seg.name,
                category: seg.category,
                rating: seg.rating,
                avg_price: seg.avg_price,
                arrival_time: seg.arrival_time,
                stay_time_min: seg.stay_time_min,
              }))}
              height="450px"
              showRoute={true}
            />
          </motion.div>
        )}

        {activeTab === "chat" && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6" style={{ height: "500px" }}>
            <ChatBox onComplete={handleChatComplete} />
          </div>
        )}

        {activeTab === "itinerary" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-6 text-center text-gray-800">
              选择起点位置
            </h2>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <button
                onClick={() => handlePlanItinerary("wudaokou")}
                className="p-4 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-semibold hover:shadow-lg transition-all hover:scale-105"
              >
                <div className="text-2xl mb-1">🏫</div>
                五道口
              </button>
              <button
                onClick={() => handlePlanItinerary("sanlitun")}
                className="p-4 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white font-semibold hover:shadow-lg transition-all hover:scale-105"
              >
                <div className="text-2xl mb-1">🍷</div>
                三里屯
              </button>
              <button
                onClick={() => handlePlanItinerary("wangfujing")}
                className="p-4 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white font-semibold hover:shadow-lg transition-all hover:scale-105"
              >
                <div className="text-2xl mb-1">🏬</div>
                王府井
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">正在思考中...</p>
          </div>
        )}

        {!loading && itinerary && activeTab === "itinerary" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {itinerary.summary}
              </h2>
              <div className="flex gap-6 text-sm text-gray-600">
                <span>⏱️ 总时长: {Math.floor(itinerary.total_time_min / 60)}小时{itinerary.total_time_min % 60}分钟</span>
                <span>🚶 距离: {itinerary.total_distance_km}km</span>
                <span>💰 花费: ¥{itinerary.total_cost}</span>
              </div>
            </div>

            <div className="space-y-3">
              {itinerary.items.map((item: ItineraryItem, index: number) => (
                <div
                  key={index}
                  className={`border rounded-xl p-4 ${
                    item.type === "rest"
                      ? "bg-green-50 border-green-200"
                      : "hover:shadow-md transition-all"
                  }`}
                >
                  {item.type === "rest" ? (
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">☕</div>
                      <div>
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="text-sm text-gray-600">{item.tip}</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-purple-600">
                              {index + 1}
                            </span>
                            <span className="text-lg font-semibold text-gray-800">
                              {item.name}
                            </span>
                          </div>
                          <span className="ml-8 text-sm text-gray-500">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-500">★ {item.rating}</div>
                          <div className="text-sm text-gray-600">¥{item.avg_price}/人</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && recommendations.length === 0 && !itinerary && activeTab !== "chat" && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">🎨</div>
            <p>拖动情绪拨盘或开始对话</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
