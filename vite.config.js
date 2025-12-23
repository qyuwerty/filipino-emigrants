import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default {
  server: {
    host: 'localhost',
    port: 5173,
    hmr: {
      host: 'localhost',
      port: 5173
    }
  }
}