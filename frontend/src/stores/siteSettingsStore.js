import { create } from 'zustand'
import axios from 'axios'

const useSiteSettingsStore = create((set, get) => ({
  siteName: 'WeddingInvite Pro',
  siteLogo: null,
  logoHeight: 32,
  contactEmail: '',
  supportPhone: '',
  loaded: false,

  fetchSettings: async () => {
    // Only fetch once
    if (get().loaded) return
    try {
      const { data } = await axios.get('/api/settings/public')
      set({
        siteName: data.siteName || 'WeddingInvite Pro',
        siteLogo: data.siteLogo || null,
        logoHeight: parseInt(data.logoHeight) || 32,
        contactEmail: data.contactEmail || '',
        supportPhone: data.supportPhone || '',
        loaded: true
      })
      // Update page title
      if (data.siteName) {
        document.title = `${data.siteName} - Invitations de Mariage Numériques`
      }
    } catch {
      set({ loaded: true })
    }
  },

  updateSiteName: (name) => {
    set({ siteName: name })
    document.title = `${name} - Invitations de Mariage Numériques`
  },

  updateSiteLogo: (logoUrl) => {
    set({ siteLogo: logoUrl })
  },

  updateLogoHeight: (h) => {
    set({ logoHeight: h })
  },

  updateContactInfo: (contactEmail, supportPhone) => {
    set({ contactEmail, supportPhone })
  },

  refresh: () => {
    set({ loaded: false })
  }
}))

export default useSiteSettingsStore
