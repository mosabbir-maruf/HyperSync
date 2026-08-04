import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import fs from "node:fs"

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Uses BACKEND_URL from your environment variables (.env locally, or Cloudflare Dashboard in prod)
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8787" // default to local wrangler dev server

  return {
    base: process.env.VITE_PUBLIC_URL
      ? `${process.env.VITE_PUBLIC_URL}/`
      : "/",
    build: {
      sourcemap: emitSourcemaps ? "inline" : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'cloudflare-redirects',
        writeBundle() {
          const redirectsPath = path.resolve(import.meta.dirname, 'dist', '_redirects');
          if (process.env.BACKEND_URL) {
            const rule = `/api/* ${process.env.BACKEND_URL}/:splat 200\n`;
            const existing = fs.existsSync(redirectsPath) ? fs.readFileSync(redirectsPath, 'utf-8') : '/* /index.html 200\n';
            fs.writeFileSync(redirectsPath, rule + existing);
            console.log(`\n[Vite Plugin] Injected proxy rule into _redirects targeting ${process.env.BACKEND_URL}`);
          } else {
            console.warn('\n[Vite Plugin] No BACKEND_URL provided, skipping proxy rule injection in _redirects.');
          }
        }
      }
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
