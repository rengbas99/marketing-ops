import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Ensure proper cache busting with content hashes
    rollupOptions: {
      output: {
        // Add timestamp to chunk file names for better cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Clear the output directory before building
    emptyOutDir: true,
    // Generate source maps for debugging (can disable in production)
    sourcemap: false
  },
  // Prevent caching during development
  server: {
    headers: {
      'Cache-Control': 'no-store'
    }
  }
})
