import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export function validateProductionBuild(mode, envVars = process.env) {
  if (mode === 'production' && envVars.VITE_USE_MOCKS === 'true') {
    throw new Error(
      'Refused to build with VITE_USE_MOCKS=true in production. Mock API mode is strictly forbidden in production.',
    );
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  validateProductionBuild(mode, process.env);

  return {
    plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    testTimeout: 15000,
    pool: 'vmThreads',
  },
};
});
