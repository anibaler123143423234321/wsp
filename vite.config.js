import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath, URL } from "node:url";
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', '**/*.{png,jpg,jpeg,svg,gif,webp}'],
      manifest: {
        name: 'Chat +34',
        short_name: 'Chat+34',
        description: 'Aplicación de Chat +34',
        theme_color: '#ffffff',
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
          }
        ]
      },
      workbox: {
        // Aumentar límite de tamaño para cachear archivos grandes (por defecto es 2MB)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/src/assets'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
            },
          }
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    global: "globalThis",
  },
  // HMR más robusto - evita que se trabe con cambios frecuentes
  server: {
    hmr: {
      overlay: false, // No mostrar overlay de errores (menos lag)
      timeout: 5000,  // Más tiempo para reconectar
    },
    watch: {
      usePolling: false,    // Usa eventos nativos del sistema
      interval: 300,        // Intervalo de polling si se activa
      ignored: ['**/node_modules/**', '**/.git/**'], // Ignorar carpetas pesadas
    },
  },
  build: {
    //  OPTIMIZACIÓN: Reducir tamaño del bundle
    rollupOptions: {
      output: {
        //  Dividir el código en chunks más pequeños
        manualChunks: {
          // Librerías de terceros grandes
          "vendor-react": ["react", "react-dom"],
          "vendor-socket": ["socket.io-client"],
          "vendor-ui": ["react-icons", "sweetalert2"],
          "vendor-utils": ["clsx", "emoji-picker-react"],
        },
      },
    },
    //  Aumentar el límite de advertencia de tamaño de chunk
    chunkSizeWarningLimit: 1000,
    //  Minificación más agresiva
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false, //  TEMP: Permitir console.log para debugging
      },
    },
  },
});
