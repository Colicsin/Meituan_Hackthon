import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { MapView } from "./components/MapView";
import { MoodDial } from "./components/MoodDial";
import { ChatBox } from "./components/ChatBox";
import { ItineraryCardGroup } from "./components/ItineraryCard";
import { LoginPage } from "./components/LoginPage";

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
  const dist = Math.sqrt(v.x * v.x + v.y * v.y);
  const angle = Math.atan2(v.y, v.x);
  const parts: string[] = [];
  
  const direction = Math.round((angle / Math.PI) * 4 + 4) % 8;
  const dirWords = [
    ["安静", "独处"],
    ["舒适", "惬意"],
    ["静谧", "放松"],
    ["温和", "悠闲"],
    ["活跃", "氛围"],
    ["热闹", "聚会"],
    ["高能", "刺激"],
    ["独处", "沉静"]
  ];
  parts.push(...dirWords[direction]);
  
  if (dist > 0.7) parts.push("强烈");
  else if (dist > 0.3) parts.push("温和");
  else parts.push("平淡");
  
  return parts.join(" ");
}

function App() {
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
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

  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = localStorage.getItem("session_id");
      if (!sessionId) {
        setCheckingAuth(false);
        return;
      }
      
      try {
        const res = await fetch("http://localhost:8001/auth/me", {
          credentials: "include",
          headers: {
            "Cookie": `session_id=${sessionId}`
          }
        });
        
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
        } else {
          localStorage.removeItem("session_id");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8001/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
    
    localStorage.removeItem("session_id");
    setCurrentUser(null);
  };

  useEffect(() => {
    if (activeTab !== "mood") {
      setRecommendations([]);
      setRoutes([]);
      setSelectedRoute(null);
      setSelectedIds([]);
      setRestPoints([]);
      setClimateSegments([]);
      setShowRest(false);
      setShowClimate(false);
    }
    if (activeTab !== "itinerary") {
      setItinerary(null);
    }
  }, [activeTab]);

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
      const locMap: Record<string, string> = {
        "五道口": "wudaokou",
        "三里屯": "sanlitun",
        "王府井": "wangfujing"
      };
      const loc = state.location && locMap[state.location] 
        ? locMap[state.location] 
        : "sanlitun";
      handlePlanItinerary(loc);
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-800">
            现在就出发
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-gray-600">欢迎，{currentUser.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
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

        {activeTab === "mood" && routes.length > 0 && (
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

        {activeTab === "mood" && selectedRoute && selectedRoute.segments && (
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
            
            <div className="p-4 bg-white border-t space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const points = selectedRoute.segments;
                    const lat = points[0]?.latitude || 39.931;
                    const lng = points[0]?.longitude || 116.453;
                    setLoading(true);
                    fetch(`http://localhost:8001/rest/nearby?lat=${lat}&lng=${lng}&radius=1000`)
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          setRestPoints(data.nearby);
                          setShowRest(true);
                        }
                      })
                      .catch(err => console.error(err))
                      .finally(() => setLoading(false));
                  }}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  😊 我累了，想休息
                </button>
                <button
                  onClick={() => {
                    setLoading(true);
                    fetch("http://localhost:8001/climate/segments")
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          setClimateSegments(data.segments);
                          setShowClimate(true);
                        }
                      })
                      .catch(err => console.error(err))
                      .finally(() => setLoading(false));
                  }}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  🌳 走阴凉路线
                </button>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-gray-500 mb-2">🧪 模拟事件触发（Demo用）</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      const poiId = selectedRoute?.segments?.[0]?.poi_id || 'poi_001';
                      fetch("http://localhost:8001/live/trigger", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ event_type: "crowd_surge", current_poi_id: poiId })
                      })
                        .then(res => res.json())
                        .then(data => alert(`${data.title}\n\n${data.message}\n\n推荐：${data.alternatives?.map((a: any) => a.name).join(', ')}`))
                        .catch(err => console.error(err));
                    }}
                    className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200 transition-colors"
                  >
                    👥 客流激增
                  </button>
                  <button
                    onClick={() => {
                      fetch("http://localhost:8001/live/trigger", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ event_type: "weather_change" })
                      })
                        .then(res => res.json())
                        .then(data => alert(`${data.title}\n\n${data.message}`))
                        .catch(err => console.error(err));
                    }}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                  >
                    🌧️ 天气转阴
                  </button>
                  <button
                    onClick={() => {
                      const lat = selectedRoute?.segments?.[0]?.latitude || 39.931;
                      const lng = selectedRoute?.segments?.[0]?.longitude || 116.453;
                      fetch("http://localhost:8001/live/trigger", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ event_type: "fatigue_detected", current_lat: lat, current_lng: lng })
                      })
                        .then(res => res.json())
                        .then(data => alert(`${data.title}\n\n${data.message}\n\n推荐：${data.rest_points?.map((r: any) => r.name).join(', ')}`))
                        .catch(err => console.error(err));
                    }}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                  >
                    😊 疲劳检测
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "mood" && showRest && restPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 rounded-2xl p-6 mb-6 border-2 border-green-200"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">🪑 附近休息点 ({restPoints.length})</h3>
              <button onClick={() => setShowRest(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              {restPoints.slice(0, 5).map((point, idx) => (
                <div key={point.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{point.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{point.description}</div>
                      <div className="flex gap-2 mt-2">
                        {point.has_roof && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">有顶棚</span>}
                        {point.has_backrest && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">有靠背</span>}
                        {point.type === "free_seat" && <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">免费</span>}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">{point.distance_m}m</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "mood" && showClimate && climateSegments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 rounded-2xl p-6 mb-6 border-2 border-blue-200"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">🌳 阴凉路段推荐</h3>
              <button onClick={() => setShowClimate(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🌡️</div>
                <div>
                  <div className="font-bold text-gray-800">建议选择阴凉路线</div>
                  <div className="text-sm text-gray-600">体感温度可降低 2-3℃</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {climateSegments.map((seg, idx) => (
                <div key={seg.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">{idx + 1}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{seg.name}</div>
                      <div className="text-sm text-blue-600 mt-1 font-medium">{seg.benefit}</div>
                      <div className="text-sm text-gray-600 mt-1">{seg.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "mood" && !loading && recommendations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">
              为你推荐 {recommendations.length} 个地方
            </h2>
            <div className="space-y-4">
              {recommendations.map((item, index) => (
                <label
                  key={item.poi_id}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedIds.includes(item.poi_id)
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.poi_id)}
                      onChange={() => {
                        setSelectedIds(prev =>
                          prev.includes(item.poi_id)
                            ? prev.filter(i => i !== item.poi_id)
                            : [...prev, item.poi_id]
                        );
                      }}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-purple-600">{index + 1}</span>
                            <span className="text-lg font-semibold text-gray-800">{item.name}</span>
                          </div>
                          <span className="ml-8 text-sm text-gray-500">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <span>★</span>
                          <span className="text-gray-700 font-medium">{item.rating}</span>
                        </div>
                      </div>
                      <div className="ml-8 flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>💰 ¥{item.avg_price}/人</span>
                        <span>📍 {item.address}</span>
                      </div>
                      <div className="ml-8 flex items-center gap-2 mb-3">
                        {item.tags.map((tag) => (
                          <span key={tag} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="ml-8 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                            style={{ width: `${item.match_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-purple-600">{item.match_score}% 匹配</span>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            {selectedIds.length >= 2 && (
              <button
                onClick={() => {
                  if (selectedIds.length < 2) {
                    alert("请至少选择2个商家");
                    return;
                  }
                  setPlanning(true);
                  fetch("http://localhost:8001/itinerary/plan-custom", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      poi_ids: selectedIds,
                      origin_lat: 39.931,
                      origin_lng: 116.453,
                      start_time: "10:00"
                    }),
                  })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        setRoutes(data.routes);
                      } else {
                        alert(data.error || "规划失败");
                      }
                    })
                    .catch(err => {
                      console.error(err);
                      alert("规划失败");
                    })
                    .finally(() => setPlanning(false));
                }}
                disabled={planning}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold mt-6 hover:shadow-lg transition-all disabled:opacity-50"
              >
                {planning ? "规划中..." : `生成路线 (${selectedIds.length} 个地点)`}
              </button>
            )}
          </div>
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
