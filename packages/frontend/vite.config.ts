import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL?.replace(/\/+$/, '');
  const api = apiUrl ? new URL(apiUrl) : null;
  const apiPrefix = api?.pathname.replace(/\/$/, '') ?? '';

  return {
    plugins: [react()],
    server: {
      proxy: api
        ? {
            '/api': {
              target: api.origin,
              changeOrigin: true,
              rewrite: (path) => `${apiPrefix}${path.replace(/^\/api/, '')}`
            }
          }
        : undefined
    }
  };
});
