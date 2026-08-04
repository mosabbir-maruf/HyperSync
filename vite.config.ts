import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "node:path"
import fs from "node:fs"

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === "development"
  // Uses BACKEND_URL from your environment variables (.env locally, or Cloudflare Dashboard in prod)
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8787" // default to local wrangler dev server

  return {
    base: process.env.VITE_PUBLIC_URL
      ? `${process.env.VITE_PUBLIC_URL}/`
      : "/",
    build: {
      sourcemap: emitSourcemaps ? "inline" : false,
      minify: !emitSourcemaps,
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react")) return "vendor-react"
              return "vendor"
            }
          },
        },
      },
    },
    esbuild: (emitSourcemaps ? undefined : {
      drop: ["console", "debugger"],
    }) as any,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'avatars/*', 'mosabbir-maruf.webp', 'og-image.svg'],
        manifest: {
          name: 'HyperSync',
          short_name: 'HyperSync',
          description: 'Lightning-fast peer-to-peer file transfer over your local network.',
          theme_color: '#cf4322',
          background_color: '#cf4322',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [
            /^\/api/ // VERY IMPORTANT: Do not intercept API requests
          ],
          runtimeCaching: [
            {
              // Do not cache API routes or websockets
              urlPattern: ({ url }) => url.pathname.startsWith('/api'),
              handler: 'NetworkOnly'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
      strictPort: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    preview: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
    },
  }
})
