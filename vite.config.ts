import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// URLs relativos permitem publicar o mesmo build em qualquer repositório do GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
})
