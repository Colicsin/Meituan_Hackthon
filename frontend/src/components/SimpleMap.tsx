import { useEffect, useRef } from "react";

interface SimpleMapProps {
  points: { lat: number; lng: number; name: string }[];
}

export function SimpleMap({ points }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;

    const initMap = async () => {
      try {
        const AMapLoader = (await import("@amap/amap-jsapi-loader")).default;
        
        const AMap = await AMapLoader.load({
          key: "21df2fd7b6e199532886372ce7c7c09b",
          version: "2.0",
        });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.destroy();
        }

        const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
        const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;

        const map = new AMap.Map(mapRef.current, {
          center: [centerLng, centerLat],
          zoom: 14,
        });
        mapInstanceRef.current = map;

        points.forEach((point, idx) => {
          const marker = new AMap.Marker({
            position: [point.lng, point.lat],
            map,
            title: point.name,
          });

          marker.setLabel({
            content: `<div style="background:#7C3AED;color:white;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${idx + 1}. ${point.name}</div>`,
            offset: new AMap.Pixel(0, -30),
          });
        });

        if (points.length >= 2) {
          const linePoints = points.map((p) => [p.lng, p.lat]);
          new AMap.Polyline({
            path: linePoints,
            map,
            strokeColor: "#8B5CF6",
            strokeWeight: 5,
            strokeOpacity: 0.8,
          });

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
  }, [points]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "400px", borderRadius: "12px" }}
      className="bg-gray-100"
    />
  );
}
