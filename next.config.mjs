/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
    // Force include chromium-min bin files for the scraping API route
    outputFileTracingRoot: process.cwd(),
    outputFileTracingIncludes: {
      '/api/scrape-website': ['./node_modules/@sparticuz/chromium-min/bin/**'],
    },
  },
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
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPADATA_API_KEY: process.env.SUPADATA_API_KEY,
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY
  },
  // Ensure environment variables are correctly loaded
  publicRuntimeConfig: {
    // Will be available on both server and client
    NODE_ENV: process.env.NODE_ENV,
  },
  serverRuntimeConfig: {
    // Will only be available on the server side
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  },
  // Add headers configuration to prevent caching
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate"
          },
          {
            key: "Pragma",
            value: "no-cache"
          },
          {
            key: "Expires",
            value: "0"
          }
        ]
      }
    ];
  },
  async rewrites() {
    console.log("📋 Loading Next.js rewrites configuration");
    
    // Simplified configuration to avoid conflicts
    return [
      // Handle API routes directly with no rewrites
      // REMOVED: Redundant rewrite for /api/document-analysis/:path*
      // {
      //   source: "/api/document-analysis/:path*",
      //   destination: "/api/document-analysis/:path*",
      // },
      // REMOVED: Redundant rewrite for /api/document-analysis
      // {
      //   source: "/api/document-analysis",
      //   destination: "/api/document-analysis",
      // },
      {
        source: "/api/youtube/:path*",
        destination: "/api/youtube/:path*",
      },
      {
        source: "/api/youtube-direct/:path*",
        destination: "/api/youtube-direct/:path*",
      },
      // Conditional rewrite for OpenAI as fallback
      {
        source: "/api/:path*",
        destination: "https://api.openai.com/:path*",
        has: [
          {
            type: 'header',
            key: 'x-exclude-rewrite',
            value: '(?!.*)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
