import axios from 'axios';

// Create a configured axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Modify the request config before sending it
    // For example, inject an auth token from localStorage:
    // const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
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
    // You can modify the response data here
    return response;
  },
  (error) => {
    // Any status codes outside the range of 2xx trigger this function
    // For example, globally handle 401 Unauthorized errors:
    // if (error.response?.status === 401) {
    //   // Redirect to login or refresh token
    // }
    return Promise.reject(error);
  }
);

export default api;
