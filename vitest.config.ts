import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vitest config is separate from vite.config.ts so we can run tests without
// pulling in the dev server and the demo mock. 
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // `describe`/`it`/`expect` available without imports, like Jest.
    globals: true,
    // jsdom gives us window/document so component tests can render.
    environment: 'jsdom',
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./tests/unit/setup.ts'],
    // Allow CSS modules to be imported by components without throwing.
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      // App.tsx and main.tsx are pure wiring — covered by manual smoke,
      // not unit tests. i18n config and .d.ts files have no logic to cover.
      exclude: [
        'src/main.tsx',
        'src/App.tsx',
        'src/i18n/**',
        'src/**/*.d.ts',
        'tests/unit/**',
      ],
      // Spec asks for 70%+ — we sit closer to 90%.
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
