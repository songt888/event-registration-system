import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api to Express so the browser sees one origin (system SDS 1.2).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
