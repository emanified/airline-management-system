import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname), // Explicitly set root to D:\AirlineProject\frontend
  resolve: {
    alias: {
      // Define the alias '@' to point to the 'src' directory
      '@': path.resolve(__dirname, './src'), 
    },
  },
  server: {
    // Server configuration - runs from D: drive
    port: 5173,
    strictPort: false,
    host: true, // Allow external connections
  },
  build: {
    // Build output directory
    outDir: path.resolve(__dirname, 'dist'),
  },
});
