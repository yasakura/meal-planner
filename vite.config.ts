import os from 'node:os';
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import qrcode from 'qrcode-terminal';

function qrCodePlugin(): PluginOption {
  return {
    name: 'meal-planner-qrcode',
    apply: 'serve',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address();
        if (!address || typeof address === 'string') return;
        const nets = os.networkInterfaces();
        const lanUrls: string[] = [];
        for (const list of Object.values(nets)) {
          for (const net of list ?? []) {
            if (net.family === 'IPv4' && !net.internal) {
              lanUrls.push(`http://${net.address}:${address.port}/`);
            }
          }
        }
        if (lanUrls.length === 0) {
          console.log('\n[QR] Aucune IP LAN détectée.\n');
          return;
        }
        const url = lanUrls[0];
        console.log(`\n📱 Scanne sur ton téléphone : ${url}\n`);
        qrcode.generate(url, { small: true });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    qrCodePlugin(),
    VitePWA({
      registerType: 'prompt',
      devOptions: { enabled: false },
      manifest: {
        name: 'Meal Planner',
        short_name: 'Meal Planner',
        description: 'Planificateur de repas familial',
        theme_color: '#FAF6EE',
        background_color: '#FAF6EE',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'fr',
        start_url: '/',
      },
    }),
  ],
});
