import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/plane-tracker/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

