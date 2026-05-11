import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface MoodVector {
  x: number;
  y: number;
}

interface MoodDialProps {
  onChange?: (value: MoodVector) => void;
  size?: number;
}

const MOOD_LABELS: Record<string, string> = {
  '0,0': '内心平静',
  '0,1': '高能活跃',
  '0,-1': '静谧休息',
  '1,0': '热闹社交',
  '1,1': '热闹高能',
  '1,-1': '热闹休憩',
  '-1,0': '独处安静',
  '-1,1': '独处高能',
  '-1,-1': '独处静谧',
};

function getMoodLabel(x: number, y: number): string {
  const gridX = Math.round(x);
  const gridY = Math.round(y);
  const key = `${gridX},${gridY}`;
  return MOOD_LABELS[key] || '内心平静';
}

export function MoodDial({ onChange, size = 320 }: MoodDialProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('内心平静');
  
  const centerX = size / 2;
  const centerY = size / 2;
  const knobRadius = 28;
  const maxDrag = (size / 2) - knobRadius - 10;

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 150 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const backgroundColor = useTransform([x, y], ([latestX, latestY]) => {
    const normalizedX = (latestX as number) / maxDrag;
    const normalizedY = (latestY as number) / maxDrag;
    
    const angle = Math.atan2(normalizedY, normalizedX);
    const hue = ((angle + Math.PI) / (2 * Math.PI)) * 360;
    
    const distance = Math.sqrt(normalizedX ** 2 + normalizedY ** 2);
    const saturation = 50 + distance * 30;
    const lightness = 55 + normalizedY * 15;
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  });

  const knobColor = useTransform([x, y], ([latestX, latestY]) => {
    const normalizedX = (latestX as number) / maxDrag;
    const normalizedY = (latestY as number) / maxDrag;
    
    const angle = Math.atan2(normalizedY, normalizedX);
    const hue = ((angle + Math.PI) / (2 * Math.PI)) * 360;
    
    return `hsl(${hue}, 70%, 40%)`;
  });

  const handleDragStart = useCallback(() => {
    console.log('🔵 拖动开始');
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    console.log('🟢 拖动结束');
    setIsDragging(false);
    
    const currentX = xSpring.get();
    const currentY = ySpring.get();
    
    console.log('当前位置:', { currentX, currentY });
    
    const normalizedX = currentX / maxDrag;
    const normalizedY = currentY / maxDrag;
    
    const finalX = Math.max(-1, Math.min(1, normalizedX));
    const finalY = Math.max(-1, Math.min(1, normalizedY));
    
    console.log('归一化向量:', { finalX, finalY });
    
    setCurrentLabel(getMoodLabel(finalX, finalY));
    
    if (onChange) {
      console.log('调用 onChange');
      onChange({ x: finalX, y: finalY });
    } else {
      console.log('⚠️ onChange 未定义');
    }
  }, [xSpring, ySpring, maxDrag, onChange]);

  const moodLabel = useTransform([x, y], ([latestX, latestY]) => {
    const normalizedX = (latestX as number) / maxDrag;
    const normalizedY = (latestY as number) / maxDrag;
    return getMoodLabel(normalizedX, normalizedY);
  });

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative">
        <motion.div
          style={{
            width: size,
            height: size,
            background: backgroundColor,
            borderRadius: '50%',
          }}
          className="relative shadow-2xl overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%),
                radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2) 0%, transparent 50%)
              `,
            }}
          />
          
          <svg
            className="absolute inset-0 pointer-events-none"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
          >
            <line
              x1={centerX}
              y1="10"
              x2={centerX}
              y2={size - 10}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
            <line
              x1="10"
              y1={centerY}
              x2={size - 10}
              y2={centerY}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
          </svg>

          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            高能
          </div>
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            静谧
          </div>
          <div
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 text-xs font-medium"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            独处
          </div>
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 text-xs font-medium"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            热闹
          </div>

          <motion.div
            drag
            dragElastic={0}
            dragConstraints={{
              top: -maxDrag,
              left: -maxDrag,
              right: maxDrag,
              bottom: maxDrag,
            }}
            style={{
              x: xSpring,
              y: ySpring,
              width: knobRadius * 2,
              height: knobRadius * 2,
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-xl cursor-grab active:cursor-grabbing"
            whileHover={{ scale: 1.1 }}
            whileDrag={{ scale: 1.2 }}
          >
            <motion.div
              style={{ backgroundColor: knobColor }}
              className="w-full h-full rounded-full border-4 border-white/90"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={isDragging ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-3 h-3 bg-white rounded-full shadow-inner"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.p
          className="text-lg font-semibold text-gray-700"
          style={{ color: knobColor }}
        >
          {currentLabel}
        </motion.p>
        <p className="text-xs text-gray-500 mt-1">
          拖动拨盘选择你的心情
        </p>
      </motion.div>

      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-2">
        <div className="text-center">
          <div className="font-medium">热闹高能</div>
        </div>
        <div className="text-center">
          <div className="font-medium">高能活跃</div>
        </div>
        <div className="text-center">
          <div className="font-medium">独处高能</div>
        </div>
        <div className="text-center">
          <div className="font-medium">热闹社交</div>
        </div>
        <div className="text-center bg-gray-100 rounded px-2 py-1">
          <div className="font-medium">内心平静</div>
        </div>
        <div className="text-center">
          <div className="font-medium">独处安静</div>
        </div>
        <div className="text-center">
          <div className="font-medium">热闹休憩</div>
        </div>
        <div className="text-center">
          <div className="font-medium">静谧休息</div>
        </div>
        <div className="text-center">
          <div className="font-medium">独处静谧</div>
        </div>
      </div>
    </div>
  );
}
