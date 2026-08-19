import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: [
      ...configDefaults.exclude,
      'e2e/**',
      'src/services/__tests__/database.rules.spec.ts',
    ],
    root: fileURLToPath(new URL('./', import.meta.url)),
  },
})
