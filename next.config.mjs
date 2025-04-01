/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse']
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
  async rewrites() {
    console.log("📋 Loading Next.js rewrites configuration");
    
    // Simplified configuration to avoid conflicts
    return [
      // Handle API routes directly with no rewrites
      {
        source: "/api/document-analysis/:path*",
        destination: "/api/document-analysis/:path*",
      },
      {
        source: "/api/document-analysis",
        destination: "/api/document-analysis",
      },
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
