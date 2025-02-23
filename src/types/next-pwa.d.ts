declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface RuntimeCachingEntry {
    urlPattern: RegExp | string;
    handler: string;
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      networkTimeoutSeconds?: number;
      backgroundSync?: {
        name: string;
        options?: {
          maxRetentionTime?: number;
        };
      };
    };
  }

  interface PWAConfig {
    dest: string;
    register: boolean;
    skipWaiting: boolean;
    disable?: boolean;
    runtimeCaching?: RuntimeCachingEntry[];
    fallbacks?: {
      document?: string;
      image?: string;
      font?: string;
    };
  }

  export default function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
} 