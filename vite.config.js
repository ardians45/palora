import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Saat development, request /api dan /_ diteruskan ke PocketBase (npm run backend),
// jadi frontend & backend terlihat satu alamat seperti di production.
const PB_TARGET = process.env.PB_URL || 'http://127.0.0.1:8090'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bisa dibuka dari HP di jaringan yang sama
    proxy: {
      '/api': { target: PB_TARGET, changeOrigin: true },
      '/_': { target: PB_TARGET, changeOrigin: true },
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 60000,
  },
})
