import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-Server läuft im Container: n8n und Browser-Dienst sind über ihre Compose-Namen erreichbar.
const dienst = 'http://browser:3000'
const dienstPfade = [
  '/profil', '/pause', '/pause-status', '/lauf', '/einstellungen', '/anschreiben',
  '/unterlagen', '/cache-manuell', '/cache', '/missionfrei',
]

export default defineConfig({
  base: '/app/',
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/webhook': 'http://n8n:5678',
      ...Object.fromEntries(dienstPfade.map((p) => [p, dienst])),
    },
  },
})