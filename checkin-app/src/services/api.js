import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('checkin-auth-storage')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`
      }
    } catch {
      // ignore malformed storage
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('checkin-auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  loginWithGoogle: (credential) => api.post('/auth/google', { credential }),
  me: () => api.get('/auth/me')
}

export const weddingAPI = {
  getAll: (params) => api.get('/weddings', { params })
}

export const checkinAPI = {
  manifest: (weddingId) => api.get(`/checkin/${weddingId}/manifest`),
  sync: (weddingId, scans) => api.post(`/checkin/${weddingId}/sync`, { scans }),
  live: (weddingId) => api.get(`/checkin/${weddingId}/live`),
  scan: (data) => api.post('/checkin/scan', data)
}

export default api
