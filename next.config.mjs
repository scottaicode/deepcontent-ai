/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "replicate.com",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Explicitly use the Pages Router
  experimental: {
    appDir: false, // Disable App Router
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://api.openai.com/:path*",
      },
      // Add explicit handling for /create route
      {
        source: "/create",
        destination: "/create",
      },
      {
        source: "/create/:path*",
        destination: "/create/:path*",
      },
    ];
  },
  // Ensure trailing slashes are handled consistently
  trailingSlash: false,
  // Better error handling
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 4,
  },
  // Generate detailed output during build
  distDir: '.next',
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
