import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    build: { outDir: "dist" },
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api/image": {
          target: env.VITE_IMAGE_PROXY_TARGET || "http://127.0.0.1:3001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/image/, ""),
        },
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
