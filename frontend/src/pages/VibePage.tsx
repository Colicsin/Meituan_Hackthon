import { useState } from "react";

export function VibePage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTest = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://localhost:8001/vibe/match?text=安静&top_k=3");
      const data = await response.json();
      console.log("API Response:", data);
      if (data.success) {
        setResults(data.results);
      }
    } catch (err) {
      console.error("API Error:", err);
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ marginBottom: "20px" }}>情绪匹配测试</h1>
      
      <button 
        onClick={handleTest}
        style={{ 
          padding: "10px 20px", 
          backgroundColor: "#8B5CF6", 
          color: "white", 
          border: "none", 
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        测试匹配
      </button>

      {loading && <p style={{ marginTop: "20px" }}>加载中...</p>}

      {error && <p style={{ marginTop: "20px", color: "red" }}>错误: {error}</p>}

      {results.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>匹配结果:</h3>
          {results.map((item, index) => (
            <div key={index} style={{ padding: "10px", border: "1px solid #ccc", marginTop: "10px" }}>
              <p><strong>{item.name}</strong></p>
              <p>品类: {item.category}</p>
              <p>评分: {item.rating}</p>
              <p>匹配度: {item.match_score}%</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
