/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
  },
  async redirects() {
    return [
      { source: '/', destination: '/admin', permanent: false },
    ];
  },
};

module.exports = nextConfig;
