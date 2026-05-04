import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // API calls go to Spring Boot
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // OAuth flow lives on the backend; browser navigates here directly
      '/oauth2': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/login/oauth2': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // Public OG image bytes — fetched by social-media crawlers AND embedded
      // as a same-origin URL in the <meta og:image> tag of /u/* pages.
      '/og': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
