import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface DialogState {
  group_size: number | null;
  budget: number | null;
  time_budget: number | null;
  category_pref: string | null;
  emotion: string | null;
  location: string | null;
}

interface ChatBoxProps {
  onComplete?: (state: DialogState) => void;
}

const FIELD_LABELS: Record<string, string> = {
  group_size: '人数',
  budget: '预算',
  time_budget: '时间',
  category_pref: '品类',
  emotion: '情绪',
  location: '位置',
};

function getFilledFieldsCount(state: DialogState | null): number {
  if (!state) return 0;
  return Object.values(state).filter(v => v !== null && v !== undefined).length;
}

export function ChatBox({ onComplete }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [round, setRound] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleResize = () => {
      if (inputRef.current === document.activeElement) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    const assistantMessage: Message = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('http://localhost:8001/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.text) {
                fullContent += data.text;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }

              if (data.done) {
                setRound(prev => prev + 1);
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      const stateResponse = await fetch(
        `http://localhost:8001/chat/state?session_id=${sessionId}`
      );
      const stateData = await stateResponse.json();
      
      if (stateData.success) {
        setDialogState(stateData.fields);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: '抱歉，网络出现问题，请重试。', isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStartPlan = () => {
    if (dialogState) {
      onComplete?.(dialogState);
    }
  };

  const filledCount = getFilledFieldsCount(dialogState);
  const showPlanButton = round >= 3 && filledCount >= 2;

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-white"
    >
      <div className="bg-white shadow-md px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          🗣️ 智能对话助手
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500 w-12">画像进度</div>
          <div className="flex-1 flex gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i < filledCount
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'bg-gray-200'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
              />
            ))}
          </div>
          <div className="text-xs text-gray-600 font-medium w-16 text-right">
            {filledCount}/6
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <span
              key={key}
              className={`px-2 py-1 rounded-full text-xs transition-all ${
                dialogState?.[key as keyof DialogState]
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">👋</div>
              <p className="text-gray-600 text-lg mb-2">你好！我是智行伴侣</p>
              <p className="text-gray-500 text-sm">
                告诉我你们几个人、打算玩多久，我来帮你规划行程
              </p>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-white shadow-md text-gray-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.isStreaming && (
                  <span className="inline-block ml-1 animate-pulse">▊</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {showPlanButton && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 bg-gradient-to-r from-purple-100 to-pink-100"
        >
          <button
            onClick={handleStartPlan}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>✨</span>
            <span>够了，开始规划行程</span>
          </button>
        </motion.div>
      )}

      <div className="bg-white border-t px-4 py-3">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputValue);
              }
            }}
            placeholder="说点什么..."
            disabled={isStreaming}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={isStreaming || !inputValue.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isStreaming ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>发送</span>
            )}
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-2 text-center">
          当前第 {round} 轮对话 · 最多 6 轮
        </div>
      </div>
    </div>
  );
}
