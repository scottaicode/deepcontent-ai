# DeepContent API Keys Documentation

This document provides a comprehensive list of all API keys used in the DeepContent application, their purposes, and how to obtain them.

## Core API Keys

### 1. Anthropic Claude API
- **Environment Variable**: `ANTHROPIC_API_KEY`
- **Purpose**: Powers the content generation capabilities with Claude 3.7 Sonnet
- **Obtain from**: [Anthropic](https://www.anthropic.com/api)
- **Pricing**: Tiered pricing based on usage
- **Used in**: Content generation, research enhancement

### 2. Perplexity API
- **Environment Variable**: `PERPLEXITY_API_KEY`
- **Purpose**: Powers the deep research functionality with real-time web data
- **Obtain from**: [Perplexity](https://www.perplexity.ai/for-developers)
- **Format**: Keys begin with `pplx-`
- **Used in**: Research generation, trend analysis

## Image & Media Functionality

### 3. Gemini API
- **Environment Variable**: `GEMINI_API_KEY` (also referenced as `GOOGLE_AI_API_KEY`)
- **Purpose**: Image generation and other Gemini-powered features
- **Obtain from**: [Google AI Studio](https://makersuite.google.com/)
- **Note**: For image generation, access to the experimental `gemini-2.0-flash-exp-image-generation` model is required
- **Used in**: Image Editor, visual content generation

### 4. Supadata API
- **Environment Variable**: `SUPADATA_API_KEY`
- **Purpose**: YouTube transcript analysis functionality
- **Obtain from**: [Supadata](https://www.supadata.io/)
- **Used in**: YouTube transcript extraction and analysis

### 5. Deepgram API
- **Environment Variable**: `DEEPGRAM_API_KEY`
- **Purpose**: Speech-to-text transcription
- **Obtain from**: [Deepgram](https://deepgram.com/)
- **Used in**: Audio transcription features

### 6. OpenAI API
- **Environment Variable**: `OPENAI_API_KEY`
- **Purpose**: Alternative AI provider for specific features
- **Obtain from**: [OpenAI](https://openai.com/api/)
- **Used in**: Optional alternative AI provider

## Social & Integration APIs

### 7. Twitter/X API
- **Environment Variables**: `TWITTER_API_KEY` and `TWITTER_API_SECRET`
- **Purpose**: Integration with Twitter/X for trending topics
- **Obtain from**: [Developer Platform](https://developer.twitter.com)
- **Note**: Requires a paid plan ($100/month)
- **Used in**: Social media trend analysis
- **Alternative**: Application includes high-quality mock trending data when API is not configured

## Authentication & Storage

### 8. Firebase Configuration
- **Environment Variables**: 
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- **Purpose**: Authentication, database, and storage
- **Obtain from**: [Firebase Console](https://console.firebase.google.com/)
- **Used in**: User authentication, content storage

## Setup Instructions

To configure the API keys for your development environment:

1. Create a `.env.local` file in the root directory of your project
2. Add the required API keys in the following format:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   SUPADATA_API_KEY=your_supadata_api_key_here
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here (optional)
   TWITTER_API_KEY=your_twitter_api_key_here (optional)
   TWITTER_API_SECRET=your_twitter_api_secret_here (optional)
   
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. For production deployment on Vercel, add these environment variables in the Vercel project settings

## Security Best Practices

- Never commit API keys to your repository
- Use environment variables for all API keys
- Rotate API keys periodically
- Use appropriate scopes and permissions for each API
- Configure API key restrictions when possible (IP, referrer, etc.)
- Ensure `.env.local` is included in your `.gitignore` file

## Graceful Degradation

The application is designed to function in a limited capacity when certain API keys are not configured:

- Without Perplexity API: Research will use sample/mock data
- Without Claude API: Content generation will use simulated responses
- Without Twitter API: Trending topics will use simulated data
- Without image-related APIs: Image editing features will be disabled

## Optional API Services

### Vercel KV Storage (Recommended)

Vercel KV storage is used for caching research results, which improves performance and reliability.

1. **Create a KV database** from your Vercel dashboard under Storage
2. **Copy the environment variables** provided by Vercel
3. **Add to your project environment variables**:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

Without KV storage, caching will be disabled and the application may experience issues with long-running research requests.

### Google Gemini Pro (Optional)

Google Gemini API is used for some specific content generation tasks.

1. **Sign up** for Google AI Studio at [https://ai.google.dev/](https://ai.google.dev/)
2. **Create an API key**
3. **Add to environment variables** as `GOOGLE_GEMINI_API_KEY`

## API Usage and Limits

- **Anthropic Claude**: Check your usage limits in the Anthropic Console
- **Perplexity API**: Check your usage limits in your Perplexity account
- **Vercel KV Storage**: Free tier includes 50MB storage and 100K operations/month

## Troubleshooting

If you encounter API-related issues:

1. Verify your API keys are correct
2. Check your API usage limits
3. Ensure the environment variables are properly set
4. For KV-related issues, verify your Vercel KV instance is properly configured

For more help, refer to the official documentation for each service. 