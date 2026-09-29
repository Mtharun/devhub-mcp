import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // During development (npm run dev on port 5173), send /api calls to the DevHub API on port 4321.
    // The browser only talks to one origin, so no CORS setup is needed.
    proxy: {
      "/api": "http://localhost:4321",
    },
  },
});
