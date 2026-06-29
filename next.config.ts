import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
