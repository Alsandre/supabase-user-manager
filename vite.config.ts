import {defineConfig} from "vite";
import dts from "vite-plugin-dts";
import {visualizer} from "rollup-plugin-visualizer";
import {resolve} from "path";

export default defineConfig({
  // Development server configuration
  root: "test-app",
  publicDir: "../public",
  envDir: "../", // Look for .env files in the parent directory

  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*"],
      exclude: ["src/**/*.test.ts", "test-app/**/*"],
    }),
    visualizer({
      filename: "dist/bundle-analysis.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "UserManager",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["@supabase/supabase-js"],
      output: {
        globals: {
          "@supabase/supabase-js": "Supabase",
        },
      },
    },
    target: "es2020",
    minify: "esbuild",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@/types": resolve(__dirname, "src/types"),
      "@/core": resolve(__dirname, "src/core"),
      "@/services": resolve(__dirname, "src/services"),
      "@/utils": resolve(__dirname, "src/utils"),
    },
  },
});
