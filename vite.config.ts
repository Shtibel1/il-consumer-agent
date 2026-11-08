import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/il-consumer-agent/',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname ?? '.', './src'),
    },
  },
})
