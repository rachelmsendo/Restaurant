/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  reactStrictMode: true,

  poweredByHeader: false,

  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;