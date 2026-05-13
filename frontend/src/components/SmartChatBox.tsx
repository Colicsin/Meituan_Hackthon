import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Suggestion {
  text: string;
  type: string;
}

export function SmartChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("http://localhost:8002/smart-chat/suggest")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSuggestions(data.suggestions);
        }
      });
    
    setMessages([
      { role: "assistant", content: "你好！我是智行伴侣 🌟\n\n我可以帮你：\n• 根据心情推荐去处\n• 规划出行路线\n• 查询附近商家\n\n有什么我可以帮你的吗？" }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8002/smart-chat/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
        
        if (data.recommendations && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
        }
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.response || "抱歉，出了点问题。请稍后再试。" 
        }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "网络错误，请检查连接。" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span>💬</span> 智能对话
        </h3>
        <p className="text-sm opacity-90 mt-1">接入DeepSeek AI，更懂你的需求</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-purple-500 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
            </div>
          </motion.div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {recommendations.length > 0 && (
        <div className="p-3 bg-purple-50 border-t">
          <div className="text-xs font-medium text-purple-700 mb-2">🎯 为你推荐</div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {recommendations.slice(0, 3).map((poi: any) => (
              <div key={poi.poi_id} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg">
                <div>
                  <span className="font-medium text-gray-800">{poi.name}</span>
                  <span className="text-gray-500 ml-2">{poi.category}</span>
                </div>
                <span className="text-purple-600">⭐{poi.rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && messages.length <= 2 && (
        <div className="p-3 bg-gray-50 border-t">
          <div className="text-xs font-medium text-gray-500 mb-2">试试说：</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(s.text)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-purple-50 hover:border-purple-300 transition-all"
              >
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="说点什么..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  );
}
