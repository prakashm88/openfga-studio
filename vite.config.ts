import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    // Ensure we generate a single bundle for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "reactflow", "axios", "html-to-image"],
        },
      },
    },
  },
});
