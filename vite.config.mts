import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The root .env belongs to the Express server (secrets, NODE_ENV=development...).
// It is read here only to find the API port, and without touching process.env —
// letting Vite load it would make production builds use React's development bundle.
const serverEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
// process.env.PORT is deliberately ignored: dev tools/hosts often set it for the web server itself.
const apiPort = Number(process.env.API_PORT || serverEnv.PORT || 3000);
const devPort = Number(process.env.VITE_DEV_PORT || 5173);
if (apiPort === devPort) throw new Error(`API port and Vite dev port are both ${devPort}; set API_PORT or VITE_DEV_PORT.`);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: devPort,
    strictPort: true,
    // Same-origin in dev so the httpOnly session cookie works exactly as in production.
    proxy: { '/api': { target: `http://127.0.0.1:${apiPort}` } },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
