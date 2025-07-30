import { build } from 'vite';
import { resolve } from 'path';

// Build for production
await build({
  root: resolve(process.cwd()),
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html')
      }
    }
  }
});

console.log('Build complete! Output in dist/ folder');