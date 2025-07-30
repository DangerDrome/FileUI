import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  esbuild: {
    // Skip TypeScript type checking during build
    tsconfigRaw: {
      compilerOptions: {
        skipLibCheck: true
      }
    }
  }
});