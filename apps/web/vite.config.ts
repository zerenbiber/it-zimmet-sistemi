import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Geliştirmede API'ye dev server üzerinden gidiliyor, CORS ile uğraşmaya gerek kalmıyor.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
