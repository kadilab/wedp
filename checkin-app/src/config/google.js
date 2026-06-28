// Google OAuth client id. This is a PUBLIC value (the secret stays on the
// backend), so a hardcoded fallback is safe and keeps prod working without a
// build-time env var. Override with VITE_GOOGLE_CLIENT_ID if needed.
// Kept in sync with the main frontend (frontend/src/config/google.js).
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1060642017708-cl6l3h5krjl93otqhtnk3moiecemrh8m.apps.googleusercontent.com'
