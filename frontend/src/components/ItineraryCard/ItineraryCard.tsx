import { motion } from 'framer-motion';

interface ItineraryRoute {
  name: string;
  summary: string;
  total_time_min: number;
  total_distance_km: number;
  total_price: number;
  segments: Array<{
    name: string;
    category?: string;
    rating?: number;
    avg_price?: number;
    arrival_time?: string;
    stay_time_min?: number;
    travel_time_min?: number;
    latitude?: number;
    longitude?: number;
  }>;
}

interface ItineraryCardProps {
  route: ItineraryRoute;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

const STRATEGY_ICONS: Record<string, string> = {
  '最快路线': '⚡',
  '最美路线': '✨',
  '最省力路线': '🍃',
  '推荐路线': '🎯',
};

const STRATEGY_COLORS: Record<string, string> = {
  '最快路线': 'from-yellow-400 to-orange-500',
  '最美路线': 'from-pink-400 to-rose-500',
  '最省力路线': 'from-green-400 to-teal-500',
  '推荐路线': 'from-purple-400 to-indigo-500',
};

const STRATEGY_TAGS: Record<string, string[]> = {
  '最快路线': ['时间优先', '高效出行'],
  '最美路线': ['风景优美', '适合拍照'],
  '最省力路线': ['轻松休闲', '少走路'],
  '推荐路线': ['综合推荐', '平衡选择'],
};

export function ItineraryCard({ route, index, isSelected, onSelect }: ItineraryCardProps) {
  const icon = STRATEGY_ICONS[route.name] || '🗺️';
  const colorGradient = STRATEGY_COLORS[route.name] || 'from-purple-400 to-pink-500';
  const tags = STRATEGY_TAGS[route.name] || ['智能推荐'];
  
  const hours = Math.floor(route.total_time_min / 60);
  const mins = route.total_time_min % 60;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className={`
        flex-shrink-0 w-80 bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer
        transition-all duration-300
        ${isSelected ? 'ring-4 ring-purple-500 ring-offset-2' : 'hover:shadow-xl'}
      `}
    >
      <div className={`bg-gradient-to-r ${colorGradient} p-4 text-white`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{icon}</span>
            <div>
              <h3 className="font-bold text-lg">{route.name}</h3>
              <p className="text-xs opacity-90">{route.summary}</p>
            </div>
          </div>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center"
            >
              <span className="text-purple-600 text-lg">✓</span>
            </motion.div>
          )}
        </div>
        
        <div className="flex gap-2 mt-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-white/20 rounded-full text-xs backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">
              {hours > 0 ? `${hours}h` : ''}{mins}m
            </div>
            <div className="text-xs text-gray-500">总时长</div>
          </div>
          <div className="text-center border-x">
            <div className="text-2xl font-bold text-gray-800">
              {route.total_distance_km.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">公里</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              ¥{route.total_price}
            </div>
            <div className="text-xs text-gray-500">人均</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-medium">行程路线</div>
          <div className="flex items-start gap-2">
            {route.segments.slice(0, 4).map((seg, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="text-xs text-gray-700 mt-1 text-center truncate w-full">
                  {seg.name.slice(0, 4)}
                </div>
              </div>
            ))}
            {route.segments.length > 4 && (
              <div className="flex-1 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs">
                  +{route.segments.length - 4}
                </div>
              </div>
            )}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            w-full mt-4 py-2 rounded-lg font-medium text-sm
            ${isSelected 
              ? 'bg-purple-600 text-white' 
              : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}
          `}
        >
          {isSelected ? '已选择' : '选择此路线'}
        </motion.button>
      </div>
    </motion.div>
  );
}
