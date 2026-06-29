import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent folder also has a package-lock.json; without this, Turbopack resolves
  // node_modules from the wrong directory and @ai-sdk/openai appears missing.
  turbopack: {
    root: projectRoot,
  },
  // The customer-email service reads its HTML templates at runtime via fs. This guarantees
  // Next traces them into the serverless function bundle (otherwise: ENOENT in production).
  outputFileTracingIncludes: {
    "/api/**": ["./src/features/emails/templates/**"],
  },
  async redirects() {
    const clientRoutes = [
      "demande",
      "devis",
      "partenaires",
      "contact",
      "notre-equipe",
      "mentions-legales",
      "confidentialite",
    ];

    return [
      { source: "/client", destination: "/", permanent: false },
      { source: "/connexion", destination: "/", permanent: false },
      { source: "/client/connexion", destination: "/", permanent: false },
      ...clientRoutes.map((route) => ({
        source: `/${route}`,
        destination: `/client/${route}`,
        permanent: false,
      })),
      ...clientRoutes.map((route) => ({
        source: `/${route}/:path*`,
        destination: `/client/${route}/:path*`,
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
