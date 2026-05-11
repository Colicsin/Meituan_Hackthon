export interface POI {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  avg_price: number;
  open_hours: string;
  tags: string[];
  demo_reviews: string[];
  address: string;
  duration_min: number;
}
