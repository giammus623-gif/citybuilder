import { defineConfig } from 'vite';

// `--mode artifact` builds one self-contained script so the game can be inlined in a single page.
export default defineConfig(({ mode }) => ({
  base: './',
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output:
        mode === 'artifact'
          ? { inlineDynamicImports: true }
          : { manualChunks: { three: ['three'] } },
    },
  },
}));
