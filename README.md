# DeepContent AI

DeepContent AI is a powerful content creation platform powered by Claude 3.7 Sonnet and Perplexity research, designed to help you create high-quality, data-driven content for any platform.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fscottaicode%2Fdeepcontent-ai)

## Core Features

- **AI-Powered Research**: Generate comprehensive, up-to-date research on any topic using Perplexity AI
- **Content Creation**: Create optimized content for social media, blogs, emails, and videos
- **YouTube Transcript Analysis**: Extract insights from YouTube videos for content creation
- **Platform-Specific Optimization**: Tailored content formats for various platforms
- **Multi-language Support**: English and Spanish interfaces
- **Caching System**: Research caching with Vercel KV storage to improve performance and reliability
- **Image Editor & Text-to-Image**: (Coming Soon) Create and edit images using AI

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI Integration**: Claude 3.7 Sonnet, Perplexity API, Google Gemini
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Firestore, Vercel KV (for caching)
- **Deployment**: Vercel

## Deployment

DeepContent AI is designed for easy deployment on Vercel. For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/scottaicode/deepcontent-ai.git
   cd deepcontent-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with your API keys (see [API_KEYS.md](./API_KEYS.md) for details)

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Deploy to Vercel**
   Connect your GitHub repository to Vercel and deploy
   
6. **Enable Vercel KV Storage** (recommended)
   - From your Vercel dashboard, go to Storage
   - Create a new KV database
   - Add the provided environment variables to your project

## API Keys

DeepContent AI uses various API services. For a complete list and setup instructions, see [API_KEYS.md](./API_KEYS.md).

## Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [API_KEYS.md](./API_KEYS.md) - API key documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

## Features In Detail

### Research-Driven Content Generation

DeepContent uses real-time research to inform content creation, ensuring your content follows the latest best practices for each platform.

### Multi-Platform Support

Create content optimized for:
- Social Media (Facebook, Instagram, LinkedIn, Twitter/X, TikTok)
- Blogs and Articles
- Email Campaigns
- Video Scripts
- Business Presentations

### Content Customization

Adjust content style, length, calls-to-action, and more to match your brand voice.

### Research Caching and Reliability

The system uses Vercel KV storage to cache research results, improving performance and providing better reliability when API services experience timeouts or connection issues.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements

- Next.js for the application framework
- Tailwind CSS for styling
- Claude 3.7 Sonnet for content generation
- Perplexity for research capabilities
- Vercel KV storage for caching

## Technical Notes

*   **Internationalization (i18n):** This project uses Next.js App Router's built-in i18n features with locale-prefixed routing (e.g., `/en/...`, `/es/...`). 
    *   **Language Switching:** When implementing language switching components (like the one in the header), it's crucial to use `useRouter` from `next/navigation` and navigate to the full locale-prefixed path (e.g., `router.push('/es/current-path')`). 
    *   **Avoid:** Do not use direct DOM manipulation (`window.location.href`, `localStorage` for active locale state) to change languages, as this conflicts with Next.js routing and can cause inconsistent state or unnecessary reloads.
    *   **Persistence:** Use cookies (`language`, `preferred_language`) to store the user's language preference across sessions.