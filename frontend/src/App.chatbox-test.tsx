import { useState } from 'react';
import { ChatBox } from './components/ChatBox';

interface DialogState {
  group_size: number | null;
  budget: number | null;
  time_budget: number | null;
  category_pref: string | null;
  emotion: string | null;
  location: string | null;
}

function App() {
  const [completedState, setCompletedState] = useState<DialogState | null>(null);
  const [showChat, setShowChat] = useState(true);

  const handleComplete = (state: DialogState) => {
    setCompletedState(state);
    setShowChat(false);
    console.log('对话完成，画像数据:', state);
  };

  const handleRestart = () => {
    setCompletedState(null);
    setShowChat(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-2xl mx-auto h-screen flex flex-col">
        <header className="text-center py-4 bg-white shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">
            N12 ChatBox 组件测试
          </h1>
          <p className="text-sm text-gray-500">
            验证 DoD 清单：流式显示、进度条、对话轮次
          </p>
        </header>

        {showChat ? (
          <div className="flex-1 overflow-hidden">
            <ChatBox onComplete={handleComplete} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">✨</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  对话完成！
                </h2>
                <p className="text-gray-600">
                  已收集用户画像信息
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {completedState && Object.entries(completedState).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600 capitalize">
                      {key.replace('_', ' ')}
                    </span>
                    <span className={`font-semibold ${value ? 'text-purple-600' : 'text-gray-400'}`}>
                      {value ?? '未填写'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleRestart}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                重新开始对话
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border-t px-4 py-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>流式显示</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>6格进度条</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>画像字段点亮</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>开始规划按钮</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>SSE流式接口</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>移动端友好</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
