import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // The browser talks to /api on this same origin; Vite forwards it to the backend (no CORS needed in dev).
    proxy: { '/api': 'http://localhost:4000' },
  },
});
