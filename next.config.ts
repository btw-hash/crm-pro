import type { NextConfig } from "next";

// The ERP window is served on the SAME domain under /erp — for the "Open in ERP"
// iframe modal (#286). The proxy target is ERP_BASE_URL (the same docker network as
// CRM<->ERP); on the demo this is mock-erp.
const ERP_PROXY = process.env.ERP_BASE_URL || "http://mock-erp:8108";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // microphone=(self) — needed for voice-to-act (#14); camera/geolocation are unused.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow dev-asset requests from tunnel domains (cloudflared/ngrok).
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok-free.dev", "*.loca.lt"],
  // Self-contained build for a minimal Docker image (next standalone).
  output: "standalone",
  // Don't advertise that this is Next.js.
  poweredByHeader: false,
  // Proxy the ERP window on the same domain (for the iframe modal, #286):
  //   /erp         → the ERP window (mock-erp root / a real ERP)
  //   /state.json → the window's live polling (it hits /state.json at the root)
  // The "Open in ERP" button is enabled via ERP_UI_URL=/erp.
  async rewrites() {
    return [
      { source: "/erp", destination: `${ERP_PROXY}/` },
      { source: "/state.json", destination: `${ERP_PROXY}/state.json` },
    ];
  },
  // Security headers. The app itself must never be embedded in a foreign iframe
  // (DENY), EXCEPT for the ERP window (/erp, /state.json) — it's embedded in our own
  // modal (#286) → SAMEORIGIN.
  async headers() {
    return [
      {
        source: "/((?!erp$|state\\.json$).*)",
        headers: [...SECURITY_HEADERS, { key: "X-Frame-Options", value: "DENY" }],
      },
      {
        source: "/erp",
        headers: [...SECURITY_HEADERS, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        source: "/state.json",
        headers: [...SECURITY_HEADERS, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
