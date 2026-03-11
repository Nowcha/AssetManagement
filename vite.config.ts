/// <reference types="vite/client" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// vite-plugin-pwa は Sprint 6 で追加予定（serialize-javascript脆弱性が修正され次第）

// ESM環境でのsrcパス解決（@types/node不要）
const srcPath = new URL('./src', import.meta.url).pathname

export default defineConfig({
  base: '/AssetManagement/',
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': srcPath,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-data': ['dexie', 'zustand'],
          'vendor-form': ['react-hook-form', 'zod'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
      },
    },
  },
})
