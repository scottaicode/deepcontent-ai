# DeepContent AI - Static HTML Version

This is a simplified static HTML version of DeepContent AI deployed on Vercel. The goal of this deployment is to provide a reliable static site that avoids routing issues that were occurring in the Next.js version.

## Implementation Details

- Pure static HTML/CSS with Tailwind CSS (via CDN)
- No server-side rendering or client-side routing
- Direct HTML file references for navigation

## Files

- `public/index.html` - The home page
- `public/create.html` - The content creation page
- `vercel.json` - Configuration for Vercel static hosting

## Deployment

This site is deployed on Vercel using the following configuration:
- No build command (static files only)
- Output directory set to "public"
- Routes configured to handle clean URLs

## Troubleshooting

If you encounter 404 errors:
1. Make sure Vercel is configured to use the "public" directory
2. Check that all links use direct HTML file references (e.g., "create.html" instead of "/create")
3. Verify the vercel.json configuration includes proper route handling