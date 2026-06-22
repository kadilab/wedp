import { create } from 'zustand';
import api from '../services/api';

export const useCreatorStore = create((set, get) => ({
  // State
  creatorProfile: null,
  earnings: {
    pending: 0,
    approved: 0,
    paid: 0
  },
  statistics: {
    templateCount: 0,
    totalUsages: 0,
    totalPayouts: 0
  },
  loading: false,
  error: null,

  // Actions
  fetchCreatorProfile: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/creators/me');
      set({
        creatorProfile: response.data.creatorProfile,
        earnings: response.data.earnings,
        statistics: response.data.statistics,
        loading: false
      });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch creator profile',
        loading: false
      });
      throw error;
    }
  },

  updateCreatorProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put('/creators/me', data);
      set(state => ({
        creatorProfile: {
          ...state.creatorProfile,
          ...response.data.creatorProfile
        },
        loading: false
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update creator profile',
        loading: false
      });
      throw error;
    }
  },

  uploadProfileImage: async (file) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await api.post('/creators/me/upload-profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      set(state => ({
        creatorProfile: {
          ...state.creatorProfile,
          profileImage: response.data.profileImage
        },
        loading: false
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to upload profile image',
        loading: false
      });
      throw error;
    }
  },

  uploadBannerImage: async (file) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('bannerImage', file);

      const response = await api.post('/creators/me/upload-banner-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      set(state => ({
        creatorProfile: {
          ...state.creatorProfile,
          bannerImage: response.data.bannerImage
        },
        loading: false
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to upload banner image',
        loading: false
      });
      throw error;
    }
  },

  fetchPublicCreatorProfile: async (creatorId) => {
    try {
      const response = await api.get(`/creators/${creatorId}`);
      return response.data.creatorProfile;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch creator profile'
      });
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));
