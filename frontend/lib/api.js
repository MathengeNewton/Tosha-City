import axios from 'axios';

/**
 * API Configuration
 * Backend API base URL - must be set via NEXT_PUBLIC_API_URL environment variable
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://apis.toshacity.co.ke/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('toshacity-token') || sessionStorage.getItem('toshacity-token')
      : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('toshacity-token');
        sessionStorage.removeItem('toshacity-token');
        sessionStorage.removeItem('toshacity-user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const apiClient = {
  // Auth
  auth: {
    login: (credentials) => {
      // Backend expects { username, password } but accepts email as username
      const payload = credentials.username 
        ? credentials 
        : { username: credentials.email || credentials.username, password: credentials.password };
      return api.post('/auth/login', payload);
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('toshacity-token');
        sessionStorage.removeItem('toshacity-token');
        sessionStorage.removeItem('toshacity-user');
      }
    },
  },

  // Products
  products: {
    getAll: () => api.get('/products'),
    getActive: () => api.get('/products/active'),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.patch(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
  },

  // Stock Sessions
  stockSessions: {
    getAll: () => api.get('/stock-sessions'),
    getCurrent: () => api.get('/stock-sessions/current'),
    getById: (id) => api.get(`/stock-sessions/${id}`),
    open: (data) => api.post('/stock-sessions/open', data),
    close: (id) => api.post(`/stock-sessions/${id}/close`),
  },

  // Stock Entries
  stockEntries: {
    getAll: (params) => api.get('/stock-entries', { params }),
    getById: (id) => api.get(`/stock-entries/${id}`),
    create: (data) => api.post('/stock-entries', data),
    update: (id, data) => api.patch(`/stock-entries/${id}`, data),
    delete: (id) => api.delete(`/stock-entries/${id}`),
  },

  // Sales
  sales: {
    getAll: (params) => api.get('/sales', { params }),
    getById: (id) => api.get(`/sales/${id}`),
    getPayment: (id) => api.get(`/sales/${id}/payment`),
    create: (data) => api.post('/sales', data),
    update: (id, data) => api.patch(`/sales/${id}`, data),
    delete: (id) => api.delete(`/sales/${id}`),
  },

  // Payments
  payments: {
    getAll: (params) => api.get('/payments', { params }),
    getById: (id) => api.get(`/payments/${id}`),
    getBySaleId: (saleId) => api.get(`/payments/sale/${saleId}`),
    create: (data) => api.post('/payments', data),
  },

  // Users
  users: {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
  },

  // Uploads
  uploads: {
    upload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    getFile: (filename) => `${API_BASE_URL}/uploads/${filename}`,
  },

  // Reports
  reports: {
    getSalesReport: (params) => api.get('/reports/sales', { params }),
    getStockReport: (params) => api.get('/reports/stock', { params }),
    getWastageReport: (params) => api.get('/reports/wastage', { params }),
    getWeeklyComparison: () => api.get('/reports/weekly-comparison'),
    getDailySummary: (date) => api.get('/reports/daily-summary', { params: date ? { date } : {} }),
  },

  // Suppliers
  suppliers: {
    getAll: (params) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.patch(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
  },

  // Customers
  customers: {
    getAll: (params) => api.get('/customers', { params }),
    getById: (id) => api.get(`/customers/${id}`),
    getCreditWithBalances: () => api.get('/customers/credit/balances'),
    getBalance: (id) => api.get(`/customers/${id}/balance`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.patch(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
  },

  // Settings / Profile
  profile: {
    get: () => api.get('/users/me'),
    update: (data) => api.put('/users/me', data),
    changePassword: (data) => api.post('/auth/change-password', data),
  },
};

export default apiClient;

