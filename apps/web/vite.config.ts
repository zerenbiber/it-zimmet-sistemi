import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the API is reached through the dev server, so no CORS round-trips are needed.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
