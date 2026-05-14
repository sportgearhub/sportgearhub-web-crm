import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL;

  return {
    plugins: [react()],
    server: apiProxyTarget
      ? {
          proxy: {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: true,
            },
            '/connect': {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: true,
            },
          },
        }
      : undefined,
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
