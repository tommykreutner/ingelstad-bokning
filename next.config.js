/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tillåt iframe-inbäddning från ingelstad.nu
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://ingelstad.nu https://*.ingelstad.nu" },
        ],
      },
    ]
  },
}

module.exports = nextConfig
