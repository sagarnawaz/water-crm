import type { NextConfig } from "next";

// Cache Components is off: every screen shows the logged-in owner's live data, so a
// prerendered static shell adds Suspense boilerplate without making anything faster.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
