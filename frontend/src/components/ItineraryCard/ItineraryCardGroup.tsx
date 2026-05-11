import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ItineraryCard } from './ItineraryCard';

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

interface ItineraryCardGroupProps {
  routes: ItineraryRoute[];
  onSelect: (route: ItineraryRoute) => void;
}

export function ItineraryCardGroup({ routes, onSelect }: ItineraryCardGroupProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onSelect(routes[index]);
  };
  
  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 320;
      const newScrollLeft = containerRef.current.scrollLeft + 
        (direction === 'left' ? -scrollAmount : scrollAmount);
      
      containerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };
  
  if (routes.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          为你规划了 {routes.length} 种路线
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleScroll('left')}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-600">←</span>
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-600">→</span>
          </button>
        </div>
      </div>
      
      <div className="relative">
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <AnimatePresence>
            {routes.map((route, index) => (
              <motion.div
                key={route.name}
                style={{ scrollSnapAlign: 'start' }}
              >
                <ItineraryCard
                  route={route}
                  index={index}
                  isSelected={selectedIndex === index}
                  onSelect={() => handleSelect(index)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-purple-50 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-purple-50 to-transparent pointer-events-none" />
      </div>
      
      {selectedIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800">
                已选择：{routes[selectedIndex].name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {routes[selectedIndex].summary}
              </p>
            </div>
            <button
              onClick={() => onSelect(routes[selectedIndex])}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              查看地图 →
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
