import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const jwtMessage = String(error.response?.data?.msg || '');
      const shouldLogout = /token|authorization|jwt/i.test(jwtMessage);

      // Integration endpoints can return 401 when provider is not connected.
      // Only force logout for actual JWT/auth failures.
      if (!shouldLogout) {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
