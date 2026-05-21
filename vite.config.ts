import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" &&
      process.env.VITE_LOVABLE_TAGGER === "1" &&
      componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) return "react-vendor";
          if (id.includes("react-router")) return "react-router";
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("@radix-ui")) return "radix-ui";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("lucide-react")) return "lucide";
          if (id.includes("date-fns")) return "date-fns";
          return "vendor";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    /** Windows: default `forks` pool often hits `spawn UNKNOWN` / flaky workers. */
    pool: "threads",
    /**
     * Default `npm test` / `npm run test:run` skips plan-traceability matrix.
     * `npm run test:empty` — empty-boot / normalize / smoke (excludes seed + plan matrix).
     * `npm run test:seed` — seedProvenance, projectSmokeAllSeeds, appSeedBuilder only.
     */
    exclude: ["**/node_modules/**", "**/dist/**", "**/p0MandatoryMatrix.test.ts"],
  },
}));
