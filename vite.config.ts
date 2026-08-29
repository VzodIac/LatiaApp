import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  build: {
    rollupOptions: {
      // Mutfak ayrı bir sayfa: manifest ve iOS meta etiketleri HTML'in içinde
      // sabit durur. (Çalışma anında JS ile değiştirilen manifesti iOS
      // "Ana Ekrana Ekle" sırasında dikkate almıyor.)
      input: {
        main: resolve(__dirname, 'index.html'),
        servis: resolve(__dirname, 'servis.html'),
        kitchen: resolve(__dirname, 'kitchen.html'),
        yonetim: resolve(__dirname, 'yonetim.html'),
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    {
      // vite-plugin-pwa her HTML girişine ana manifesti ekliyor ve bunu
      // eklenti sırasından bağımsız olarak yaptığı için, mutfak sayfasındaki
      // fazladan bağlantıyı derleme bittikten sonra temizliyoruz. iOS ilk
      // gördüğü manifesti kullandığından tek ve doğru bağlantı kalmalı.
      name: 'own-manifest-links',
      closeBundle() {
        // Kendi manifesti olan sayfalardan ana manifest bağlantısını kaldır
        for (const name of ['kitchen.html', 'yonetim.html', 'index.html']) {
          const file = resolve(__dirname, 'dist', name);
          if (!existsSync(file)) continue;
          const html = readFileSync(file, 'utf-8').replace(
            /\s*<link[^>]+rel="manifest"[^>]+manifest\.webmanifest[^>]*>/g,
            '',
          );
          writeFileSync(file, html);
        }
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.png',
        'apple-touch-icon.png',
        'apple-touch-icon-kitchen.png',
        'apple-touch-icon-hub.png',
        'apple-touch-icon-admin.png',
        'kitchen.webmanifest',
        'hub.webmanifest',
        'admin.webmanifest',
      ],
      manifest: {
        id: '/servis',
        name: 'La Tía Servis',
        short_name: 'Servis',
        description: 'La Tía servis ekranı — sipariş alma ve masa takibi',
        start_url: '/servis',
        theme_color: '#AA2632',
        background_color: '#F7F2EC',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'tr',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // OCR çekirdeği ve dil modeli ~13 MB. Önbelleğe alınırsa her kurulum
        // bunu indirir; oysa yalnızca fiş okunduğunda gerekiyor. Tarayıcının
        // kendi HTTP önbelleği ilk indirmeden sonra saklıyor.
        globIgnores: ['ocr/**'],
        // /kitchen isteği index.html'e düşerse mutfak yerine adisyon açılır
        navigateFallbackDenylist: [/^\/kitchen/, /^\/servis/, /^\/yonetim/],
      },
    }),
  ],
});
