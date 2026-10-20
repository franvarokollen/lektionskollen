import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// VITE_BASE is set by the Pages workflow ("/lektionskollen/"); "/" locally.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 5173,
    fs: { allow: ['.'] }, // allows importing supabase/functions/_shared from the app
  },
  build: {
    rollupOptions: {
      input: {
        harness: resolve(__dirname, 'index.html'), // mock FVK test harness
        embed: resolve(__dirname, 'embed.html'),   // the add-in FVK will iframe
      },
    },
  },
});
