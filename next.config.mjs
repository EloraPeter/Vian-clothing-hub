/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qsxoycbgstdmwnihazlq.supabase.co',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/offline',
        destination: '/offline',
      },
    ];
  },
};

export default nextConfig;