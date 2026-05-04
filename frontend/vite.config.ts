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
      // Public-share HTML for crawlers — Spring Boot returns the page with
      // OG meta tags baked in so link-preview bots (Twitterbot, kakaotalk-scrap,
      // facebookexternalhit, Discordbot, etc.) see them without running JS.
      //
      // Human visitors are bypassed to Vite's index.html so the dev-server's
      // /@vite/client + /@react-refresh injections fire — without them the
      // plugin-react transform of .tsx files crashes (window.$RefreshReg$
      // undefined) and the page renders blank. In production the backend
      // serves the same HTML to everyone since the bundled <script> tag
      // doesn't need Vite's dev-only injections.
      '/u': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        bypass: (req) => {
          const ua = req.headers['user-agent'] || ''
          const isCrawler =
            /bot|crawler|spider|preview|facebookexternalhit|kakaotalk-scrap|Twitterbot|Discordbot|Slackbot|Applebot|LinkedInBot/i.test(
              ua,
            )
          // undefined → proxy to backend; '/index.html' → let Vite serve SPA.
          return isCrawler ? undefined : '/index.html'
        },
      },
    },
  },
})
