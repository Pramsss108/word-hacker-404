import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  base: './',
  clearScreen: false, // Don't clear terminal, let Tauri see logs
  server: {
    port: 3000,
    strictPort: true, // Ensure we only use port 3000
    watch: {
      // Ignore the Rust backend files to prevent unnecessary reloads
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
})
