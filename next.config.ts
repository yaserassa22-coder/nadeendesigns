import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: "/internal-api/auth/:path*" },
      { source: "/api/account/:path*", destination: "/internal-api/customer/account/:path*" },
      { source: "/api/guest/:path*", destination: "/internal-api/customer/guest/:path*" },
      { source: "/api/accessory-items/:path*", destination: "/internal-api/catalog/accessory-items/:path*" },
      { source: "/api/bridal-robes/:path*", destination: "/internal-api/catalog/bridal-robes/:path*" },
      { source: "/api/categories/:path*", destination: "/internal-api/catalog/categories/:path*" },
      { source: "/api/dresses/:path*", destination: "/internal-api/catalog/dresses/:path*" },
      { source: "/api/gallery/:path*", destination: "/internal-api/catalog/gallery/:path*" },
      { source: "/api/veils/:path*", destination: "/internal-api/catalog/veils/:path*" },
      { source: "/api/worn-by-you/:path*", destination: "/internal-api/catalog/worn-by-you/:path*" },
      { source: "/api/bookings/:path*", destination: "/internal-api/booking/bookings/:path*" },
      { source: "/api/contact/:path*", destination: "/internal-api/booking/contact/:path*" },
      { source: "/api/waiting-list/:path*", destination: "/internal-api/booking/waiting-list/:path*" },
      { source: "/api/messages/:path*", destination: "/internal-api/platform/messages/:path*" },
      { source: "/api/notifications/:path*", destination: "/internal-api/platform/notifications/:path*" },
      { source: "/api/settings/:path*", destination: "/internal-api/platform/settings/:path*" },
      { source: "/api/store-settings/:path*", destination: "/internal-api/platform/store-settings/:path*" },
      { source: "/api/shipping-regions/:path*", destination: "/internal-api/platform/shipping-regions/:path*" },
      { source: "/api/shipments/:path*", destination: "/internal-api/platform/shipments/:path*" },
      { source: "/api/orders/:path*", destination: "/internal-api/orders/orders/:path*" },
      { source: "/api/admin/commerce/:path*", destination: "/internal-api/payments/admin/commerce/:path*" },
      { source: "/api/webhooks/payments/:path*", destination: "/internal-api/payments/webhooks/payments/:path*" },
      { source: "/api/cron/:path*", destination: "/internal-api/payments/cron/:path*" },
      { source: "/api/upload/:path*", destination: "/internal-api/uploads/upload/:path*" },
      { source: "/api/admin/administrators/:path*", destination: "/internal-api/admin-core/admin/administrators/:path*" },
      { source: "/api/admin/customer-auth/:path*", destination: "/internal-api/admin-core/admin/customer-auth/:path*" },
      { source: "/api/admin/customers/:path*", destination: "/internal-api/admin-core/admin/customers/:path*" },
      { source: "/api/admin/experience-features/:path*", destination: "/internal-api/admin-core/admin/experience-features/:path*" },
      { source: "/api/admin/experience-templates/:path*", destination: "/internal-api/admin-core/admin/experience-templates/:path*" },
      { source: "/api/admin/login/:path*", destination: "/internal-api/admin-core/admin/login/:path*" },
      { source: "/api/admin/me/:path*", destination: "/internal-api/admin-core/admin/me/:path*" },
      { source: "/api/admin/purchase-flows/:path*", destination: "/internal-api/admin-core/admin/purchase-flows/:path*" },
      { source: "/api/admin/store-settings/:path*", destination: "/internal-api/admin-core/admin/store-settings/:path*" },
      { source: "/api/admin/system-health/:path*", destination: "/internal-api/admin-core/admin/system-health/:path*" },
      { source: "/api/admin/backup-status/:path*", destination: "/internal-api/admin-core/admin/backup-status/:path*" },
      { source: "/api/admin/appointments/:path*", destination: "/internal-api/admin-ops/admin/appointments/:path*" },
      { source: "/api/admin/bookings/:path*", destination: "/internal-api/admin-ops/admin/bookings/:path*" },
      { source: "/api/admin/guests/:path*", destination: "/internal-api/admin-ops/admin/guests/:path*" },
      { source: "/api/admin/dashboard/:path*", destination: "/internal-api/admin-ops/admin/dashboard/:path*" },
      { source: "/api/admin/inbox-counts/:path*", destination: "/internal-api/admin-ops/admin/inbox-counts/:path*" },
      { source: "/api/admin/lifecycle/:path*", destination: "/internal-api/admin-ops/admin/lifecycle/:path*" },
      { source: "/api/admin/cleanup/:path*", destination: "/internal-api/admin-ops/admin/cleanup/:path*" },
      { source: "/api/admin/trash/:path*", destination: "/internal-api/admin-ops/admin/trash/:path*" },
      { source: "/api/admin/audit-logs/:path*", destination: "/internal-api/admin-ops/admin/audit-logs/:path*" },
      { source: "/api/admin/notifications/:path*", destination: "/internal-api/admin-ops/admin/notifications/:path*" },
      { source: "/api/admin/export/:path*", destination: "/internal-api/admin-reports/admin/export/:path*" },
      { source: "/api/admin/reports/:path*", destination: "/internal-api/admin-reports/admin/reports/:path*" },
      { source: "/api/admin/shipping/:path*", destination: "/internal-api/admin-reports/admin/shipping/:path*" },
      { source: "/api/admin/orders/:path*", destination: "/internal-api/admin-reports/admin/orders/:path*" },
      { source: "/api/admin/messages/:path*", destination: "/internal-api/admin-reports/admin/messages/:path*" },
      { source: "/api/admin/search/:path*", destination: "/internal-api/admin-reports/admin/search/:path*" },
    ];
  },
  experimental: {
    /** Large image uploads through /api/upload (videos use direct Cloudinary upload). */
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
