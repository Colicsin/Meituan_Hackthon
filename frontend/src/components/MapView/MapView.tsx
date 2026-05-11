import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface POIPoint {
  id?: string;
  lat: number;
  lng: number;
  name: string;
  category?: string;
  rating?: number;
  avg_price?: number;
  address?: string;
  tags?: string[];
  arrival_time?: string;
  stay_time_min?: number;
}

interface MapViewProps {
  points: POIPoint[];
  height?: string;
  showRoute?: boolean;
  selectedPointId?: string;
  onPointClick?: (point: POIPoint) => void;
  onWaypointAdd?: (lat: number, lng: number) => void;
}

export function MapView({
  points,
  height = "500px",
  showRoute = true,
  selectedPointId,
  onPointClick,
  onWaypointAdd,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<POIPoint | null>(null);
  const [contextMenu, setContextMenu] = useState<{lat: number; lng: number; x: number; y: number} | null>(null);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;

    const initMap = async () => {
      try {
        const AMapLoader = (await import("@amap/amap-jsapi-loader")).default;

        const AMap = await AMapLoader.load({
          key: "21df2fd7b6e199532886372ce7c7c09b",
          version: "2.0",
          plugins: ["AMap.Marker", "AMap.Polyline", "AMap.InfoWindow"],
        });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.destroy();
        }
        markersRef.current = [];

        const centerLng =
          points.reduce((sum, p) => sum + p.lng, 0) / points.length;
        const centerLat =
          points.reduce((sum, p) => sum + p.lat, 0) / points.length;

        const map = new AMap.Map(mapRef.current, {
          center: [centerLng, centerLat],
          zoom: 14,
          viewMode: "2D",
        });
        mapInstanceRef.current = map;

        points.forEach((point, idx) => {
          const isSelected = point.id === selectedPointId;

          const markerContent = `
            <div style="
              width: 36px;
              height: 36px;
              background: ${isSelected ? "#EC4899" : "#7C3AED"};
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              ${idx + 1}
            </div>
          `;

          const marker = new AMap.Marker({
            position: [point.lng, point.lat],
            map,
            content: markerContent,
            offset: new AMap.Pixel(-18, -18),
            extData: point,
          });

          marker.on("click", () => {
            setSelectedPoint(point);
            onPointClick?.(point);
          });

          marker.setLabel({
            content: `<div style="background:rgba(124,58,237,0.9);color:white;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:500;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.2);">${point.name}</div>`,
            offset: new AMap.Pixel(0, -45),
          });

          markersRef.current.push(marker);
        });

        if (showRoute && points.length >= 2) {
          const linePoints = points.map((p) => [p.lng, p.lat]);

          new AMap.Polyline({
            path: linePoints,
            map,
            strokeColor: "#8B5CF6",
            strokeWeight: 6,
            strokeOpacity: 0.8,
            strokeStyle: "solid",
            lineJoin: "round",
            lineCap: "round",
          });

          for (let i = 0; i < points.length - 1; i++) {
            const direction = Math.atan2(
              points[i + 1].lat - points[i].lat,
              points[i + 1].lng - points[i].lng
            );
            const midLng = (points[i].lng + points[i + 1].lng) / 2;
            const midLat = (points[i].lat + points[i + 1].lat) / 2;

            const arrowContent = `
              <div style="
                width: 20px;
                height: 20px;
                background: #7C3AED;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transform: rotate(${direction}rad);
              ">
                <span style="color: white; font-size: 10px;">→</span>
              </div>
            `;

            new AMap.Marker({
              position: [midLng, midLat],
              map,
              content: arrowContent,
              offset: new AMap.Pixel(-10, -10),
            });
          }

          map.setFitView();
        }
      } catch (error) {
        console.error("地图加载失败:", error);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }
    };
  }, [points, showRoute, selectedPointId]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        style={{ width: "100%", height, borderRadius: "12px" }}
        className="bg-gray-100"
      />

      <AnimatePresence>
        {selectedPoint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 z-10"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  {selectedPoint.name}
                </h3>
                {selectedPoint.category && (
                  <p className="text-sm text-gray-500">
                    {selectedPoint.category}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              {selectedPoint.rating && (
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-500">
                    ★ {selectedPoint.rating}
                  </div>
                  <div className="text-xs text-gray-500">评分</div>
                </div>
              )}
              {selectedPoint.avg_price && (
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">
                    ¥{selectedPoint.avg_price}
                  </div>
                  <div className="text-xs text-gray-500">人均</div>
                </div>
              )}
              {selectedPoint.stay_time_min && (
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-800">
                    {selectedPoint.stay_time_min}分
                  </div>
                  <div className="text-xs text-gray-500">建议停留</div>
                </div>
              )}
            </div>

            {selectedPoint.address && (
              <p className="text-sm text-gray-600 mb-3">
                📍 {selectedPoint.address}
              </p>
            )}

            {selectedPoint.tags && selectedPoint.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedPoint.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
        <div className="text-xs text-gray-600">
          共 {points.length} 个地点
        </div>
      </div>
    </div>
  );
}
