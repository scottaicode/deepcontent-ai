# Deep Content Creator Template

This application helps users create high-quality content based on in-depth research. It uses advanced AI research tools to generate comprehensive analysis that informs content creation.

## Research Flow

The research process works as follows:

1. **Research Setup**: Users provide details about their content needs, including:
   - Research topic
   - Business type
   - Target audience
   - Content type (social media, blog post, email, video script)
   - Platform (for social media)

2. **Research Generation**: The application uses the Perplexity API to generate comprehensive research based on the provided topic and context information.

3. **Research Results**: The research is displayed to the user, who can then proceed to content creation.

4. **Content Creation**: Based on the research, users can create high-quality content that is well-informed and targeted to their audience.

## Key Features

- **Comprehensive research**: In-depth analysis covering market trends, audience insights, strategic recommendations, and more
- **Platform-specific guidance**: Tailored best practices for different platforms
- **Clean, structured output**: Research formatted in Markdown for easy consumption
- **Seamless transition**: Move directly from research to content creation

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Perplexity API for deep research
- Claude API for research enhancement

## Getting Started

1. Clone this repository
2. Install dependencies with `npm install`
3. Add API keys to `.env.local`:
   ```
   PERPLEXITY_API_KEY=your_perplexity_api_key
   ANTHROPIC_API_KEY=your_claude_api_key
   ```
4. Run the development server with `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

API keys are required for the Perplexity and Claude API endpoints. You can get API keys from:
- [Perplexity](https://www.perplexity.ai/for-developers)
- [Anthropic](https://www.anthropic.com/api)

## Core Architecture: Research-Driven Content Generation

DeepContent follows a **research-driven content generation** approach, where all content formats and structures are determined by real-time research of current best practices, rather than using fixed, hardcoded templates. This ensures content remains up-to-date with the latest platform requirements and engagement strategies.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation of this architecture.

## Features

- Deep research on any topic using Perplexity API
- High-quality content generation with Claude 3.7 Sonnet
- Platform-specific best practices for 2024
- Support for various content types (Social Media Posts, Blog Posts, Emails, etc.)
- Export options for generated content (Copy, Export, PDF)
- Customizable content style, length, and formatting

## API Keys and Simulation Mode

If you don't have API keys set up, the application will run in simulation mode:

- Research will use sample data
- Content generation will use simulated Claude responses

While simulation mode is useful for testing, the quality will be significantly better with actual API keys.

## Troubleshooting

### API Key Issues

If you're experiencing issues with API connections:

1. Test API connectivity using the "Test Claude API" or "Test Perplexity API" buttons
2. Ensure your keys are correctly entered in `.env.local`
3. Check that the API service is active and your account has sufficient credits

### Content Issues

If the generated content isn't meeting expectations:

1. Make sure your API keys are valid and working
2. Provide more specific subject details and audience information
3. Check that the appropriate platform and content type are selected

## License

MIT

## Acknowledgements

- Next.js for the application framework
- Tailwind CSS for styling
- Various API providers for trend data

## X (Twitter) API Integration

The application supports trending topic research using the X (Twitter) API. To enable this feature:

1. Apply for X API access at [developer.twitter.com](https://developer.twitter.com)
2. Once approved, add your API credentials to the `.env.local` file:
   ```
   TWITTER_API_KEY=your_api_key_here
   TWITTER_API_SECRET=your_api_secret_here
   ```
3. Restart the application

While waiting for API approval, the application will use high-quality mock X trending data that's tailored to the selected business type. This provides a seamless experience even before API access is granted.

**Note:** X API access now requires a paid plan ($100/month), so we've designed the application to work effectively with either real or simulated X data.