// vite.config.ts
// What: Vite's build configuration. The react() plugin enables JSX/TSX
// support and React's fast-refresh during development.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
