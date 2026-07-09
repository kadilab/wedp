// Global light/dark theme controller.
//
// The `dark` class is applied on <html> (document root) so the theme applies to
// EVERY page — public site, auth, dashboard and admin — from a single source of
// truth. Tokens (--bg/--surface/--content/…) are defined for :root and .dark in
// index.css, so toggling this class re-themes the whole app.
//
// The stored preference key stays 'public-theme' for backward compatibility with
// visitors who already picked a theme on the public site.
import { useEffect, useState } from 'react'

const KEY = 'public-theme'

export function getStoredTheme() {
  if (typeof window === 'undefined') return null
  const s = localStorage.getItem(KEY)
  return s === 'dark' || s === 'light' ? s : null
}

/** Effective theme: stored choice → OS preference → light. */
export function resolvedTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = getStoredTheme()
  if (stored) return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Apply a theme to <html> without persisting. */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const isDark = theme === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

/** Persist + apply + broadcast so every mounted useTheme() hook updates. */
export function setTheme(theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }))
}

export function toggleTheme() {
  const next = resolvedTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

/** Call once at startup to sync <html> with the stored/OS preference. */
export function initTheme() {
  applyTheme(resolvedTheme())
}

/** React hook: current theme + toggle, kept in sync across all consumers. */
export function useTheme() {
  const [theme, setThemeState] = useState(resolvedTheme)

  useEffect(() => {
    const onChange = () => setThemeState(resolvedTheme())
    window.addEventListener('themechange', onChange)
    // Follow OS changes only while the user hasn't made an explicit choice.
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onMq = () => { if (!getStoredTheme()) setThemeState(resolvedTheme()) }
    mq?.addEventListener?.('change', onMq)
    return () => {
      window.removeEventListener('themechange', onChange)
      mq?.removeEventListener?.('change', onMq)
    }
  }, [])

  return {
    theme,
    isDark: theme === 'dark',
    toggle: () => setThemeState(toggleTheme()),
    setTheme: (t) => { setTheme(t); setThemeState(t) },
  }
}
