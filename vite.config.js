import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: true,
      mangle: true,
      keep_classnames: false,
      keep_fnames: true,
      toplevel: false,
    }
  },
  test: {
    globals: true,               // Allows usage of global test APIs
    environment: 'jsdom',        // Use jsdom for browser-like testing
    css: true,                   // Enable CSS support for tests
  },

})
