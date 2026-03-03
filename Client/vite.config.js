import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  // Use environment variable or fallback to localhost
  const apiTarget =
    env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
      // Disable caching during development
      headers: {
        "Cache-Control": "no-store",
      },
    },
    build: {
      // Generate service worker and manifest with cache busting
      rollupOptions: {
        input: {
          main: "./index.html",
        },
        output: {
          entryFileNames: "assets/[name].[hash].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[hash].[ext]",
        },
      },
    },
    // PWA Configuration
    define: {
      __PWA_VERSION__: JSON.stringify(
        process.env.npm_package_version || "1.0.0",
      ),
      __PWA_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
  };
});
