import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // Password reset moved to the shared account pages; emailed links keep working.
  async redirects() {
    return [
      {
        source: "/dashboard/forgot-password",
        destination: "/account/forgot-password",
        permanent: true,
      },
      {
        source: "/dashboard/reset-password/:key",
        destination: "/account/reset-password/:key",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
