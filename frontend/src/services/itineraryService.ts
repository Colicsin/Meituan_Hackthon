/**
 * 行程规划服务
 */
const API_BASE_URL = "http://localhost:8001";

export interface RouteSegment {
  poi_id: string;
  name: string;
  category: string;
  rating: number;
  avg_price: number;
  distance_from_prev: number;
  travel_time_min: number;
  stay_time_min: number;
  arrival_time: string;
  leave_time: string;
  address: string;
  tags: string[];
}

export interface ItineraryRoute {
  name: string;
  style: string;
  segments: RouteSegment[];
  total_distance_km: number;
  total_time_min: number;
  total_price: number;
  summary: string;
}

export async function planItinerary(
  poiIds: string[],
  originLat: number,
  originLng: number
): Promise<ItineraryRoute[]> {
  const response = await fetch(`${API_BASE_URL}/itinerary/plan-custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      poi_ids: poiIds,
      origin_lat: originLat,
      origin_lng: originLng,
    }),
  });
  
  if (!response.ok) {
    throw new Error("行程规划失败");
  }
  
  const data = await response.json();
  return data.routes;
}
