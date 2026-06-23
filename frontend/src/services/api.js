import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage')
    if (token) {
      try {
        const parsed = JSON.parse(token)
        if (parsed?.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`
        }
      } catch (e) {
        console.error('Failed to parse auth token:', e)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout')
}

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (file, onProgress) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || e.loaded)))
        : undefined
    })
  },
  deleteAvatar: () => api.delete('/users/avatar'),
  changePassword: (data) => api.put('/users/password', data),
  changeEmail: (data) => api.put('/users/email', data),
  getNotifications: (params) => api.get('/users/notifications', { params }),
  markNotificationRead: (id) => api.put(`/users/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/users/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/users/notifications/${id}`),
  getStats: () => api.get('/users/stats'),
  deleteAccount: (data) => api.delete('/users/account', { data })
}

// Wedding API
export const weddingAPI = {
  getAll: (params) => api.get('/weddings', { params }),
  getOne: (id) => api.get(`/weddings/${id}`),
  create: (data) => api.post('/weddings', data),
  update: (id, data) => api.put(`/weddings/${id}`, data),
  delete: (id) => api.delete(`/weddings/${id}`),
  getStats: (id) => api.get(`/weddings/${id}/stats`),
  uploadCover: (id, file) => {
    const formData = new FormData()
    formData.append('cover', file)
    return api.post(`/weddings/${id}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadLogo: (id, file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api.post(`/weddings/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadBackground: (id, file) => {
    const formData = new FormData()
    formData.append('background', file)
    return api.post(`/weddings/${id}/background`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadCouplePhoto: (id, file, onProgress) => {
    const formData = new FormData()
    formData.append('couplePhoto', file)
    return api.post(`/weddings/${id}/couple-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || e.loaded)))
        : undefined
    })
  },
  uploadQrLogo: (id, file) => {
    const formData = new FormData()
    formData.append('qrLogo', file)
    return api.post(`/weddings/${id}/qr-logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  // Upload one image for a specific template photo placeholder (multi-image templates)
  uploadTemplateImage: (id, placeholderId, file, onProgress) => {
    const formData = new FormData()
    formData.append('couplePhoto', file)
    formData.append('placeholderId', placeholderId)
    return api.post(`/weddings/${id}/template-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || e.loaded)))
        : undefined
    })
  },
  getTables: (id) => api.get(`/weddings/${id}/tables`),
  saveTables: (id, tables) => api.put(`/weddings/${id}/tables`, { tables })
}

// Guest API
export const guestAPI = {
  getAll: (weddingId, params) => api.get(`/guests/${weddingId}`, { params }),
  getOne: (weddingId, guestId) => api.get(`/guests/${weddingId}/${guestId}`),
  create: (weddingId, data) => api.post(`/guests/${weddingId}`, data),
  createBulk: (weddingId, data) => api.post(`/guests/${weddingId}/bulk`, data),
  update: (weddingId, guestId, data) => api.put(`/guests/${weddingId}/${guestId}`, data),
  delete: (weddingId, guestId) => api.delete(`/guests/${weddingId}/${guestId}`),
  import: (weddingId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/guests/${weddingId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  export: (weddingId, format = 'csv') => 
    api.get(`/guests/${weddingId}/export`, { 
      params: { format },
      responseType: 'blob'
    })
}

// Invitation API
export const invitationAPI = {
  getAll: (weddingId, params) => api.get(`/invitations/${weddingId}`, { params }),
  generate: (weddingId, guestIds) => api.post(`/invitations/${weddingId}/generate`, { guestIds }),
  generatePDFs: (weddingId, guestIds) => api.post(`/invitations/${weddingId}/generate-pdfs`, { guestIds }),
  generateImages: (weddingId, guestIds) => api.post(`/invitations/${weddingId}/generate-images`, { guestIds }),
  downloadAll: (weddingId, type = 'pdf') => api.get(`/invitations/${weddingId}/download-all`, { params: { type }, responseType: 'blob' }),
  regenerate: (weddingId, guestId) => api.post(`/invitations/${weddingId}/${guestId}/regenerate`)
}

// Invitation Order API (manual / offline mobile-money quota purchase)
export const invitationOrderAPI = {
  getPricing: () => api.get('/invitation-orders/pricing'),
  getMine: () => api.get('/invitation-orders/mine'),
  getQuota: (weddingId) => api.get(`/invitation-orders/${weddingId}/quota`),
  getMyOrders: (weddingId) => api.get(`/invitation-orders/${weddingId}/orders`),
  createOrder: (weddingId, quantity, couponCode) => api.post(`/invitation-orders/${weddingId}`, { quantity, couponCode }),
  submitTransaction: (weddingId, orderId, data) => api.put(`/invitation-orders/${weddingId}/orders/${orderId}/submit`, data)
}

// Template API
export const templateAPI = {
  getAll: (params) => api.get('/templates', { params }),
  getMyTemplates: () => api.get('/templates/mine'),
  getOne: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
  getCategories: () => api.get('/templates/categories'),
  preview: (id, data) => api.post(`/templates/${id}/preview`, data),
  uploadBackground: (formData) => api.post('/templates/upload-background', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadBackgroundForTemplate: (id, formData) => api.post(`/templates/${id}/background`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadPreviewImage: (formData) => api.post('/templates/upload-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadIcon: (formData) => api.post('/templates/upload-icon', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  saveDesign: (id, data) => api.put(`/templates/${id}/design`, data),
  fork: (id) => api.post(`/templates/${id}/fork`)
}

// Payment API
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  request: (data) => api.post('/payments/request', data),
  uploadProof: (id, file) => {
    const formData = new FormData()
    formData.append('proof', file)
    return api.post(`/payments/${id}/proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// Check-in API
export const checkinAPI = {
  scan: (data) => api.post('/checkin/scan', data),
  getStats: (weddingId) => api.get(`/checkin/${weddingId}`),
  getLive: (weddingId) => api.get(`/checkin/${weddingId}/live`),
  undo: (weddingId, checkInId) => api.delete(`/checkin/${weddingId}/${checkInId}`)
}

// Coupon API
export const couponAPI = {
  validate: (code, amount) => api.post('/coupons/validate', { code, amount })
}

// Background API
export const backgroundAPI = {
  getAll: (params) => api.get('/backgrounds', { params }),
  upload: (file, name, category) => {
    const formData = new FormData()
    formData.append('background', file)
    if (name) formData.append('name', name)
    if (category) formData.append('category', category)
    return api.post('/backgrounds/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  addFromUrl: (data) => api.post('/backgrounds/from-url', data),
  delete: (id) => api.delete(`/backgrounds/${id}`)
}

// Print Order API
export const printOrderAPI = {
  getPricing: () => api.get('/print-orders/pricing'),
  calculate: (data) => api.post('/print-orders/calculate', data),
  create: (data) => api.post('/print-orders', data),
  getAll: () => api.get('/print-orders'),
  getOne: (id) => api.get(`/print-orders/${id}`),
  cancel: (id) => api.delete(`/print-orders/${id}`)
}

// Public API (unauthenticated) - uses /api/public routes
export const publicAPI = {
  getInvitation: (weddingSlug, invitationCode) => api.get(`/public/${weddingSlug}/${invitationCode}`),
  getWeddingInfo: (weddingSlug) => api.get(`/public/${weddingSlug}`),
  submitRSVP: (weddingSlug, invitationCode, data) => api.post(`/public/${weddingSlug}/${invitationCode}/rsvp`, data)
}

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getStats: () => api.get('/admin/dashboard'),
  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  testTelegram: (data) => api.post('/admin/settings/test-telegram', data),
  uploadSettingsLogo: (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api.post('/admin/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  deleteSettingsLogo: () => api.delete('/admin/settings/logo'),
  uploadPaymentLogo: (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api.post('/admin/settings/payment-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getWeddings: (params) => api.get('/admin/weddings', { params }),
  deleteWedding: (id) => api.delete(`/admin/weddings/${id}`),
  activateWedding: (id) => api.put(`/admin/weddings/${id}/activate`),
  getInvitationOrders: (params) => api.get('/admin/invitation-orders', { params }),
  approveInvitationOrder: (id) => api.put(`/admin/invitation-orders/${id}/approve`),
  rejectInvitationOrder: (id, reason) => api.put(`/admin/invitation-orders/${id}/reject`, { reason }),
  updateInvitationOrder: (id, data) => {
    if (data.status === 'APPROVED') return api.put(`/admin/invitation-orders/${id}/approve`);
    if (data.status === 'REJECTED') return api.put(`/admin/invitation-orders/${id}/reject`, { reason: data.reason });
    return Promise.reject(new Error('Invalid status'));
  },
  getLogs: (params) => api.get('/admin/logs', { params }),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  // Print Orders
  getPrintOrders: (params) => api.get('/admin/print-orders', { params }),
  getPrintOrder: (id) => api.get(`/admin/print-orders/${id}`),
  updatePrintOrderStatus: (id, data) => api.put(`/admin/print-orders/${id}/status`, data),
  getPrintLayoutInfo: (size) => api.get('/admin/print-layout/info', { params: { size } }),
  generatePrintLayoutPDF: (data) => api.post('/admin/print-layout/generate', data, { timeout: 120000 }), // 2 min timeout for PDF generation
  // Coupons
  getCoupons: (params) => api.get('/coupons', { params }),
  createCoupon: (data) => api.post('/coupons', data),
  updateCoupon: (id, data) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}`),
  // Templates
  getTemplates: (params) => api.get('/templates', { params: { ...params, all: 'true' } }),
  getTemplate: (id) => api.get(`/templates/${id}`),
  createTemplate: (data) => api.post('/templates', data),
  updateTemplate: (id, data) => api.put(`/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/templates/${id}`),
  uploadTemplateThumbnail: (id, file) => {
    const formData = new FormData()
    formData.append('thumbnail', file)
    return api.post(`/templates/${id}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadTemplatePreviewImages: (id, files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('previewImages', file))
    return api.post(`/templates/${id}/preview-images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  previewTemplate: (id, data) => api.post(`/templates/${id}/preview`, data)
}
