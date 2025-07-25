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
};

export default nextConfig;
