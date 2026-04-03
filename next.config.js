/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lnxrnvypvyxykofgiael.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-41587758c865498eae690b029e8a7f21.r2.dev',
      },
    ],
  },
}

module.exports = nextConfig
