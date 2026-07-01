/**
 * Central API client.
 *
 * All frontend service calls go through this axios instance so auth headers,
 * query params, file downloads, and 401 handling stay consistent.
 */

import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

const API_BASE_URL = '/api';

interface ApiError {
  message: string;
  status?: number;
  detail?: string;
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token_expiry');
};

class ApiService {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 60000,   // 60 second timeout — stops infinite loading
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');

      if (token) {
        const headers = AxiosHeaders.from(config.headers);
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
      }

      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<any>) => {
        if (error.response?.status === 401) {
          clearStoredAuth();
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        return Promise.reject(this.toApiError(error));
      }
    );
  }

  private toApiError(error: AxiosError<any>): ApiError {
    const detail = error.response?.data?.detail;
    const message =
      error.response?.data?.message ||
      (typeof detail === 'string' ? detail : undefined) ||
      error.message ||
      'An error occurred';

    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    return {
      message: isTimeout ? 'Request timed out — check your connection' : message,
      status: error.response?.status,
      detail: typeof detail === 'string' ? detail : undefined,
    };
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.request<T>(config);
    return response.data;
  }

  async get<T>(endpoint: string, params?: QueryParams): Promise<T> {
    return this.request<T>({ url: endpoint, method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: any, params?: QueryParams, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ url: endpoint, method: 'POST', data, params, ...config });
  }

  async put<T>(endpoint: string, data?: any, params?: QueryParams): Promise<T> {
    return this.request<T>({ url: endpoint, method: 'PUT', data, params });
  }

  async patch<T>(endpoint: string, data?: any, params?: QueryParams): Promise<T> {
    return this.request<T>({ url: endpoint, method: 'PATCH', data, params });
  }

  async delete<T>(endpoint: string, params?: QueryParams): Promise<T> {
    return this.request<T>({ url: endpoint, method: 'DELETE', params });
  }

  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>({
      url: endpoint,
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': undefined },
    });
  }

  async download(endpoint: string, filename: string, params?: QueryParams): Promise<void> {
    const response = await this.client.request<Blob>({
      url: endpoint,
      method: 'GET',
      params,
      responseType: 'blob',
    });

    const downloadUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

const api = new ApiService(API_BASE_URL);

export default api;
export type { ApiError };

export const authAPI = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: any }>('/auth/login', { email, password }),

  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    department?: string;
    employee_id?: string;
  }) =>
    api.post<{ access_token: string; user: any }>('/auth/register', data),

  me: () => api.get<any>('/auth/me'),

  refreshToken: () =>
    api.post<{ access_token: string; user: any }>('/auth/refresh'),

  logout: () => api.post('/auth/logout'),
};

export const userAPI = {
  getAll: (params?: { page?: number; page_size?: number; search?: string }) =>
    api.get<{ users: any[]; total: number }>('/users/', params),

  getById: (id: number) =>
    api.get<any>(`/users/${id}`),

  create: (data: any) =>
    api.post<any>('/users/', data),

  update: (id: number, data: any) =>
    api.put<any>(`/users/${id}`, data),

  delete: (id: number) =>
    api.delete(`/users/${id}`),

  changePassword: (data: { new_password: string }) =>
    api.post('/users/me/change-password', data),

  getStats: () =>
    api.get<any>('/users/me/stats'),
};

export const itemAPI = {
  getAll: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    status?: string;
  }) =>
    api.get<{ items: any[]; total: number }>('/items/', params),

  getById: (id: number) =>
    api.get<any>(`/items/${id}`),

  create: (data: any) =>
    api.post<any>('/items/', data),

  update: (id: number, data: any) =>
    api.put<any>(`/items/${id}`, data),

  delete: (id: number) =>
    api.delete(`/items/${id}`),

  search: (query: string) =>
    api.get<any[]>('/items/search', { q: query }),
};

export const transactionAPI = {
  getAll: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get<{ transactions: any[]; total: number }>('/transactions/', params),

  getById: (id: number) =>
    api.get<any>(`/transactions/${id}`),

  borrow: (data: {
    user_qr_code: string;
    item_qr_code: string;
    quantity: number;
    purpose?: string;
    due_days?: number;
  }) =>
    api.post<any>('/transactions/borrow', data),

  return: (data: {
    transaction_id: number;
    condition_at_return?: string;
    notes?: string;
  }) =>
    api.post<any>('/transactions/return', data),

  getMyActive: () =>
    api.get<any[]>('/transactions/my-active'),

  getMyHistory: (params?: { limit?: number }) =>
    api.get<any[]>('/transactions/my-history', params),

  getRequests: () =>
    api.get<any[]>('/transactions/requests'),

  createRequest: (data: any) =>
    api.post<any>('/transactions/requests', data),
};

export const dashboardAPI = {
  getOverview: () =>
    api.get<any>('/dashboard/overview'),

  getStats: () =>
    api.get<any>('/dashboard/stats'),

  getRecentActivities: (params?: { limit?: number }) =>
    api.get<any[]>('/dashboard/recent-activities', params),

  getPopularItems: (params?: { limit?: number }) =>
    api.get<any[]>('/dashboard/popular-items', params),

  getBorrowingTrends: (params?: { days?: number }) =>
    api.get<any[]>('/dashboard/borrowing-trends', params),
};

export const reviewAPI = {
  create: (data: {
    item_id: number;
    transaction_id: number;
    rating?: number;
    comment?: string;
    has_issue?: boolean;
    issue_description?: string;
  }) =>
    api.post<any>('/reviews/', data),

  getByItem: (itemId: number, params?: { page?: number; page_size?: number }) =>
    api.get<{ reviews: any[]; total: number }>(`/reviews/item/${itemId}`, params),

  update: (id: number, data: any) =>
    api.put<any>(`/reviews/${id}`, data),

  delete: (id: number) =>
    api.delete(`/reviews/${id}`),
};

export const reportAPI = {
  generate: (params: {
    report_type: string;
    format: string;
    start_date?: string;
    end_date?: string;
  }) =>
    api.download('/reports/generate', `report_${params.report_type}.${params.format}`, params),

  getScheduled: () =>
    api.get<any[]>('/reports/scheduled'),

  createSchedule: (data: any) =>
    api.post<any>('/reports/scheduled', data),
};

export const qrAPI = {
  generateUser: (userId: number) =>
    api.get<{ qr_code_data: string; qr_code_image: string }>(`/qr/user/${userId}`),

  generateItem: (itemId: number) =>
    api.get<{ qr_code_data: string; qr_code_image: string }>(`/qr/item/${itemId}`),

  verify: (qrData: string) =>
    api.post<{ valid: boolean; type: string; id: number }>('/qr/verify', { qr_data: qrData }),
};