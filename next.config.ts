import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ['fluent-ffmpeg', 'adm-zip'],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    //ppr: true,
    //clientSegmentCache: true,
  }
};

export default withNextIntl(nextConfig);