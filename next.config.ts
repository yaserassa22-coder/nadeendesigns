import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /** Large image uploads through /api/upload (videos use direct Cloudinary upload). */
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;