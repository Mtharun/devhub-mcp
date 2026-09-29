import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Never inline small files as data: URLs; the server's Content Security Policy only allows files it serves itself
    assetsInlineLimit: 0,
  },
  server: {
    // During development (npm run dev on port 5173), send /api calls to the DevHub API on port 4321.
    // The browser only talks to one origin, so no CORS setup is needed.
    proxy: {
      "/api": "http://localhost:4321",
    },
  },
});
