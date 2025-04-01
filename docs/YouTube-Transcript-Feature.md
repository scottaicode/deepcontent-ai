# YouTube Transcript Feature Documentation

## Overview

The YouTube Transcript feature allows users to fetch and incorporate transcripts from YouTube videos into their content research. This feature uses the Supadata AI API to retrieve transcripts from YouTube videos.

## Implementation Details

### Components

The feature consists of three main components:

1. **YouTubeTranscriptInput Component** (`src/components/YouTubeTranscriptInput.tsx`)
   - A React component that provides a user interface for inputting YouTube URLs
   - Handles user interactions, validation, and error display
   - Makes requests to the internal API endpoint

2. **YouTube Transcript API Endpoint** (`src/app/api/youtube/transcript/route.ts`)
   - A Next.js API route that handles requests from the client
   - Communicates with the Supadata AI API to fetch transcripts
   - Processes and formats the response data

3. **YouTube Transcript Service** (`src/app/lib/services/YouTubeTranscriptService.ts`)
   - Contains utility functions for working with YouTube URLs and transcripts
   - Extracts video IDs from various YouTube URL formats
   - Validates YouTube URLs
   - Formats transcripts for research purposes

### API Integration

The feature integrates with the Supadata AI API to fetch YouTube transcripts:

- **API Endpoint**: https://api.supadata.ai/v1/youtube/transcript
- **Authentication**: Requires an API key provided in the `x-api-key` header
- **Required Parameters**:
  - `url`: The YouTube video URL
  - `text`: Set to `true` to get plain text transcript

### Environment Variables

The feature requires the following environment variable:

```
SUPADATA_API_KEY=your_supadata_api_key
```

The API key should be a valid Supadata API key obtained from the [Supadata Dashboard](https://supadata.ai/).

## Usage

### How to Use the Feature

1. Navigate to the content creation page
2. Find the "Enhance Research with YouTube Content" section
3. Paste a YouTube video URL into the input field
4. Click the "Add Transcript" button
5. The transcript will be fetched and added to your research content

### Requirements

- The YouTube video must have captions/subtitles available
- A valid Supadata API key must be configured in the environment variables
- The application must have internet access to communicate with the Supadata API

## Troubleshooting

### Common Issues

1. **"No transcript available" error**
   - Cause: The YouTube video doesn't have captions/subtitles
   - Solution: Try a different video that has captions enabled

2. **API Key errors**
   - Cause: Missing or invalid Supadata API key
   - Solution: Ensure the correct API key is set in the `.env.local` file

3. **Connection errors**
   - Cause: Network issues preventing communication with the Supadata API
   - Solution: Check internet connection and verify that the Supadata API is operational

### Debug Logging

When troubleshooting, check the console logs for detailed information about:
- API request parameters
- Response status codes
- Error messages from the Supadata API

## API Reference

### Supadata API Documentation

For the most up-to-date information about the Supadata YouTube Transcript API, refer to the [official documentation](https://supadata.ai/documentation/youtube/get-transcript).

Key points from the documentation:

- The API requires an `x-api-key` header with a valid API key
- Either `url` or `videoId` parameter must be provided
- When `text=true`, the response will include:
  - `content`: The transcript text
  - `lang`: ISO 639-1 language code
  - `availableLangs`: List of available languages

## Example Code

### Fetching a Transcript (Internal API)

```typescript
const fetchTranscript = async (youtubeUrl) => {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  const response = await fetch(`/api/youtube/transcript?videoId=${videoId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch transcript');
  }
  
  const data = await response.json();
  return data.transcript;
};
```

### Formatting a Transcript

```typescript
const formatTranscript = (text, lang, url) => {
  const videoId = extractYouTubeVideoId(url);
  const langInfo = lang ? ` (${lang.toUpperCase()})` : '';
  
  return `## YouTube Transcript${langInfo}
Source: ${url}
Video ID: ${videoId}

${text}

[End of Transcript]`;
};
```

## Maintenance

When making changes to the YouTube transcript feature, ensure that:

1. The API integration follows the current Supadata API specifications
2. Error handling accounts for all potential error scenarios
3. The user interface provides clear feedback about the transcript fetching process
4. Documentation is updated to reflect any changes in implementation or usage

## Credits

This feature uses the [Supadata AI API](https://supadata.ai/) for fetching YouTube transcripts. 