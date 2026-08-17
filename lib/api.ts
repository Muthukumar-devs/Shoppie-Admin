import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Attach JWT token and CSRF token to every request
// For state-changing methods, always fetch a fresh CSRF token first
const STATE_CHANGING_METHODS = ['post', 'put', 'patch', 'delete'];

api.interceptors.request.use(async (config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const method = config.method?.toLowerCase() ?? '';
  const isLoginEndpoint = config.url?.includes('/admin/login');
  const isCsrfEndpoint = config.url?.includes('/csrf-token');

  if (STATE_CHANGING_METHODS.includes(method) && !isLoginEndpoint && !isCsrfEndpoint) {
    // Always get a fresh token for state-changing requests
    const res = await api.get('/csrf-token');
    const freshToken: string = res.data.csrfToken;
    localStorage.setItem('csrf_token', freshToken);
    config.headers['x-csrf-token'] = freshToken;
  } else {
    const csrfToken = typeof window !== 'undefined' ? localStorage.getItem('csrf_token') : null;
    if (csrfToken) config.headers['x-csrf-token'] = csrfToken;
  }

  return config;
});

// Redirect to login on 401 (skip for login endpoint itself)
// Navigation callback registered by AuthContext via setUnauthorizedHandler()
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/admin/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('csrf_token');
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const fetchCsrfToken = async () => {
  const res = await api.get('/csrf-token');
  const token: string = res.data.csrfToken;
  localStorage.setItem('csrf_token', token);
  return token;
};

export const adminLogin = (email: string, password: string) =>
  api.post('/admin/login', { email, password });

// ── Users ─────────────────────────────────────────────────
export const getUsers = (page = 1, limit = 20, search?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return api.get(`/admin/users?${params.toString()}`);
};

export const updateUser = (id: string, data: object) =>
  api.patch(`/admin/users/${id}`, data);

export const deleteUser = (id: string) =>
  api.delete(`/admin/users/${id}`);

// ── Products ──────────────────────────────────────────────
export const getProducts = (page = 1, params?: Record<string, string>) => {
  const query = new URLSearchParams({ page: String(page), ...params }).toString();
  return api.get(`/products?${query}`);
};

export const getProduct = (id: string) => api.get(`/products/${id}`);

export const createProduct = (data: FormData) =>
  api.post('/products', data);

export const updateProduct = (id: string, data: FormData) =>
  api.patch(`/products/${id}`, data);

export const deleteProduct = (id: string) => api.delete(`/products/${id}`);

export const deleteMultipleProducts = (ids: string[]) =>
  api.delete('/products/bulk', { data: { ids } });

export const addProductImages = (id: string, files: File[]) => {
  const fd = new FormData();
  files.forEach(f => fd.append('images', f));
  return api.post(`/products/${id}/images`, fd);
};

export const deleteProductImage = (id: string, public_id: string) =>
  api.delete(`/products/${id}/images`, { data: { public_id } });

// ── Categories ────────────────────────────────────────────
export const getCategories = () => api.get('/categories/admin-list');

export const createCategory = (data: FormData) => api.post('/categories', data);

export const updateCategory = (id: string, data: FormData) =>
  api.patch(`/categories/${id}`, data);

export const deleteCategory = (id: string) => api.delete(`/categories/${id}`);

export const deleteMultipleCategories = (ids: string[]) =>
  api.delete('/categories/bulk', { data: { ids } });

export const getSubCategories = () => api.get('/categories/subcategories/admin-list');

export const createSubCategory = (data: FormData) =>
  api.post('/categories/subcategories', data);

export const updateSubCategory = (id: string, data: FormData) =>
  api.patch(`/categories/subcategories/${id}`, data);

export const deleteSubCategory = (id: string) =>
  api.delete(`/categories/subcategories/${id}`);

export const deleteMultipleSubCategories = (ids: string[]) =>
  api.delete('/categories/subcategories/bulk', { data: { ids } });

export const bulkUploadCategories = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/categories/bulk-upload', form);
};

export const bulkUploadSubCategories = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/categories/subcategories/bulk-upload', form);
};

export const bulkUploadProducts = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/products/bulk-upload', form);
};

// ── Orders ────────────────────────────────────────────────
export const getOrders = (page = 1) =>
  api.get(`/orders?page=${page}`);

export const getOrderById = (id: string) => api.get(`/orders/${id}/admin`);

export const updateOrderStatus = (id: string, status: string) =>
  api.patch(`/orders/${id}/status`, { status });

export const confirmCODPayment = (id: string) =>
  api.patch(`/orders/${id}/confirm-cod-payment`);

// ── Offers ────────────────────────────────────────────────
export const getOffers = () => api.get('/offers/admin');

export const createOffer = (data: FormData) => api.post('/offers', data);

export const updateOffer = (id: string, data: FormData) =>
  api.patch(`/offers/${id}`, data);

export const deleteOffer = (id: string) => api.delete(`/offers/${id}`);

export default api;
