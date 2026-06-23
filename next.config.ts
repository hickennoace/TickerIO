import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray lockfile in the home dir otherwise
  // confuses Turbopack's root inference.
  turbopack: {
    root: path.join(__dirname),
  },
  // Baseline security headers. A strict CSP is intentionally deferred — it needs
  // nonces for the inline theme script and an allowlist for the TradingView
  // widget + Google Fonts, and a wrong CSP would white-screen production.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
