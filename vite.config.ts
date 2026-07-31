import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/my-website/' : '/',
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.{ts,tsx}'] },
}))
