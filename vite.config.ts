import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // השורה הזו היא הקסם שגורם לאתר לעבוד ב-GitHub Pages
})