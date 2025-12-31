import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 3006,
    strictPort: true,
    host: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
}));
