import { create } from 'zustand'
import axios from 'axios'

// Point the browser tab favicon at the admin-configured logo. Falls back to the
// bundled /favicon.svg when no logo is set. Updates the <link rel="icon"> in
// place (creating it if missing) so the tab icon reflects the site branding.
function setFavicon(url) {
  if (typeof document === 'undefined') return
  const href = url || '/favicon.svg'
  let link = document.querySelector("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  // Let the browser infer the type from the file (logo may be PNG/JPG/SVG).
  link.removeAttribute('type')
  link.href = href
  // Also set the Apple touch icon for iOS home-screen / PWA.
  let apple = document.querySelector("link[rel='apple-touch-icon']")
  if (url) {
    if (!apple) {
      apple = document.createElement('link')
      apple.rel = 'apple-touch-icon'
      document.head.appendChild(apple)
    }
    apple.href = href
  }
}

const useSiteSettingsStore = create((set, get) => ({
  siteName: 'WeddingInvite Pro',
  siteLogo: null,
  logoHeight: 32,
  contactEmail: '',
  supportPhone: '',
  printServiceEnabled: false,
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
        printServiceEnabled: data.printServiceEnabled === 'true' || data.printServiceEnabled === true,
        loaded: true
      })
      // Update page title
      if (data.siteName) {
        document.title = `${data.siteName} - Invitations de Mariage Numériques`
      }
      // Update favicon to the configured logo
      setFavicon(data.siteLogo || null)
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
    setFavicon(logoUrl || null)
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
