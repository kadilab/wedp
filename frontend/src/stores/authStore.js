import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { token, user } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Erreur de connexion'
          }
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/register', data)
          const { token, user } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Erreur d\'inscription'
          }
        }
      },

      loginWithGoogle: async (credential) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/google', { credential })
          const { token, user } = response.data
          set({ user, token, isAuthenticated: true, isLoading: false })
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          return { success: true, user }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            error: error.response?.data?.error || 'Erreur de connexion Google'
          }
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
        delete api.defaults.headers.common['Authorization']
      },

      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } })
      },

      checkAuth: async () => {
        const token = get().token
        if (!token) return false

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await api.get('/auth/me')
          set({ user: response.data.user, isAuthenticated: true })
          return true
        } catch (error) {
          get().logout()
          return false
        }
      },

      refreshUser: async () => {
        try {
          const response = await api.get('/auth/me')
          set({ user: response.data.user })
        } catch (error) {
          console.error('Failed to refresh user:', error)
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
