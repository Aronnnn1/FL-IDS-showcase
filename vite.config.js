import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/FL-IDS-showcase/',
  plugins: [react()],
});
