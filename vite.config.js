import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy PocketBase API calls through Vite dev server.
      // The browser on localhost often can't reach api.tochilka.app directly
      // (firewall / extension blocks). This proxy forwards calls via Node.js
      // which has no such restrictions.
      '/api-pb': {
        target: 'https://api.tochilka.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-pb/, ''),
        secure: true,
        // Long timeouts: generateDemoData creates 100+ records sequentially
        timeout: 120000,
        proxyTimeout: 120000,
      },
    },
  },
})
