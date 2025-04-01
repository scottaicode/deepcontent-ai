# DeepContent Architecture Documentation

## Core Application Architecture

DeepContent follows a research-driven content generation paradigm, where all content creation is informed by real-time research of current best practices. This document outlines the core architectural principles that should be maintained throughout development.

## Research-Driven Content Generation Flow

The fundamental flow that **must be preserved** in all future development:

1. **Research Phase** - Gather current best practices using Perplexity API
   - Dynamically determine formatting, structure, and approaches based on research
   - Research must include platform-specific, up-to-date best practices
   - No hardcoded content templates or formats

2. **Content Generation Phase** - Use Claude API with research data
   - Pass research data to Claude API
   - Let Claude determine content format based on research, not hardcoded templates
   - Allow for platform-specific variations informed by research

3. **Rendering Phase** - Display content with appropriate styling
   - Support flexible rendering of various content formats
   - Avoid assumptions about specific content structures

## Key Architectural Principles

1. **Research Over Templates**
   - Content structure and format should ALWAYS be determined by research
   - Avoid hardcoding specific content templates
   - Formats should be dynamically determined based on current best practices

2. **API Responsibility Separation**
   - Perplexity API: Responsible for research and determining best practices
   - Claude API: Responsible for content generation based on research
   - Frontend: Responsible for rendering content without assuming structure

3. **Future-Proof Content Rendering**
   - Content rendering should be adaptable to various formats
   - Never assume a specific content structure in the display logic
   - Support dynamic formatting based on content type and platform

## Technical Implementation

### Research Flow
```typescript
// In perplexity/research/route.ts
// 1. Build dynamic research prompt based on content type, platform, audience
const prompt = buildResearchPrompt(topic, context, sources);

// 2. Call Perplexity API to get current best practices
const research = await callPerplexityApi(prompt, apiKey);

// 3. Return structured research data
return { research, model: "perplexity-deep-research" };
```

### Content Generation Flow
```typescript
// In claude/content/route.ts
// 1. Receive research data and content parameters
const { researchData, contentType, platform, audience } = request;

// 2. Build prompt that includes research data
const promptText = buildPrompt(contentType, platform, audience, researchData);

// 3. Let Claude determine the best format based on research
const content = await callClaudeApi(promptText, apiKey);

// 4. Return the generated content
return { content };
```

### Frontend Rendering
```typescript
// In create/content/page.tsx
// 1. Render content with flexible styling
// 2. Support various content formats without assuming structure
```

## Anti-Patterns to Avoid

1. ❌ Hardcoding specific content templates or formats
2. ❌ Bypassing the research phase when generating content
3. ❌ Making assumptions about content structure in rendering logic
4. ❌ Adding fixed formatting rules that override research-based formats
5. ❌ Creating separate content generation paths that don't use research

## Testing the Architecture

When adding new features or making changes:

1. Verify research data is being used to determine content format
2. Confirm no hardcoded templates are being introduced
3. Test rendering with various content formats
4. Ensure all content generation paths follow the research-driven approach

This architecture documentation serves as the canonical reference for maintaining the research-driven content generation paradigm. All development should adhere to these principles. 