import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    license: true,
    rolldownOptions: { output: { comments: { legal: true } } },
  },
});
