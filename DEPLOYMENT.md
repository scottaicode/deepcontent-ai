# Deployment Guide for DeepContent AI

This guide provides step-by-step instructions for deploying DeepContent AI to Vercel.

## Prerequisites

Before deployment, ensure you have:

1. A GitHub account
2. A Vercel account linked to your GitHub
3. All required API keys (see [API_KEYS.md](./API_KEYS.md) for details)

## Deployment Steps

### 1. Fork or Push to GitHub

- Fork the repository to your GitHub account
- OR push your local repository to GitHub:
  ```bash
  git remote add origin https://github.com/scottaicode/deepcontent-ai.git
  git branch -M main
  git push -u origin main
  ```

### 2. Connect to Vercel

1. Log in to your Vercel account
2. Click "Add New..." and select "Project"
3. Import your GitHub repository (deepcontent-ai)
4. Configure the project with the following settings:

   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: (leave as default)
   - **Output Directory**: (leave as default)
   - **Environment Variables**: Add all required API keys and configurations

### 3. Configure Environment Variables

Add the following environment variables to your Vercel project settings:

| Variable | Description |
|----------|-------------|
| ANTHROPIC_API_KEY | Your API key from Anthropic |
| PERPLEXITY_API_KEY | Your API key from Perplexity |
| GEMINI_API_KEY | Your API key from Google AI Studio |
| OPENAI_API_KEY | (Optional) Your API key from OpenAI |
| SUPADATA_API_KEY | Your API key for YouTube transcript functionality |
| DEEPGRAM_API_KEY | Your API key for speech-to-text functionality |
| NEXT_PUBLIC_FIREBASE_API_KEY | Your Firebase API key |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Your Firebase auth domain |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Your Firebase project ID |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | Your Firebase storage bucket |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Your Firebase messaging sender ID |
| NEXT_PUBLIC_FIREBASE_APP_ID | Your Firebase app ID |

### 4. Deploy

1. Click "Deploy" in the Vercel dashboard
2. Wait for the build and deployment to complete
3. Once deployed, Vercel will provide a URL for your application

### 5. Verify Deployment

1. Visit your deployment URL
2. Test the core functionality:
   - Authentication
   - Research feature
   - Content generation
   - Dashboard operations

### 6. Custom Domain (Optional)

1. In your Vercel project, go to "Settings" > "Domains"
2. Add your custom domain and follow the verification process
3. Update DNS settings as instructed by Vercel

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Check the build logs in Vercel
2. Ensure all dependencies are properly specified in package.json
3. Verify that all required environment variables are set
4. Check that the Next.js configuration is correct

### API Connection Issues

If API connections fail:

1. Verify that all API keys are correctly set in the Vercel environment variables
2. Check that the APIs are functioning and your accounts are active
3. Ensure API requests are formatted correctly in the code

### Performance Issues

If the deployed application is slow:

1. Consider upgrading your Vercel plan for better performance
2. Optimize image assets and large dependencies
3. Enable caching where appropriate
4. Add appropriate HTTP caching headers

## Maintenance

### Updating the Application

1. Make changes to your GitHub repository
2. Vercel will automatically deploy new commits to the main branch
3. For manual deployments, use the "Redeploy" button in the Vercel dashboard

### Monitoring

1. Use Vercel Analytics to monitor performance and usage
2. Set up alerts for critical errors
3. Regularly check the deployment logs for warnings or errors

## Advanced Configuration

### Serverless Function Configuration

For API-heavy features like YouTube transcript analysis and document processing, you may need to adjust the serverless function configuration in `vercel.json`:

```json
{
  "functions": {
    "api/youtube/transcript/route.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### Scaling Considerations

As your user base grows:

1. Consider a paid Vercel plan for better performance
2. Implement caching strategies for frequently accessed data
3. Optimize resource-intensive operations
4. Consider using a Content Delivery Network (CDN) for static assets 