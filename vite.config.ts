import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// The write token lives in the browser, so the page may only talk to the GitHub API.
// GitHub Pages cannot send response headers, hence a meta tag. Production build only:
// the dev server relies on inline scripts for hot reload.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  'connect-src https://api.github.com',
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

function cspMeta(): Plugin {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Served from GitHub Pages under the repository name.
  base: '/034_room-work-checklist/',
  plugins: [react(), tailwindcss(), cspMeta()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
