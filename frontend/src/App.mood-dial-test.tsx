import { useState } from 'react';
import { MoodDial } from './components/MoodDial';

interface MoodVector {
  x: number;
  y: number;
}

function App() {
  const [moodValue, setMoodValue] = useState<MoodVector>({ x: 0, y: 0 });
  const [history, setHistory] = useState<MoodVector[]>([]);

  const handleMoodChange = (value: MoodVector) => {
    setMoodValue(value);
    setHistory(prev => [...prev.slice(-9), value]);
  };

  const getMoodDescription = (x: number, y: number): string => {
    const descriptions: string[] = [];
    
    if (x > 0.3) descriptions.push('倾向热闹');
    else if (x < -0.3) descriptions.push('倾向独处');
    
    if (y > 0.3) descriptions.push('高能状态');
    else if (y < -0.3) descriptions.push('静谧休息');
    
    return descriptions.length > 0 ? descriptions.join('，') : '内心平静';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            N11 情绪拨盘组件测试
          </h1>
          <p className="text-gray-600">
            验证 DoD 清单：阻尼感、色彩渐变、情绪标签、触屏+鼠标
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              情绪拨盘
            </h2>
            <div className="flex justify-center">
              <MoodDial onChange={handleMoodChange} size={300} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                当前情绪向量
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">热闹 ↔ 独处 (x轴):</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {moodValue.x.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">高能 ↔ 静谧 (y轴):</span>
                  <span className="font-mono font-semibold text-purple-600">
                    {moodValue.y.toFixed(3)}
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">情绪描述:</span>
                    <span className="font-semibold text-pink-600">
                      {getMoodDescription(moodValue.x, moodValue.y)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                DoD 验证清单
              </h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-gray-600">
                    components/MoodDial/MoodDial.tsx 完成
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-gray-600">
                    横轴"热闹 ↔ 独处"，纵轴"高能 ↔ 静谧"
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-gray-600">
                    拖动时背景色实时渐变（蓝→紫→粉→橙）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-gray-600">
                    释放时有阻尼回弹（useSpring配置）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-gray-600">
                    输出归一化情绪向量 {'{x: -1~1, y: -1~1}'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-gray-600">
                    显示当前位置情绪标签（9宫格）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-gray-600">
                    支持触屏 + 鼠标拖动（Framer Motion drag）
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                选择历史（最近10次）
              </h2>
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">
                  拖动拨盘开始测试...
                </p>
              ) : (
                <div className="space-y-1 text-xs font-mono">
                  {history.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-gray-600">
                      <span>#{idx + 1}</span>
                      <span>
                        x: {item.x.toFixed(2)}, y: {item.y.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
