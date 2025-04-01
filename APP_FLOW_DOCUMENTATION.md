# DeepContent Application Flow Documentation

## Overview

DeepContent is a Next.js application that leverages AI to help users create high-quality content based on research data. The application follows a structured workflow that guides users through the process of content creation, from defining their requirements to generating and refining the final output.

## Application Architecture

### Directory Structure

- `/src/app`: Main application code
  - `/app/page.tsx`: Homepage
  - `/app/create`: Content creation flow pages
    - `/create/research`: Research generation page
    - `/create/content`: Content generation page
  - `/app/api`: API route handlers
    - `/api/claude`: Claude AI API routes
    - `/api/perplexity`: Perplexity API routes
    - `/api/anthropic`: Anthropic API routes
    - `/api/openai`: OpenAI API routes
    - `/api/replicate`: Replicate API routes
    - `/api/deepgram`: Deepgram API routes
  - `/app/components`: Shared React components
  - `/app/lib`: Utility functions and shared logic
    - `/lib/api`: API utility functions
    - `/lib/personaUtils.ts`: Persona enhancement utilities
    - `/lib/hooks`: Custom React hooks
    - `/lib/contexts`: React context providers
    - `/lib/firebase`: Firebase configuration and utilities

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API and custom hooks
- **AI Services**: 
  - Claude (Anthropic)
  - Perplexity
  - OpenAI
  - Replicate
  - Deepgram (audio transcription)
- **Backend Services**:
  - Firebase (Authentication, Database, Storage)

## Core User Flow

The application follows a sequential flow:

1. **User Authentication** (optional)
2. **Research Phase**
3. **Content Generation Phase**
4. **Content Refinement**
5. **Export/Save Content**

### 1. User Authentication

Users can optionally authenticate to save their work and access history:

- Sign in with email/password
- OAuth authentication (Google, etc.)
- Anonymous use is also supported

Authentication is managed through Firebase and the AuthContext:
- `src/lib/contexts/AuthContext.tsx`: Provides authentication state
- `src/lib/hooks/useAuth.ts`: Custom hook for authentication functions

### 2. Research Phase

The research phase collects information about the content topic:

1. **Research Input**: Users define their research topic, business type, etc.
2. **Research Method Selection**: Users choose between different research methods.
3. **Deep Research Generation**: The system generates comprehensive research using AI:
   - Call to Claude API for in-depth analysis
   - Call to Perplexity API for real-time information
   - Optional integration with trending topics

Key files:
- `src/app/create/research/page.tsx`: Main research interface
- `src/app/api/claude/research/route.ts`: Claude research API handler
- `src/app/api/perplexity/research/route.ts`: Perplexity research API handler

### 3. Content Generation Phase

The content generation phase transforms research into polished content:

1. **Content Specification**: Users define content type, platform, audience, etc.
2. **Style Selection**: Users select a persona and tone for their content
3. **Content Generation**: The system generates content using AI:
   - Call to Claude/Anthropic API
   - Apply persona enhancements
   - Format for the target platform

Key files:
- `src/app/create/content/page.tsx`: Main content generation interface
- `src/app/api/claude/content/route.ts`: Claude content API handler
- `src/app/lib/personaUtils.ts`: Persona enhancement utilities

### 4. Content Refinement

Users can refine and improve the generated content:

1. **Content Review**: Users review the initial content
2. **Feedback System**: Users provide feedback for improvement
3. **Content Refinement**: The system refines content based on feedback
4. **Version History**: Users can view and restore previous versions

Key files:
- `src/app/api/claude/refine-content/route.ts`: Content refinement API handler
- Components within `src/app/create/content/page.tsx` for feedback UI

### 5. Export/Save Content

Users can export or save their final content:

1. **Export Options**: Users choose export format (text, HTML, Markdown)
2. **Save to Account**: Users can save content to their accounts
3. **Copy to Clipboard**: Quick copy functionality

## Specialized Workflows

### YouTube Script Generation

1. **Research Phase**: Same as standard flow
2. **YouTube-Specific Inputs**: 
   - Optional YouTube transcript input for reference
   - YouTube-specific audience and format options
3. **Script Generation**: Structured for YouTube format
4. **Visualization Options**: Additional shot suggestions and visual cues

### Email Marketing Content

1. **Research Phase**: Same as standard flow
2. **Email-Specific Inputs**:
   - Subject line options
   - CTA placement
   - Email structure selection
3. **Email Generation**: Formatted for email marketing

## Data Flow

### Session Storage

The application uses browser session storage to maintain state between steps:

1. **Research Data Storage**: 
   - `research_results` key: Stores the generated research
   - `content_details` key: Stores user input about content requirements

2. **Content Storage**:
   - `generated_content` key: Stores the latest generated content
   - `content_versions` key: Stores version history

### API Integration Flow

1. **Client Request**: UI components collect user input
2. **API Request Preparation**: 
   - Combine user input with research data
   - Add necessary context and instructions
3. **API Call**: Send request to appropriate AI service
4. **Response Processing**:
   - Clean template language
   - Apply persona enhancements
   - Format for presentation
5. **Client Response**: Return enhanced content to UI

## Error Handling and Fallbacks

The application includes robust error handling:

1. **API Fallbacks**: If one AI service fails, the system can fallback to alternatives
2. **Sample Content**: Pre-defined sample content is available if all APIs fail
3. **Error Messaging**: User-friendly error messages guide users when issues occur
4. **Retry Mechanisms**: Automatic retry for transient errors

## Performance Considerations

1. **Streaming Responses**: API responses are streamed for better UX
2. **Caching**: Results are cached to minimize duplicate API calls
3. **Progressive Loading**: UI elements load progressively to improve perceived performance
4. **Optimized API Usage**: Prompts are optimized to minimize token usage

## Internationalization

The application supports multiple languages:

1. **Translation Context**: `src/lib/hooks/useTranslation.ts` provides translation functionality
2. **Locale Files**: `/public/locales` contains language-specific translations
3. **Persona Localization**: Personas support language-specific phrases
4. **Safe Translation**: `safeTranslate` function handles missing translations

## Testing

The application includes testing utilities:

1. **Persona Testing**: `/test-personas` route for testing persona enhancements
2. **API Testing**: Direct API testing through debug endpoints
3. **Unit Tests**: Jest-based unit tests for core functionality

## Future Expansion Areas

1. **Additional Content Types**: Expand to support more content formats
2. **Enhanced Persona System**: More personas and customization options
3. **Improved Research Integration**: Deeper integration with external data sources
4. **Collaborative Features**: Team-based content creation and review 