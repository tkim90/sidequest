import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/image": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/image/, ""),
      },
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
