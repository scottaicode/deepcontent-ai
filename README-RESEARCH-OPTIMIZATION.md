# Website Analysis Research Optimization

This document explains the enhancements made to the website analysis feature to optimize the extracted data for research purposes, particularly for integration with Perplexity Deep Research.

## Overview

The website analysis feature has been enhanced to provide structured, research-optimized data that maximizes information density while preserving context. This allows AI research tools like Perplexity to process the information more effectively.

## Key Enhancements

### 1. Research-Optimized Data Structure

The API now returns a `researchOptimized` object with the following structure:

```json
{
  "metadata": {
    "source": "https://example.com",
    "domain": "example.com", 
    "title": "Example Domain",
    "description": "...",
    "extractionDate": "2025-03-30T07:47:36.844Z",
    "pagesScraped": 1
  },
  "contentSummary": {
    "totalHeadings": 1,
    "totalParagraphs": 1, 
    "scrapedPages": ["https://example.com"]
  },
  "keyTopics": ["example", "domain"],
  "structuredContent": {
    "mainContent": [
      {
        "heading": "Example Domain",
        "content": ["This domain is for use in illustrative examples..."]
      }
    ],
    "aboutContent": "",
    "pricingInfo": "",
    "productInfo": "",
    "contactInfo": {
      "emails": [],
      "phones": [],
      "socialLinks": []
    }
  },
  "semanticEntities": {
    "organizations": [],
    "products": [],
    "locations": [],
    "people": [],
    "dates": [],
    "phoneNumbers": [],
    "emails": []
  }
}
```

### 2. Advanced Content Processing

We've implemented several advanced content processing functions:

1. **Key Topic Extraction**: Analyzes headings and content to identify and rank the most significant topics on the website
2. **Content Structuring**: Associates paragraphs with their relevant headings to maintain the content hierarchy
3. **Semantic Entity Extraction**: Identifies and extracts entities like phone numbers, email addresses, and more
4. **Hierarchical Organization**: Preserves the relationship between headings and their content

### 3. Research-Focused UI Enhancements

The user interface has been updated to:

1. **Display Key Topics**: Shows the automatically identified key topics in the website
2. **Present Structured Data**: Organizes the information in a hierarchical, easy-to-navigate format
3. **Extract Entities**: Highlights extracted entities like contact information
4. **Provide Research Format**: Offers a one-click option to copy content in an optimized format for research

### 4. Perplexity-Optimized Export Format

The "Copy Research Format" button generates a specially formatted version of the content that:

1. Starts with a summary of key metadata
2. Groups content by topic with clear headings
3. Preserves the hierarchical structure of the content
4. Formats the content in Markdown for maximum compatibility
5. Includes metadata about the extraction (source, date, etc.)

Example format:

```markdown
## Example Domain
Source: https://example.com

## Key Topics
example, domain

## Main Content

### Example Domain

This domain is for use in illustrative examples in documents. You may use this
domain in literature without prior coordination or asking for permission.

## Pages Analyzed

1. https://example.com

---
Extracted from example.com on 3/30/2025
```

## Implementation Details

1. **Backend Processing**: The API endpoint now processes extracted content through a series of specialized functions:
   - `optimizeForResearch()`: Main function that transforms raw data into research-optimized format
   - `extractKeyTopics()`: Identifies and ranks key topics
   - `structureContent()`: Creates hierarchical content structure
   - `extractSemanticEntities()`: Identifies entities in the content

2. **UI Enhancements**: The frontend component has been updated with:
   - New visualization of research-optimized data
   - Copy options for different data formats
   - Better organization of extracted content
   - Support for expanded entity information

## Benefits for Perplexity Deep Research

1. **Higher Information Density**: More structured data allows for better processing
2. **Context Preservation**: Hierarchical organization maintains relationships between content elements
3. **Entity Recognition**: Automatic extraction of important entities enhances research capabilities
4. **Metadata Enrichment**: Additional context about the source improves citation and verification
5. **Format Optimization**: The export format is designed to maximize compatibility with AI research systems

## Future Enhancements

Potential improvements for future versions:

1. **Sentiment Analysis**: Analyze the tone and sentiment of content
2. **Claim Extraction**: Identify specific claims made on the website
3. **Cross-Reference Support**: Enable cross-referencing between multiple analyzed websites
4. **Advanced Entity Linking**: Connect extracted entities to a knowledge base
5. **Temporal Analysis**: Identify time-related information and events 