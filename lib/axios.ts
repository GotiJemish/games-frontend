import axios from 'axios';

// Create a configured axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/',
  timeout: 5000, // 5s timeout — fail fast instead of hanging
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Inject auth token from localStorage if it exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Handle request error
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx triggers this function
    return response;
  },
  (error) => {
    // Any status codes outside the range of 2xx trigger this function
    // Globally handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Clear token and auth state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_auth');
        // A simple reload will push the user back to the login screen
        if (window.location.pathname.startsWith('/admin')) {
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
