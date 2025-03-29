# YouTube API Endpoints

This directory contains API endpoints related to YouTube functionality.

## Available Endpoints

### `/api/youtube/transcript`

- **Method**: GET
- **Parameters**: 
  - `videoId`: The YouTube video ID to fetch the transcript for
- **Description**: Fetches the transcript for a YouTube video using the Supadata AI API.
- **Implementation**: `transcript/route.ts`
- **Documentation**: See `/docs/YouTube-Transcript-Feature.md` for detailed documentation.

## Environment Variables

These endpoints require the following environment variables:

```
SUPADATA_API_KEY=your_supadata_api_key
```

The API key should be a valid Supadata API key obtained from the [Supadata Dashboard](https://supadata.ai/).

## API Dependencies

- [Supadata AI API](https://supadata.ai/documentation/youtube/get-transcript) - For fetching YouTube transcripts 