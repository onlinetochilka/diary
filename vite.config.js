import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /api-pb/* to PocketBase in dev to avoid browser CORS/SSL issues on localhost
      '/api-pb': {
        target: 'https://api.tochilka.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-pb/, ''),
        secure: true,
      },
    },
  },
})
