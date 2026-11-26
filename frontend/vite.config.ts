/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the SPA calls /api/* on its own origin; Vite forwards to Rails.
    // API_PROXY_TARGET: only if Rails runs elsewhere (e.g. port 3000 is taken).
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Undo vi.spyOn / vi.stubGlobal after each test.
    restoreMocks: true,
    unstubGlobals: true,
  },
})
