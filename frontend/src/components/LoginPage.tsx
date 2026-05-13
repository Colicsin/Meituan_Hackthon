import { useState } from "react";
import { motion } from "framer-motion";

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
      const response = await fetch(`http://localhost:8001${endpoint}`, {
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
        alert("注册成功！请登录");
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🌟</div>
          <h1 className="text-3xl font-bold text-gray-800">现在就出发</h1>
          <p className="text-gray-500 mt-2">智行伴侣，懂你的出行助手</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              mode === "login"
                ? "bg-purple-500 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            登录
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              mode === "register"
                ? "bg-purple-500 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            注册
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? "处理中..." : mode === "login" ? "登 录" : "注 册"}
          </button>
        </form>

        {mode === "login" && (
          <p className="text-center text-gray-500 text-sm mt-6">
            还没有账号？
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className="text-purple-600 hover:underline ml-1 font-medium"
            >
              立即注册
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
