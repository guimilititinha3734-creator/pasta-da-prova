import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // fotos de perfil do Google
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};

export default nextConfig;
