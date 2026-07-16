import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions default to a 1MB body limit - file uploads (Media,
      // campaign briefing docs) allow up to 25MB, so the limit needs raising
      // to match, with headroom for multipart boundary/header overhead.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
