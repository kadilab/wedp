import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import { GOOGLE_CLIENT_ID } from './config/google'
import { initTheme } from './utils/theme'
import './index.css'

// Sync <html> with the stored/OS theme (the pre-paint script in index.html does
// this too; this keeps it correct across hot reloads and hard navigations).
initTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data feeling live: refetch when the user comes back to the tab or
      // reconnects, and treat data as stale after 30s so background navigation
      // pulls fresh data instead of showing minutes-old cached values.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgb(var(--surface))',
              color: 'rgb(var(--content))',
              border: '1px solid rgb(var(--border))',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
              borderRadius: '0.75rem',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
