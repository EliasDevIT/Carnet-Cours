import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Données locales (SQLite) : tout est rendu à la demande, pas de cache de composants.
  serverExternalPackages: ["node-ical"],
  experimental: {
    // Un export .ics d'une année entière dépasse souvent 1 Mo.
    serverActions: { bodySizeLimit: "20mb" },
  },
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
