/**
 * Content Type Best Practices Module
 * 
 * This module provides the latest best practices for different content types
 * beyond social media platforms, such as blog posts, emails, and video scripts.
 */

interface ContentBestPracticeData {
  structure: string[];
  optimizations: string[];
  engagement: string[];
  technical: string[];
  trends: string[];
}

interface ContentTypeBestPractices {
  [key: string]: ContentBestPracticeData;
}

/**
 * Get best practices for a specific content type
 * @param contentType The content type to get best practices for
 * @returns Object containing best practices data
 */
export function getContentTypeBestPractices(contentType: string): ContentBestPracticeData {
  const bestPractices: ContentTypeBestPractices = {
    "blog-post": {
      structure: [
        "Use H2 and H3 headings to create a clear hierarchy (improves both readability and SEO)",
        "Optimal length: 1,500-2,500 words for comprehensive guides, 750-1,200 for standard posts",
        "Include a compelling introduction that states the problem and promises a solution",
        "Break content into scannable sections with descriptive subheadings",
        "End with a conclusion that summarizes key points and includes a clear call to action"
      ],
      optimizations: [
        "Include primary keyword in title, first paragraph, and at least one H2",
        "Use semantic keywords throughout to improve topical relevance",
        "Optimize meta description with a clear value proposition (150-155 characters)",
        "Include internal links to 3-5 relevant pages on your site",
        "Add optimized alt text to all images (include keywords where natural)"
      ],
      engagement: [
        "Address reader directly using 'you' language to create connection",
        "Include relevant statistics and research to build credibility",
        "Add visual elements every 300-350 words (images, charts, videos)",
        "Use storytelling elements to make complex information relatable",
        "Include questions throughout to prompt reader reflection"
      ],
      technical: [
        "Ensure mobile-friendly formatting with short paragraphs (3-4 lines max)",
        "Optimize image file sizes for fast loading (under 200KB per image)",
        "Use descriptive anchor text for all links",
        "Include schema markup for better search visibility",
        "Ensure reading level is appropriate (aim for 7th-9th grade for general audience)"
      ],
      trends: [
        "Expert roundups featuring multiple perspectives on a topic",
        "Interactive elements (quizzes, calculators, assessments)",
        "Data visualization of complex information",
        "Original research or surveys with unique insights",
        "Comprehensive 'ultimate guides' that thoroughly cover a topic"
      ]
    },
    "email": {
      structure: [
        "Concise, benefit-focused subject line (6-10 words optimal)",
        "Personalized greeting using recipient's name",
        "Clear, single-focus main message in first paragraph",
        "Scannable bullet points for key information",
        "Single, prominent call-to-action button"
      ],
      optimizations: [
        "Optimize preview text with compelling hook (40-130 characters)",
        "Use responsive design templates that work on all devices",
        "Maintain text-to-image ratio of 60:40 to avoid spam filters",
        "Keep email width between 600-640px for optimal display",
        "Include plain-text version alongside HTML for deliverability"
      ],
      engagement: [
        "Focus on one clear goal per email (don't try to accomplish multiple objectives)",
        "Use casual, conversational tone that sounds human",
        "Include social proof elements (testimonials, reviews, case studies)",
        "Ask questions to prompt mental engagement",
        "Create urgency with time-limited offers or deadlines"
      ],
      technical: [
        "Test emails across multiple devices and email clients before sending",
        "Include alt text for all images",
        "Use web-safe fonts for consistent display",
        "Optimize for dark mode compatibility",
        "Include unsubscribe link and physical address for CAN-SPAM compliance"
      ],
      trends: [
        "Interactive elements (AMP for email, quizzes, polls)",
        "User-generated content spotlights",
        "Personalized product recommendations based on behavior",
        "Minimalist design with focused messaging",
        "AI-powered send time optimization for individual recipients"
      ]
    },
    "video-script": {
      structure: [
        "Attention-grabbing hook in first 5-7 seconds",
        "Clear explanation of value proposition by 15-second mark",
        "Problem-solution-benefit structure for main content",
        "Strategic pattern interrupts every 40-60 seconds",
        "Strong call to action in final 10-15 seconds"
      ],
      optimizations: [
        "Script for natural, conversational delivery (150-170 words per minute)",
        "Include visual direction notes for key moments",
        "Front-load key information for audience retention",
        "Build in organic transitions between points",
        "Script for both audio and visual elements simultaneously"
      ],
      engagement: [
        "Address viewer directly using 'you' language",
        "Include open-ended questions to prompt viewer thought",
        "Use storytelling elements to illustrate key points",
        "Script moments of authentic emotion/reaction",
        "Include specific prompts for engagement (like, comment, subscribe)"
      ],
      technical: [
        "Script should note on-screen text for key points",
        "Include visual transitions and B-roll opportunities",
        "Note audio considerations (music, sound effects, tone shifts)",
        "Script with mobile viewing in mind (close-ups, large text)",
        "Include caption notes for accessibility"
      ],
      trends: [
        "Pattern interrupts using visual/audio transitions",
        "Data visualization of complex information",
        "Authentic, behind-the-scenes moments",
        "'Day in the life' perspective formats",
        "Tutorial-style content with clear step-by-step instructions"
      ]
    },
    "cold-outreach-email": {
      structure: [
        "Problem-focused subject line that avoids spam triggers (avoid ALL CAPS, excessive punctuation)",
        "Short, personalized greeting that doesn't feel templated",
        "Opening that immediately addresses a pain point the recipient likely has",
        "3-5 concise bullet points highlighting key benefits (not features)",
        "Single, low-commitment call to action (reply or brief consultation rather than purchase)"
      ],
      optimizations: [
        "Keep total length under 200 words for higher response rates",
        "Frontload value in the first 2-3 sentences (most important content first)",
        "Use language that focuses on the recipient, not yourself (more 'you', less 'we/I')",
        "Include specific numbers and data points to build credibility",
        "Optimize send time for business emails (Tuesday-Thursday, 10am-2pm)"
      ],
      engagement: [
        "Use questions that prompt the recipient to reflect on their current situation",
        "Include a brief success story or case study relevant to recipient's industry",
        "Address potential objections before they arise",
        "Use a friendly, helpful tone rather than salesy language",
        "Offer genuine value before asking for anything in return"
      ],
      technical: [
        "Ensure the email passes spam filter tests (avoid trigger words like 'free', 'guarantee', etc.)",
        "Use a professional email signature with minimal contact options",
        "Keep paragraphs to 1-3 lines for mobile readability",
        "Minimize images to ensure deliverability",
        "Test your subject line with tools like SubjectLine.com before sending"
      ],
      trends: [
        "Hyper-personalized outreach based on recent recipient activity or news",
        "Video thumbnails in email that link to personalized video messages",
        "Two-sentence email approach for initial contact (ultra-brevity)",
        "Pattern interrupt techniques that stand out from standard templates",
        "Sequential nurturing emails that build relationship before making asks"
      ]
    },
    "research-report": {
      structure: [
        "Include an executive summary (250-350 words) that highlights key findings and implications",
        "Use a clear hierarchy with H1, H2, and H3 headings to organize information logically",
        "Structure content with a methodology section describing research approach",
        "Include data visualization for complex information (charts, graphs, tables)",
        "Close with actionable recommendations and concrete next steps"
      ],
      optimizations: [
        "Use descriptive section headers that communicate key findings",
        "Structure content for both skimming (executive summary, section headers) and deep reading",
        "Include a table of contents for reports longer than 10 pages",
        "Add page numbers and proper citations for all data sources",
        "Ensure consistent formatting of similar elements throughout (tables, charts, figures)"
      ],
      engagement: [
        "Begin each section with the most important finding or implication",
        "Use real-world examples and case studies to illustrate key points",
        "Incorporate visual elements every 2-3 pages to break up text",
        "Highlight unexpected or counterintuitive findings to maintain interest",
        "Include expert quotes or insights to add authority and perspective"
      ],
      technical: [
        "Create a responsive design that works on both desktop and mobile devices",
        "Ensure charts and graphs are readable at different screen sizes",
        "Include alternative text for all visual elements for accessibility",
        "Use consistent typography hierarchy throughout the document",
        "Design with both digital viewing and potential printing in mind"
      ],
      trends: [
        "Interactive data visualizations allowing readers to explore findings",
        "Integration of primary research with AI-powered market analysis",
        "Scenario modeling showing multiple potential outcomes",
        "Benchmarking against industry standards with clear visual indicators",
        "Dynamic reports that can be filtered by the reader for personalized insights"
      ]
    }
  };

  // Default to generic content best practices if content type not found
  const contentTypeKey = contentType.toLowerCase().replace(/[^a-z-]/g, '');
  return bestPractices[contentTypeKey] || createGenericContentBestPractices();
}

/**
 * Create generic content best practices for when a specific type isn't found
 */
function createGenericContentBestPractices(): ContentBestPracticeData {
  return {
    structure: [
      "Start with a compelling headline or title",
      "Include a clear introduction that states the purpose",
      "Organize main content in logical sections",
      "Use visual elements to enhance understanding",
      "End with a clear conclusion and next steps"
    ],
    optimizations: [
      "Focus on audience-specific needs and pain points",
      "Use clear, concise language appropriate to audience",
      "Incorporate relevant keywords naturally",
      "Include credibility elements (data, experts, testimonials)",
      "Optimize for the platform where content will be published"
    ],
    engagement: [
      "Address audience directly using 'you' language",
      "Ask questions to prompt reflection and interaction",
      "Tell stories that illustrate key points",
      "Use examples relevant to your specific audience",
      "Include a clear call to action"
    ],
    technical: [
      "Ensure content is accessible to all users",
      "Optimize for mobile viewing experience",
      "Use proper formatting for readability",
      "Include metadata for better discoverability",
      "Test content on multiple devices before publishing"
    ],
    trends: [
      "Personalized content tailored to specific audience segments",
      "Interactive elements that encourage participation",
      "Visual storytelling components",
      "Data-driven insights and analysis",
      "Authentic, transparent messaging"
    ]
  };
}

/**
 * Format content type best practices into readable research
 * @param contentType The content type
 * @returns Formatted research string
 */
export function formatContentTypeBestPractices(contentType: string): string {
  const practices = getContentTypeBestPractices(contentType);
  const contentTypeName = contentType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return `## Current ${contentTypeName} Best Practices (2025)

### Effective Structure Elements
${practices.structure.map(item => `- ${item}`).join('\n')}

### Content Optimization Strategies
${practices.optimizations.map(item => `- ${item}`).join('\n')}

### Engagement Maximization Techniques
${practices.engagement.map(item => `- ${item}`).join('\n')}

### Technical Considerations
${practices.technical.map(item => `- ${item}`).join('\n')}

### Trending Approaches
${practices.trends.map(item => `- ${item}`).join('\n')}
`;
}

/**
 * Get quick tips for a specific content type
 * @param contentType The content type
 * @returns Array of top tips
 */
export function getQuickContentTypeTips(contentType: string): string[] {
  const practices = getContentTypeBestPractices(contentType);
  
  return [
    practices.structure[0],
    practices.optimizations[0],
    practices.engagement[0],
    practices.technical[0],
    practices.trends[0]
  ];
} 