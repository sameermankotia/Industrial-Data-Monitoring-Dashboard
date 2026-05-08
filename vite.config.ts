import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

import { mockSelDevicePlugin } from './src/dev/mockServer';

// The real device sits at https://192.168.3.2 In
// dev we proxy /api there.
// VITE_API_TARGET lets us point at a different host without editing code.
const API_TARGET = process.env.VITE_API_TARGET ?? 'https://192.168.3.2';

// Set VITE_DEMO=1 to use the in-process mock instead of the real server for now.
// will change it when will get access to the real server.
const DEMO_MODE = process.env.VITE_DEMO === '1';

export default defineConfig({
  plugins: [
    react(),
    // Only register the mock middleware when demo mode is on. 
    // DEMO_MODE is false at build time.
    DEMO_MODE && mockSelDevicePlugin(),
  ].filter(Boolean) as PluginOption[],
  resolve: {
    alias: {
      // `@/services/...` instead of `../../services/...`.
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // In demo mode the mock plugin handles /api directly, so we skip the
    // HTTP proxy. Otherwise everything under /api forwards to the device.
    proxy: DEMO_MODE
      ? undefined
      : {
          '/api': {
            target: API_TARGET,
            changeOrigin: true,
            // Self-signed cert — accept it during dev. In production nginx
            // does the same with proxy_ssl_verify off.
            secure: false,
          },
        },
  },
  build: {
    outDir: 'dist',
    // Sourcemaps in production make stack traces from real users readable.
    sourcemap: true,
  },
});
