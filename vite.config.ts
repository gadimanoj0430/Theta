import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase the chunk size warning limit (KB) to avoid noisy warnings for large bundles
    chunkSizeWarningLimit: 2000,
    // Custom Rollup options: manualChunks helps split large vendor bundles
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("react")) return "react-vendor";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@supabase") || id.includes("supabase")) return "supabase";
            if (id.includes("recharts")) return "charts";
            if (id.includes("tailwindcss")) return "tailwind";
            if (id.includes("@radix-ui")) return "radix";
            return "vendor";
          }
        },
      },
      plugins: [
        // Generates a visual analysis HTML at `dist/bundle-analysis.html`
        visualizer({ filename: "dist/bundle-analysis.html", title: "Bundle Analysis", template: "treemap" }),
      ],
    },
  },
}));
