import { useState } from "react";

function App() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleClick = async (emotion: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8001/vibe/match?text=${encodeURIComponent(emotion)}&top_k=5`);
      const data = await response.json();
      if (data.success) {
        setResults(data.results);
      }
    } catch (error) {
      console.error("API调用失败:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          智行伴侣 - 情绪匹配
        </h1>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={() => handleClick("热闹 开心 欢快")}
              className="p-6 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-semibold hover:shadow-lg transition-shadow"
            >
              🎉 热闹开心
            </button>
            <button
              onClick={() => handleClick("浪漫 约会 氛围")}
              className="p-6 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 text-white font-semibold hover:shadow-lg transition-shadow"
            >
              💕 浪漫约会
            </button>
            <button
              onClick={() => handleClick("安静 放松 舒适")}
              className="p-6 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-semibold hover:shadow-lg transition-shadow"
            >
              🍃 安静放松
            </button>
            <button
              onClick={() => handleClick("治愈 一个人 发呆")}
              className="p-6 rounded-xl bg-gradient-to-br from-green-400 to-teal-500 text-white font-semibold hover:shadow-lg transition-shadow"
            >
              🌿 治愈独处
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">正在匹配...</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">
              为你推荐 {results.length} 个商家
            </h2>

            <div className="space-y-4">
              {results.map((item, index) => (
                <div key={item.poi_id} className="border rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-lg font-medium text-gray-800">
                        {index + 1}. {item.name}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-yellow-500">★ {item.rating}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <span>💰 ¥{item.avg_price}/人</span>
                    <span>📍 {item.address}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {item.tags && item.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${item.match_score}%` }}
                      ></div>
                    </div>
                    <span className="ml-4 text-sm font-medium text-purple-600">
                      匹配度 {item.match_score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            点击上方情绪按钮开始匹配
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
