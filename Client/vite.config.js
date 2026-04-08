import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  // Use environment variable or fallback to localhost
  const apiTarget =
    env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

  return {
    plugins: [
      react(),
      // Gzip compression
      compression({
        algorithm: "gzip",
        ext: ".gz",
      }),
      // Brotli compression
      compression({
        algorithm: "brotliCompress",
        ext: ".br",
      }),
      // Bundle analyzer (only in analyze mode)
      mode === "analyze" && visualizer({
        open: true,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
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
      // Optimize build
      target: "esnext",
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          drop_debugger: mode === "production",
        },
      },
      // Code splitting
      rollupOptions: {
        input: {
          main: "./index.html",
        },
        output: {
          entryFileNames: "assets/[name].[hash].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[hash].[ext]",
          // Manual chunks for better caching
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            charts: ["chart.js", "react-chartjs-2", "recharts"],
            firebase: ["firebase"],
            utils: ["axios", "framer-motion"],
          },
        },
      },
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      // Source maps for production debugging
      sourcemap: mode !== "production",
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
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
