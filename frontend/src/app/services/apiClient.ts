import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor: attach JWT token (skip for auth endpoints)
apiClient.interceptors.request.use((config) => {
  const isAuthRequest = config.url?.startsWith('/auth/');
  const token = localStorage.getItem('token');
  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 (skip for auth endpoints)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthRequest) {
      const token = localStorage.getItem('token');
      if (token) {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
