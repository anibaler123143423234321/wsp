import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
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
