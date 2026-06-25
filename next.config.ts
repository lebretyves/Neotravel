import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    const clientRoutes = [
      "demande",
      "devis",
      "connexion",
      "partenaires",
      "contact",
      "notre-equipe",
      "mentions-legales",
      "confidentialite",
    ];

    return clientRoutes.map((route) => ({
      source: `/${route}/:path*`,
      destination: `/client/${route}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;
