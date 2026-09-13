import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        // Google account avatars returned in Supabase user_metadata.avatar_url.
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        // Signed URLs for update images in the private Supabase Storage bucket.
        protocol: "https",
        hostname: "yvczbsjlgebyhkhievyn.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
