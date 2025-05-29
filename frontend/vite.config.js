// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Puerto del frontend
    proxy: {
      // Proxy de desarrollo para redirigir peticiones al backend (localhost:5001)
      "/uploads": "http://localhost:5001",
      "/upload": "http://localhost:5001",
      "/api": "http://localhost:5001", // solo si usas /api para otras rutas
    },
  },
});
