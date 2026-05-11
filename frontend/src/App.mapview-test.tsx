import { useState } from 'react';
import { MapView } from './components/MapView';

const TEST_POINTS = [
  { id: '1', lat: 39.931, lng: 116.453, name: '五道口地铁站', category: '交通', rating: 4.5, avg_price: 0 },
  { id: '2', lat: 39.935, lng: 116.460, name: '清华大学', category: '景点', rating: 4.8, avg_price: 0 },
  { id: '3', lat: 39.938, lng: 116.468, name: '中关村', category: '商圈', rating: 4.3, avg_price: 80 },
  { id: '4', lat: 39.942, lng: 116.475, name: '五道口购物中心', category: '购物', rating: 4.2, avg_price: 150 },
];

function App() {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          N14 MapView 地图组件测试
        </h1>
        <p className="text-center text-gray-500 mb-8">
          点击地图标记查看详情
        </p>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span>🗺️</span>
              测试路线地图
            </h3>
            <p className="text-sm opacity-90 mt-1">
              五道口区域示例路线（{TEST_POINTS.length}个地点）
            </p>
          </div>
          
          <MapView
            points={TEST_POINTS}
            height="500px"
            showRoute={true}
            onPointClick={(point) => {
              setSelectedPoint(point);
              console.log('点击了:', point);
            }}
          />
        </div>

        {selectedPoint && (
          <div className="mt-4 bg-white rounded-xl shadow-lg p-4">
            <h4 className="font-bold text-gray-800">选中的地点：</h4>
            <pre className="mt-2 text-sm text-gray-600 overflow-auto">
              {JSON.stringify(selectedPoint, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">DoD 验证清单</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>高德 JS API 接入（Key已配置）</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>显示行程 POI 标记（带数字编号）</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>绘制 POI 之间的步行路线（紫色线条）</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>支持点击 POI 弹出详情卡片</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>路线方向箭头指示</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>提示：地图标记可点击，弹出详情卡片</p>
        </div>
      </div>
    </div>
  );
}

export default App;
