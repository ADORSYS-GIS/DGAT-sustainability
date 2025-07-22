import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      srcDir: 'src',
      filename: 'custom-sw.js',
      strategies: 'injectManifest',
      injectRegister: false, // We register manually
      manifest: {
        name: 'DGAT Sustainability',
        short_name: 'DGAT',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#317EFB',
        icons: [
          {
            src: 'placeholder.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  server: {
    host: "::",
    port: 5173,
  },
});
