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
  async headers() {
    return [
      {
        // Applied to every route. The app renders no third-party content and
        // is never meant to be framed, so these are all safe to send broadly.
        source: "/:path*",
        headers: [
          // Without this the app can be loaded invisibly in someone else's
          // iframe and clicked through by the visitor (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Stops the browser second-guessing a declared Content-Type, which
          // is how an uploaded file gets re-interpreted as a script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
