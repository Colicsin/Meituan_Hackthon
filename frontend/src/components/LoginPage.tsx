import { useState } from "react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../config/api";

interface LoginPageProps {
  onLoginSuccess: (user: { id: number; username: string }) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "操作失败");
        return;
      }

      if (mode === "register") {
        setMode("login");
        setError("");
        setUsername("");
        setPassword("");
        return;
      }

      if (mode === "login" && data.user) {
        localStorage.setItem("session_id", data.session_id);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-tr from-amber-100/40 to-pink-100/40 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo区域 */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-xl shadow-blue-500/20"
          >
            ✨
          </motion.div>
          <h1 className="text-2xl font-semibold text-slate-800">智行伴侣</h1>
          <p className="text-slate-400 text-sm mt-1">你的出行好朋友</p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-xl shadow-slate-200/30 p-6">
          {/* 切换标签 */}
          <div className="flex gap-1 p-1 bg-slate-100/50 rounded-xl mb-6">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-600"
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "register"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-600"
              }`}
            >
              注册
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-500 px-4 py-2.5 rounded-xl mb-4 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white/50"
                required
                minLength={2}
                maxLength={50}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white/50"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  处理中
                </span>
              ) : mode === "login" ? "登录" : "注册"}
            </button>
          </form>

          {/* 提示 */}
          {mode === "login" && (
            <p className="text-center text-slate-400 text-xs mt-4">
              还没有账号？<button onClick={() => { setMode("register"); setError(""); }} className="text-blue-500 hover:underline">立即注册</button>
            </p>
          )}
          
          {mode === "register" && (
            <p className="text-center text-slate-400 text-xs mt-4">
              已有账号？<button onClick={() => { setMode("login"); setError(""); }} className="text-blue-500 hover:underline">立即登录</button>
            </p>
          )}
        </div>

        {/* 底部装饰文字 */}
        <p className="text-center text-slate-300 text-xs mt-8">
          发现城市的美好角落
        </p>
      </motion.div>
    </div>
  );
}
