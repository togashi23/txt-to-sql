import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    license: { fileName: 'licenses.md' },
    rolldownOptions: { output: { comments: { legal: true } } },
  },
});
