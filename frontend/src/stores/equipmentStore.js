import { create } from "zustand";
import api from "../lib/axios";

export const useEquipmentStore = create((set, get) => ({
  equipment: [],
  selectedEquipment: null,
  isLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  },

  // Fetch all equipment with filters
  fetchEquipment: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      
      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);
      if (filters.department) params.append("department", filters.department);
      if (filters.status) params.append("status", filters.status);
      if (filters.institute) params.append("institute", filters.institute);
      if (filters.labId) params.append("labId", filters.labId);
      if (filters.search) params.append("search", filters.search);

      const response = await api.get(`/equipment?${params.toString()}`);
      
      set({
        equipment: response.data.data,
        pagination: response.data.pagination,
        isLoading: false,
      });
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch equipment",
        isLoading: false 
      });
      throw error;
    }
  },

  // Fetch single equipment by ID
  fetchEquipmentById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/equipment/${id}`);
      set({
        selectedEquipment: response.data.data,
        isLoading: false,
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch equipment",
        isLoading: false 
      });
      throw error;
    }
  },

  // Create new equipment
  createEquipment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/equipment", data);
      
      // Add to local state
      set((state) => ({
        equipment: [response.data.data, ...state.equipment],
        isLoading: false,
      }));
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.msg ||
                          "Failed to create equipment";
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  // Update equipment
  updateEquipment: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/equipment/${id}`, data);
      
      // Update in local state
      set((state) => ({
        equipment: state.equipment.map((eq) =>
          eq.id === id ? response.data.data : eq
        ),
        selectedEquipment: state.selectedEquipment?.id === id 
          ? response.data.data 
          : state.selectedEquipment,
        isLoading: false,
      }));
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.msg ||
                          "Failed to update equipment";
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  // Delete equipment (soft delete)
  deleteEquipment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/equipment/${id}`);
      
      // Remove from local state
      set((state) => ({
        equipment: state.equipment.filter((eq) => eq.id !== id),
        selectedEquipment: state.selectedEquipment?.id === id 
          ? null 
          : state.selectedEquipment,
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to delete equipment",
        isLoading: false 
      });
      throw error;
    }
  },

  // Get equipment statistics
  fetchEquipmentStats: async () => {
    try {
      const response = await api.get("/equipment/stats");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Clear selected equipment
  clearSelectedEquipment: () => {
    set({ selectedEquipment: null });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));