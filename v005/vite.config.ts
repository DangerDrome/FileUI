import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    fs: {
      // Allow serving files from StyleUI directory
      allow: ['.', '/home/danger/Documents/GitHub/StyleUI']
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})