import axios from "axios";
import { useAuthStore } from "../stores/authStore";

// Use env var for ngrok support, fallback to local API
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

console.log('🔧 API URL configured:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    // CRITICAL: Add ngrok header when backend is tunneled
    ...(API_URL.includes('ngrok') && {
      'ngrok-skip-browser-warning': 'true'
    })
  },
});

// =========================================
// Refresh Token Queue State
// =========================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
};

// =========================================
// REQUEST INTERCEPTOR
// =========================================
api.interceptors.request.use(
  (config) => {
    // Zustand store access for token
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CRITICAL: Ensure ngrok header is present for all ngrok requests
    if (API_URL.includes('ngrok')) {
      config.headers['ngrok-skip-browser-warning'] = 'true';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =========================================
// RESPONSE INTERCEPTOR
// =========================================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no response (network error)
    if (!error.response) {
      console.error('❌ Network error:', error.message);
      return Promise.reject(error);
    }

    const status = error.response.status;

    // If 401 and request already retried → fail
    if (status === 401 && originalRequest._retry) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Skip refresh for auth routes
    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/")
    ) {
      if (isRefreshing) {
        // Queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Let's refresh
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 
              "Content-Type": "application/json",
              ...(API_URL.includes('ngrok') && {
                'ngrok-skip-browser-warning': 'true'
              })
            },
          }
        );

        const newToken = refreshResponse.data.data.accessToken;

        // Update Zustand store
        useAuthStore.getState().setAccessToken(newToken);

        // Process queued requests
        processQueue(null, newToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed
        processQueue(refreshErr, null);
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // For any other 401 (e.g., login expired, protected route)
    if (status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;