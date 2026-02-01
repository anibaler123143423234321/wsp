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
      devOptions: {
        enabled: true,
        type: 'module',
      },
      strategies: 'injectManifest', // 🔥 Usar nuestro propio SW
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB para evitar error de build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp}'],
      },
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
      // injectManifest no usa 'workbox' config aquí, usa el sw.js
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
