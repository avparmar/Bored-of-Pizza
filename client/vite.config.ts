import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/, so the deploy build sets BASE=/Bored-of-Pizza/.
export default defineConfig({
  base: process.env.BASE ?? '/',
});
