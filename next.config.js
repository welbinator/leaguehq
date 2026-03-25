/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', 'avatars.githubusercontent.com'],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || require('./package.json').version,
    NEXT_PUBLIC_BUILD_SHA: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
  },
  // PWA headers
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
