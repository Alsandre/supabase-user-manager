import {defineConfig} from "vite";
import dts from "vite-plugin-dts";
import {resolve} from "path";

export default defineConfig({
  // Development server configuration
  root: "test-app",
  publicDir: "../public",

  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*"],
      exclude: ["src/**/*.test.ts", "test-app/**/*"],
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
