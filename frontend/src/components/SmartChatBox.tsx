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
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/30 h-full flex flex-col overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">✨</div>
          <div>
            <h3 className="font-medium text-sm">AI助手</h3>
            <p className="text-xs opacity-80">Powered by DeepSeek</p>
          </div>
        </div>
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
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-slate-800 text-white rounded-br-md"
                  : "bg-slate-100 text-slate-700 rounded-bl-md"
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          </motion.div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl px-3.5 py-2.5 rounded-bl-md">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {recommendations.length > 0 && (
        <div className="p-3 bg-blue-50/50 border-t border-blue-100/50">
          <div className="text-xs font-medium text-blue-600 mb-2">为你推荐</div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto">
            {recommendations.slice(0, 3).map((poi: any) => (
              <div key={poi.poi_id} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg">
                <div>
                  <span className="font-medium text-slate-700">{poi.name}</span>
                  <span className="text-slate-400 ml-1.5">{poi.category}</span>
                </div>
                <span className="text-blue-500">⭐{poi.rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && messages.length <= 2 && (
        <div className="p-3 bg-slate-50/50 border-t border-slate-100">
          <div className="text-xs text-slate-400 mb-2">试试说：</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(s.text)}
                className="px-2.5 py-1.5 bg-white border border-slate-200/80 rounded-full text-xs text-slate-600 hover:bg-blue-50 hover:border-blue-200 transition-all"
              >
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-slate-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="说点什么..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white/50"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-all disabled:opacity-40 text-sm"
        >
          发送
        </button>
      </div>
    </div>
  );
}
