import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';
import withPWA from 'next-pwa';

// Here we use the @cloudflare/next-on-pages next-dev module to allow us to
// use bindings during local development (when running the application with
// `next dev`). This function is only necessary during development and
// has no impact outside of that. For more information see:
// https://github.com/cloudflare/next-on-pages/blob/main/internal-packages/next-dev/README.md
setupDevPlatform().catch(console.error);

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA configuration
  ...withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    // Add custom service worker configuration
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offlineCache',
          expiration: {
            maxEntries: 200
          }
        }
      }
    ],
    // Ensure database operations work offline
    fallbacks: {
      document: '/offline.html'
    }
  })({
    images: {
      unoptimized: true
    },
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true
    }
  })
};

export default nextConfig;
