import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Word Hacker 404',
        short_name: 'WH404',
        description: 'AI-Powered Word Game & Vector Tools',
        theme_color: '#0b0b0d',
        background_color: '#0b0b0d',
        display: 'standalone',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024 // 50MB
      }
    })
  ],
  // base: '/', // Removed duplicate
  server: {
    port: 3001,
    strictPort: true,
    host: true,
    // Pre-transform critical entry files at server boot so first request is instant
    warmup: {
      clientFiles: [
        './index.html',
        './src/main.tsx',
        './src/App.tsx',
        './src/App.css',
        './src/index.css',
        './src/components/MatrixRain.tsx',
        './src/components/RawWatchdogIndicator.tsx',
      ],
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      // 'Cross-Origin-Embedder-Policy': 'require-corp' // Disabled to allow Google Auth Popup
    }
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      // 'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  build: {
    outDir: 'dist',
    // Sourcemaps OFF in production — saves ~26 MB of .map files from being
    // uploaded to GitHub Pages and (more importantly) served to users.
    // Re-enable temporarily only when debugging a live regression.
    sourcemap: false,
    // Drop console/debugger calls in prod — smaller bundle, faster parse.
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      external: ['wasm-vips'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lucide-react', 'clsx']
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger']
  },
  optimizeDeps: {
    exclude: ['wasm-vips']
  },
  worker: {
    format: 'es'
  }
})