// Resolves an asset path returned by the API (e.g. "/uploads/xyz.png") into a
// URL the browser can load. Backend-served uploads live on the API origin, not
// the frontend origin, so relative paths must be prefixed with the API base.
// Absolute (http) and inline (data:) URLs are returned unchanged.
const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export function resolveAssetUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return `${apiBase}${url}`;
}
