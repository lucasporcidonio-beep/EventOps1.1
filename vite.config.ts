import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/events': 'http://localhost:3000',
      '/contracts': 'http://localhost:3000',
      '/professionals': 'http://localhost:3000',
      '/assignments': 'http://localhost:3000',
      '/checklists': 'http://localhost:3000',
      '/sub_events': 'http://localhost:3000',
      '/expenses': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
