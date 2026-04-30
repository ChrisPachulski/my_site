import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writingPrerender } from './scripts/prerender-writing.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), writingPrerender()],
})
