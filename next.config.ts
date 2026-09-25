import type { NextConfig } from 'next'
import { networkInterfaces } from 'node:os'

/** Dev only: this machine's current LAN IPs (they change with Wi-Fi) plus any extra hosts from .env. */
function devOrigins(): string[] {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n!.address)
  const extra = (process.env.DEV_ALLOWED_ORIGINS ?? '').split(',').map((h) => h.trim()).filter(Boolean)
  return [...new Set(['127.0.0.1', ...lan, ...extra])]
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Browsers only honour these over HTTPS (they log a warning on plain-HTTP test addresses).
  ...((process.env.APP_URL ?? '').startsWith('https://')
    ? [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ]
    : []),
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The dev-only badge sits where the mobile call button lives.
  devIndicators: false,
  // Lets other devices on the network open the dev server by IP (comma-separated hostnames in .env).
  allowedDevOrigins: devOrigins(),
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/(dashboard|admin|r|unsubscribe|account)(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ]
  },
}

export default nextConfig
