import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El front llama a la API FastAPI. En dev se hace proxy de /api -> API
// para evitar CORS; en prod se sirve detrás del mismo dominio.
// El puerto de la API se puede fijar con VITE_API_TARGET (default :8077).
// (En esta máquina :8000 y :5173 los ocupa otro proyecto — por eso 8077.)
const API_TARGET = process.env.VITE_API_TARGET || "http://127.0.0.1:8077";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
