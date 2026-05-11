/**
 * POI商家服务 - 前端API调用层
 * 
 * 提供与后端API交互的方法
 */
import axios from 'axios';

// API基础URL（根据环境变量或默认值）
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// POI数据接口
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

// 品类接口
export interface Category {
  name: string;
  count: number;
}

// 标签接口
export interface Tag {
  name: string;
  count: number;
}

// 评论接口
export interface Review {
  poi_id: string;
  user: string;
  text: string;
  rating: number;
  time: string;
}

// 休憩点接口
export interface RestPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: 'free_seat' | 'paid_low';
  has_roof?: boolean;
  has_backrest?: boolean;
  description: string;
}

/**
 * 获取所有商家
 * @param category 可选：按品类筛选
 * @param tag 可选：按标签筛选
 * @param keyword 可选：关键词搜索
 */
export async function getAllPOIs(
  category?: string,
  tag?: string,
  keyword?: string
): Promise<POI[]> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (tag) params.append('tag', tag);
  if (keyword) params.append('keyword', keyword);
  
  const url = `/pois${params.toString() ? '?' + params.toString() : ''}`;
  const response = await api.get(url);
  return response.data;
}

/**
 * 获取所有商家（分页格式）
 */
export async function getPOIsPaginated(
  category?: string,
  tag?: string,
  keyword?: string
): Promise<{ total: number; items: POI[] }> {
  const params = new URLSearchParams();
  params.append('format', 'paginated');
  if (category) params.append('category', category);
  if (tag) params.append('tag', tag);
  if (keyword) params.append('keyword', keyword);
  
  const response = await api.get(`/pois?${params.toString()}`);
  return response.data;
}

/**
 * 根据ID获取单个商家详情
 */
export async function getPOIById(id: string): Promise<POI> {
  const response = await api.get(`/pois/${id}`);
  return response.data;
}

/**
 * 获取商家的评论
 */
export async function getPOIReviews(poiId: string): Promise<{
  poi_id: string;
  poi_name: string;
  total: number;
  reviews: Review[];
}> {
  const response = await api.get(`/pois/${poiId}/reviews`);
  return response.data;
}

/**
 * 获取所有品类（用于筛选器）
 */
export async function getCategories(): Promise<{
  total: number;
  categories: Category[];
}> {
  const response = await api.get('/categories');
  return response.data;
}

/**
 * 获取所有标签（用于标签云）
 */
export async function getTags(): Promise<{
  total: number;
  tags: Tag[];
}> {
  const response = await api.get('/tags');
  return response.data;
}

/**
 * 获取休憩点列表
 * @param type 可选：free_seat 或 paid_low
 */
export async function getRestPoints(type?: string): Promise<RestPoint[]> {
  const url = type ? `/rest-points?rest_type=${type}` : '/rest-points';
  const response = await api.get(url);
  return response.data;
}

/**
 * 检查后端健康状态
 */
export async function checkHealth(): Promise<{ status: string }> {
  const response = await api.get('/health');
  return response.data;
}

// 导出API实例（供高级用法）
export { api };
