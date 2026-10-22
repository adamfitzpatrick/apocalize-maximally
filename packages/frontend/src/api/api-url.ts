const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ?? '';

/**
 * In dev, calls go to the Vite server and are proxied to VITE_API_URL.
 * That keeps a phone on the dev machine's address from being blocked by API CORS.
 */
export const apiUrl = import.meta.env.DEV ? '/api' : configuredApiUrl;

export function requireApiUrl(message: string): string {
  if (!configuredApiUrl) {
    throw new Error(message);
  }
  return apiUrl;
}
