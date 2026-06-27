import type { NextConfig } from "next";

const securityHeaders = [
 { key: "X-Frame-Options", value: "DENY" },
 { key: "X-Content-Type-Options", value: "nosniff" },
 { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
 { key: "X-DNS-Prefetch-Control", value: "off" },
 {
  key: "Permissions-Policy",
  value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
 },
 {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload"
 }
];

const noStoreHeaders = [
 ...securityHeaders,
 { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
 { key: "Pragma", value: "no-cache" }
];

const nextConfig: NextConfig = {
 poweredByHeader: false,
 async redirects() {
  return [
   { source: "/connexion", destination: "/", permanent: false },
   { source: "/client/connexion", destination: "/", permanent: false }
  ];
 },
 async headers() {
  return [
   { source: "/:path*", headers: securityHeaders },
   { source: "/dashboard/:path*", headers: noStoreHeaders },
   { source: "/api/:path*", headers: noStoreHeaders }
  ];
 }
};

export default nextConfig;
