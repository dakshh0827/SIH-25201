// =====================================================
// src/stores/authStore.js (FIXED - Token Persistence)
// =====================================================
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/axios";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      isCheckingAuth: false,

      register: async (userData) => {
        try {
          const response = await api.post("/auth/register", userData);
          return response.data;
        } catch (error) {
          throw error.response?.data || error;
        }
      },

      verifyEmail: async (email, otp) => {
        try {
          const response = await api.post("/auth/verify-email", { email, otp });
          const { accessToken, user } = response.data.data;
          
          set({ 
            user, 
            accessToken, 
            isAuthenticated: true,
            isLoading: false 
          });
          return response.data;
        } catch (error) {
          throw error.response?.data || error;
        }
      },

      resendOtp: async (email) => {
        try {
          const response = await api.post("/auth/resend-otp", { email });
          return response.data;
        } catch (error) {
          throw error.response?.data || error;
        }
      },

      login: async (email, password) => {
        try {
          const response = await api.post("/auth/login", { email, password });
          const { accessToken, user } = response.data.data;
          
          set({ 
            user, 
            accessToken, 
            isAuthenticated: true,
            isLoading: false
          });
          return response.data;
        } catch (error) {
          throw error.response?.data || error;
        }
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch (error) {
          console.error("Logout failed:", error);
        } finally {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isCheckingAuth: false,
            isLoading: false,
          });
        }
      },

      checkAuth: async () => {
        // Prevent multiple simultaneous checkAuth calls
        if (get().isCheckingAuth) {
          return;
        }

        // If we have a token, we're likely authenticated
        // Skip loading state to prevent UI flicker
        const hasToken = !!get().accessToken;
        
        set({ 
          isLoading: !hasToken, // Only show loading if no token
          isCheckingAuth: true 
        });

        try {
          const response = await api.get("/auth/profile");
          
          set({
            user: response.data.data,
            isAuthenticated: true,
            isLoading: false,
            isCheckingAuth: false,
          });
        } catch (error) {
          // Only clear auth on actual auth errors (401, 403)
          if (error.response?.status === 401 || error.response?.status === 403) {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isLoading: false,
              isCheckingAuth: false,
            });
          } else {
            // For other errors (network, server errors), just stop loading
            // Don't clear existing auth state
            set({
              isLoading: false,
              isCheckingAuth: false,
            });
          }
        }
      },

      // Called by axios interceptor after successful token refresh
      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      // Called by axios interceptor when refresh fails
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isCheckingAuth: false,
        });
      },

      updateProfile: async (data) => {
        try {
          const response = await api.put("/auth/profile", data);
          set({ user: response.data.data });
          return response.data;
        } catch (error) {
          throw error.response?.data || error;
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        try {
          const response = await api.put("/auth/change-password", {
            currentPassword,
            newPassword,
          });
          return response.data;
        } catch (error) {
          throw error.response?.data || error;
        }
      },
    }),
    {
      name: "auth-storage", // name of item in localStorage
      partialize: (state) => ({
        // Only persist these fields
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);