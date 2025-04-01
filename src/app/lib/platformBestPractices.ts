/**
 * Platform Best Practices Module
 * 
 * This module provides the latest best practices for different social media platforms
 * to help create more effective, "scroll-stopping" content that performs well with
 * current algorithms and user behaviors.
 */

interface BestPracticeData {
  contentFormats: string[];
  engagementTactics: string[];
  algorithmConsiderations: string[];
  optimalTiming: string[];
  visualElements: string[];
  captionStructure: string[];
  trendingFormats: string[];
}

interface PlatformBestPractices {
  [key: string]: BestPracticeData;
}

/**
 * Get best practices for a specific platform
 * @param platform The social media platform to get best practices for
 * @returns Object containing best practices data
 */
export function getPlatformBestPractices(platform: string): BestPracticeData {
  const bestPractices: PlatformBestPractices = {
    facebook: {
      contentFormats: [
        "Short-form video (60-90 seconds) optimized for mobile viewing",
        "Carousel posts for storytelling with multiple images",
        "Text-based posts with strong questions to drive comments",
        "Live video sessions for Q&A and direct engagement"
      ],
      engagementTactics: [
        "Ask specific questions in the first 2 lines of text",
        "Share relatable stories that encourage others to share theirs",
        "Create content that sparks debate (but avoid controversial topics)",
        "Use 'comment below' CTAs combined with a specific prompt"
      ],
      algorithmConsiderations: [
        "Meaningful interactions are weighted most heavily (comments > shares > reactions)",
        "Content that keeps users on Facebook receives algorithmic preference",
        "Posts that generate back-and-forth conversations get the most reach",
        "Native content (posted directly to Facebook) performs better than external links"
      ],
      optimalTiming: [
        "Tuesday-Thursday between 8-9am and 1-3pm",
        "3-5 posts weekly for optimal engagement without audience fatigue",
        "Space posts at least 24 hours apart",
        "Test posting when competition is lowest (often early morning or late evening)"
      ],
      visualElements: [
        "Square (1:1) or vertical (4:5) video formats perform 78% better than landscape",
        "High contrast colors that stand out in a crowded feed",
        "Human faces increase engagement by 38%",
        "Text overlay should be limited to 20% of image area"
      ],
      captionStructure: [
        "Front-load key message in first 5-10 words",
        "Keep most important content above the 'See more' cutoff",
        "Use line breaks for readability (avoid text walls)",
        "Consider emoji use for visual breaks (but don't overuse)"
      ],
      trendingFormats: [
        "Story-driven carousel posts with swipe-worthy content",
        "POV-style videos showing transformation or before/after",
        "Authentic behind-the-scenes content that humanizes brands",
        "Quick tip/hack videos delivering immediate value"
      ]
    },
    instagram: {
      contentFormats: [
        "Reels (7-15 seconds) with hook in first 1-2 seconds",
        "Carousel posts with educational content (6-10 slides optimal)",
        "Behind-the-scenes authentic content that humanizes brand/creator",
        "User-generated content repurposed with permission"
      ],
      engagementTactics: [
        "Use calls-to-action that encourage saving content (bookmarks)",
        "Create carousel posts with value worth saving for later",
        "Ask questions that prompt more than one-word answers",
        "Create content worth sharing to Stories (value, humor, or inspiration)"
      ],
      algorithmConsiderations: [
        "Save rate is now the strongest engagement signal (saves > shares > comments > likes)",
        "Content natively created in Instagram receives preferential distribution",
        "Consistent posting across formats (Feed, Stories, Reels) increases overall visibility",
        "Engagement in first 60 minutes heavily influences reach"
      ],
      optimalTiming: [
        "Tuesday, Wednesday, Thursday 11am-1pm and 7-9pm",
        "Weekends show higher engagement for lifestyle content",
        "Feed posts: 4-7 weekly for optimal growth",
        "Stories: 3-7 daily with interactive elements"
      ],
      visualElements: [
        "Vertical video (9:16) performs 30% better than square formats",
        "Bright, high-contrast imagery stops scrolling",
        "Clean, minimalist aesthetic with focused subject matter",
        "Consistent visual identity across posts (color palette, filters)"
      ],
      captionStructure: [
        "Optimal caption length: 138-150 characters for highest engagement",
        "Place most important content in first line before 'More' cutoff",
        "Use line breaks generously for readability",
        "Hashtag strategy: 5-9 relevant tags perform better than maximum 30"
      ],
      trendingFormats: [
        "Quick tutorial Reels with clear steps",
        "Day-in-the-life content showing authentic moments",
        "Aesthetic transformation videos (before/during/after)",
        "Educational carousel posts with save-worthy information"
      ]
    },
    linkedin: {
      contentFormats: [
        "Text-only posts with personal stories + business lessons",
        "Document/PDF carousel posts (5-8 slides)",
        "Short-form video (30-90 seconds) with professional insights",
        "Polls and surveys to drive engagement and gather insights"
      ],
      engagementTactics: [
        "Ask thought-provoking questions that showcase expertise",
        "Share personal failures/lessons that led to professional growth",
        "Create 'hot take' content that challenges conventional wisdom",
        "Tag relevant connections (sparingly) to extend reach"
      ],
      algorithmConsiderations: [
        "Initial engagement window (first 2 hours) determines broader distribution",
        "Comments from outside your network boost content visibility significantly",
        "Personal accounts receive approximately 30% higher reach than company pages",
        "Dwell time (how long people view your content) impacts algorithm"
      ],
      optimalTiming: [
        "Tuesday, Wednesday, Thursday 9-11am and 1-3pm",
        "2-5 posts weekly for professional audiences",
        "Early week posts (Monday/Tuesday) perform better for business content",
        "Engaging with commenters within 60 minutes increases visibility"
      ],
      visualElements: [
        "Professional-quality images that aren't stock photos",
        "Data visualizations and graphs (simple and clear)",
        "Text overlay should be minimal and readable at a glance",
        "Visual hierarchy with clear focal points"
      ],
      captionStructure: [
        "Posts between 1,300-1,600 characters with key points in first 210 characters",
        "Problem-solution-outcome format for highest engagement",
        "Use line breaks and bullet points for scannable content",
        "Avoid hyperlinking in initial post (add links in comments instead)"
      ],
      trendingFormats: [
        "Contrarian viewpoints on established business practices",
        "Document posts showing frameworks and methodologies",
        "Personal narrative + professional insight format",
        "Expert roundups and collaborative content"
      ]
    },
    twitter: {
      contentFormats: [
        "Tweet threads (4-7 tweets) for in-depth topics",
        "Single tweets with strong hooks and clear value",
        "Poll tweets to drive engagement and gather insights",
        "Visual tweets with infographics or data visualizations"
      ],
      engagementTactics: [
        "Ask specific questions that require thoughtful responses",
        "Share controversial (but not offensive) opinions",
        "Create open-ended prompts that invite diverse answers",
        "Reply to commenters quickly to boost conversation ranking"
      ],
      algorithmConsiderations: [
        "Reply-to-impression ratio is the strongest engagement signal",
        "Content generating multi-person conversations receives extended visibility",
        "Time spent viewing before engagement impacts future content distribution",
        "Threads perform better than extremely long single tweets"
      ],
      optimalTiming: [
        "Wednesday and Thursday 9am-11am and 1pm-3pm",
        "2-5 tweets daily for sustained visibility",
        "Spacing tweets at least 1-2 hours apart",
        "Real-time engagement with trending topics (within 10-15 minutes)"
      ],
      visualElements: [
        "Optimal image ratio: 1.91:1 (1200x628px)",
        "Bold, attention-grabbing visuals with minimal text",
        "GIFs receive 55% more engagement than static images",
        "Charts and data visualizations for credibility"
      ],
      captionStructure: [
        "Front-load value in first 45 characters (visible without expanding)",
        "Use line breaks sparingly but strategically",
        "Include relevant hashtags (1-2 maximum) within sentence structure",
        "End with clear CTA or question to prompt responses"
      ],
      trendingFormats: [
        "Insight-driven threads with numbered points",
        "Hot takes and contrarian viewpoints",
        "Real-time commentary on industry news",
        "Visual tweets breaking down complex concepts"
      ]
    },
    tiktok: {
      contentFormats: [
        "Hook-driven content with clear value proposition in first 2-3 seconds",
        "Storytelling format with conflict-resolution structure",
        "Educational content revealing 'insider' information",
        "Trend participation with unique twist related to brand/niche"
      ],
      engagementTactics: [
        "Create content that prompts 'stitch' or 'duet' responses",
        "Ask viewers to comment with specific answers or experiences",
        "Use text overlay to pose questions that drive comments",
        "Create 'part 1' content that builds anticipation for follow-ups"
      ],
      algorithmConsiderations: [
        "Watch time percentage is weighted more heavily than total views",
        "Video completion rate significantly impacts distribution",
        "Content with strong audience retention (low drop-off) gets boosted",
        "First video performance heavily influences subsequent video reach"
      ],
      optimalTiming: [
        "Tuesday through Saturday, 7-9pm local time",
        "1-3 videos daily for maximum algorithm favor",
        "Morning posts (6-9am) for business/educational content",
        "Evening posts (7-10pm) for entertainment content"
      ],
      visualElements: [
        "Vertical video (9:16) using full screen canvas",
        "High-contrast visuals with movement that captures attention",
        "Text placement in middle 70% of screen for maximum readability",
        "Quick cuts/transitions every 2-3 seconds to maintain interest"
      ],
      captionStructure: [
        "Keep captions short and punchy (under 150 characters)",
        "Use only 2-3 highly relevant hashtags",
        "Place hook question in caption to drive engagement",
        "End with clear CTA (comment, follow, share)"
      ],
      trendingFormats: [
        "POV/character-based short narratives",
        "Transition reveals showing transformation",
        "Quick educational content framed as 'things I wish I knew'",
        "Behind-the-scenes authentic glimpses of processes"
      ]
    },
    "market-analysis": {
      contentFormats: [
        "Comprehensive market size and growth metrics with 3-5 year projections",
        "Segment analysis breaking down market by relevant categories",
        "Competitive landscape overview with market share distribution",
        "Trend analysis with supporting data from multiple sources",
        "Geographic breakdown of market performance by region"
      ],
      engagementTactics: [
        "Begin with 1-2 unexpected findings that challenge conventional wisdom",
        "Include direct quotes from industry experts to add credibility",
        "Use clear comparative analyses (e.g., year-over-year, competitor vs. competitor)",
        "Incorporate voice-of-customer data to humanize market statistics",
        "Present both opportunities and threats in balanced analysis"
      ],
      algorithmConsiderations: [
        "Organize data to support skimmable content consumption",
        "Design for both digital viewing and potential printing",
        "Ensure all charts and graphs are accessible and understandable",
        "Structure content for both executive and detailed reading levels",
        "Include linkable sections for easy reference and sharing"
      ],
      optimalTiming: [
        "Quarterly updates to maintain relevance in fast-changing markets",
        "Annual comprehensive reports with detailed analysis",
        "Release timing aligned with industry fiscal reporting periods",
        "Strategic timing around major industry events or announcements",
        "Long-form reports released early in business week (Mon-Tues)"
      ],
      visualElements: [
        "Market share pie charts with competitor breakdown",
        "Line graphs showing market trends over 3-5 year periods",
        "Heat maps for geographic market intensity visualization",
        "Comparison tables with color-coding for quick insights",
        "Infographics summarizing key market dynamics"
      ],
      captionStructure: [
        "Clear, descriptive chart titles that communicate the main finding",
        "Concise data source citations directly under visualizations",
        "Explanatory captions highlighting 1-2 key insights from each figure",
        "Consistent formatting for all figure captions and references",
        "Limited jargon with clear explanations when necessary"
      ],
      trendingFormats: [
        "Interactive dashboards allowing stakeholders to explore data dimensions",
        "AI-enhanced predictive modeling with multiple scenarios",
        "Integration of real-time market data with historical trends",
        "Mobile-optimized reports with responsive visualizations",
        "Executive summaries with embedded micro-videos explaining key findings"
      ]
    },
    "competitor-research": {
      contentFormats: [
        "SWOT analysis for each major competitor",
        "Competitive positioning matrix with clear differentiation factors",
        "Detailed product/service comparison matrices",
        "Pricing strategy analysis with market positioning",
        "Digital presence and marketing strategy evaluation"
      ],
      engagementTactics: [
        "Start with actionable intelligence that can drive immediate decisions",
        "Include competitive response scenarios to potential strategies",
        "Provide clear opportunity gaps identified through competitor weaknesses",
        "Analyze competitor messaging and value propositions",
        "Include voice-of-customer feedback about competitor offerings"
      ],
      algorithmConsiderations: [
        "Structure content for different stakeholder needs (executive, marketing, product)",
        "Include executive summary with key actionable insights",
        "Ensure all comparisons use consistent metrics and evaluation criteria",
        "Design for both presentation and detailed reference formats",
        "Include linkable sections for team collaboration and discussion"
      ],
      optimalTiming: [
        "Quarterly core competitor updates",
        "Monthly tracking of fast-moving competitive metrics",
        "Rapid analysis following competitor product launches or announcements",
        "Annual comprehensive competitive landscape review",
        "Pre-strategic planning cycle comprehensive analysis"
      ],
      visualElements: [
        "Competitive positioning quadrant/matrix diagrams",
        "Radar/spider charts for multi-factor competitor comparisons",
        "Side-by-side visual product/feature comparisons",
        "Trend lines showing competitor performance over time",
        "Market share visualization with competitor breakdown"
      ],
      captionStructure: [
        "Objective, fact-based descriptions avoiding subjective language",
        "Clear methodology notes for how comparisons were developed",
        "Data sources and time periods clearly labeled",
        "Highlighting of significant gaps or advantages",
        "Consistent formatting for competitor names and attributes"
      ],
      trendingFormats: [
        "Dynamic competitor tracking dashboards with real-time updates",
        "AI-powered sentiment analysis of competitor customer feedback",
        "Scenario planning tools showing potential competitor responses",
        "Integrated competitive intelligence with internal strategic planning",
        "Video breakdowns of competitor product features and experiences"
      ]
    },
    "industry-trends": {
      contentFormats: [
        "Emerging technology impact analysis",
        "Regulatory environment changes and implications",
        "Consumer behavior shift analysis with supporting data",
        "Supply chain and operational trend evaluation",
        "Cross-industry convergence and disruption potential"
      ],
      engagementTactics: [
        "Open with most disruptive or surprising trend findings",
        "Include expert opinions from diverse industry perspectives",
        "Provide concrete examples of trends in action at leading companies",
        "Analyze potential business model implications of each trend",
        "Include clear timeline projections for trend development"
      ],
      algorithmConsiderations: [
        "Structure content to be valuable for 6-12 month strategic planning",
        "Include both short-term actionable insights and long-term strategic considerations",
        "Design for presentation sharing in executive settings",
        "Include search-optimized section headers for reference",
        "Structure content for both detailed reading and quick scanning"
      ],
      optimalTiming: [
        "Quarterly trend updates with fresh analysis",
        "Annual comprehensive trend forecasts",
        "Release aligned with industry planning cycles",
        "Post-major industry event analysis and implications",
        "Strategic timing before annual planning processes"
      ],
      visualElements: [
        "Trend impact matrices showing business implications",
        "Adoption curve projections for emerging technologies",
        "Heat maps showing trend intensity across industry segments",
        "Timeline visualizations for trend development stages",
        "Comparative visualizations of trend implications across business functions"
      ],
      captionStructure: [
        "Forward-looking statements with clear timeframe references",
        "Multiple scenario descriptions when future outcomes are uncertain",
        "Clear distinction between established and emerging trends",
        "Methodology and confidence level indicators for projections",
        "Sources and data collection periods clearly identified"
      ],
      trendingFormats: [
        "Scenario planning frameworks with multiple potential futures",
        "Interactive trend impact calculators",
        "Video interviews with industry thought leaders",
        "Real-time trend monitoring dashboards",
        "Quarterly webinars presenting updated trend analysis"
      ]
    },
    "consumer-insights": {
      contentFormats: [
        "Demographic and psychographic segmentation analysis",
        "Customer journey mapping with pain points and opportunities",
        "Voice-of-customer research with representative quotes",
        "Purchase decision factor analysis and prioritization",
        "Behavioral data analysis with clear patterns identified"
      ],
      engagementTactics: [
        "Begin with most surprising or counter-intuitive consumer findings",
        "Include direct customer quotes that illuminate key insights",
        "Provide clear personas with actionable characteristics",
        "Connect insights directly to product/service opportunities",
        "Show before/after potential based on insight implementation"
      ],
      algorithmConsiderations: [
        "Structure for multiple stakeholder needs (marketing, product, executive)",
        "Include both quantitative data and qualitative insights",
        "Design for presentation in strategic planning sessions",
        "Ensure privacy compliance in all customer data presented",
        "Include search-optimized section headers for reference"
      ],
      optimalTiming: [
        "Quarterly deep-dive into specific customer segments",
        "Annual comprehensive customer landscape analysis",
        "Post-major product launch customer feedback analysis",
        "Pre-strategic planning cycle insights compilation",
        "Seasonal analysis for cyclical purchasing behaviors"
      ],
      visualElements: [
        "Customer persona profiles with key attributes",
        "Journey maps showing emotional states and touch points",
        "Decision factor importance matrices",
        "Sentiment analysis visualizations across touchpoints",
        "Comparative visualizations between customer segments"
      ],
      captionStructure: [
        "Clear methodology notes for data collection",
        "Sample sizes and statistical confidence indicators",
        "Time periods for data collection clearly stated",
        "Demographic information for quoted customers (anonymized)",
        "Context information for customer quotes and feedback"
      ],
      trendingFormats: [
        "Interactive customer journey tools showing multidimensional data",
        "Video ethnography highlights with customer permission",
        "AI-powered sentiment analysis of customer feedback",
        "Real-time customer feedback dashboards",
        "Longitudinal studies showing changing customer preferences"
      ]
    },
    "academic-research": {
      contentFormats: [
        "Literature review with comprehensive citation analysis",
        "Methodology section with detailed research design",
        "Statistical analysis with significance testing",
        "Discussion section connecting findings to existing theory",
        "Future research directions with specific hypotheses"
      ],
      engagementTactics: [
        "Begin with clear research questions and their significance",
        "Include limitations section showing scientific rigor",
        "Reference seminal works in the field for credibility",
        "Connect abstract findings to practical implications",
        "Provide clear definitions of specialized terminology"
      ],
      algorithmConsiderations: [
        "Structure for both academic and practitioner audiences",
        "Include abstracts of different lengths (short and comprehensive)",
        "Design for both digital database indexing and print publication",
        "Include keywords optimized for academic database discovery",
        "Structure for citation and reference by other researchers"
      ],
      optimalTiming: [
        "Submission timing aligned with academic conference cycles",
        "Publication timing considering peer review processes",
        "Strategic release to coincide with related policy discussions",
        "Timing considering academic year and teaching cycles",
        "Release before grant funding cycles when applicable"
      ],
      visualElements: [
        "Statistical output tables formatted for academic standards",
        "Conceptual models showing relationships between variables",
        "Process diagrams for methodological clarity",
        "Data visualization adhering to scientific publication standards",
        "Citation network visualizations showing research positioning"
      ],
      captionStructure: [
        "Precise technical language following field conventions",
        "Statistical notation following APA or field-specific guidelines",
        "Detailed methodological notes for replicability",
        "Variable definitions and measurement approaches",
        "Statistical significance indicators following conventions"
      ],
      trendingFormats: [
        "Open science approaches with data and code repositories",
        "Preregistration of research protocols and hypotheses",
        "Mixed methods approaches combining qualitative and quantitative insights",
        "Interdisciplinary research spanning multiple domains",
        "Participatory research involving stakeholders throughout process"
      ]
    }
  };

  // Default to generic social media best practices if platform not found
  const platformKey = platform.toLowerCase();
  return bestPractices[platformKey] || createGenericBestPractices();
}

/**
 * Create generic best practices for when a specific platform isn't found
 */
function createGenericBestPractices(): BestPracticeData {
  return {
    contentFormats: [
      "Short-form video (under 90 seconds) optimized for mobile viewing",
      "Carousel/swipeable content for multi-part information",
      "Text-based posts with strong questions to drive comments",
      "Live video sessions for direct audience engagement"
    ],
    engagementTactics: [
      "Ask specific questions that encourage detailed responses",
      "Share authentic, relatable stories that prompt others to share",
      "Create content worth saving for later reference",
      "Use clear calls-to-action directing audience interaction"
    ],
    algorithmConsiderations: [
      "Active engagement (comments, saves, shares) outweighs passive engagement (likes, views)",
      "Content that keeps users on-platform receives preferential treatment",
      "Early engagement velocity impacts overall reach",
      "Native content outperforms external links across all platforms"
    ],
    optimalTiming: [
      "Tuesday through Thursday tend to show highest engagement",
      "Midday (11am-2pm) and evening (7-9pm) typically perform best",
      "Consistent posting schedule increases average engagement",
      "Platform-native scheduling tools often receive algorithmic preference"
    ],
    visualElements: [
      "Vertical (9:16) or square (1:1) formats optimize for mobile viewing",
      "High contrast visuals with clear focal points stop scrolling",
      "Human faces and expressions increase engagement across platforms",
      "Text overlay should be minimal and readable at a glance"
    ],
    captionStructure: [
      "Front-load key message in first sentence before any cutoff",
      "Use line breaks strategically to improve readability",
      "Include one clear call-to-action per post",
      "Balance informative and conversational tones"
    ],
    trendingFormats: [
      "Authentic, behind-the-scenes content that humanizes brands",
      "Educational quick-tips providing immediate value",
      "Narrative-driven content with clear story arcs",
      "Interactive content that prompts audience participation"
    ]
  };
}

/**
 * Format best practices data into a structured research format
 * @param platform The social media platform
 * @returns Formatted research string
 */
export function formatPlatformBestPractices(platform: string): string {
  const practices = getPlatformBestPractices(platform);
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
  
  return `## Current ${platformName} Best Practices (2025)

### Top-Performing Content Formats
${practices.contentFormats.map(item => `- ${item}`).join('\n')}

### Engagement Optimization Tactics
${practices.engagementTactics.map(item => `- ${item}`).join('\n')}

### Algorithm Considerations
${practices.algorithmConsiderations.map(item => `- ${item}`).join('\n')}

### Optimal Posting Strategy
${practices.optimalTiming.map(item => `- ${item}`).join('\n')}

### Visual Elements That Stop Scrolling
${practices.visualElements.map(item => `- ${item}`).join('\n')}

### Effective Caption/Content Structure
${practices.captionStructure.map(item => `- ${item}`).join('\n')}

### Trending Content Formats (2025)
${practices.trendingFormats.map(item => `- ${item}`).join('\n')}
`;
}

/**
 * Get concise best practices tips for a specific platform
 * @param platform The social media platform
 * @returns Object with short tips for quick reference
 */
export function getQuickBestPracticesTips(platform: string): string[] {
  const practices = getPlatformBestPractices(platform);
  
  // Create a condensed list of the most important tips
  const quickTips = [
    practices.contentFormats[0],
    practices.engagementTactics[0],
    practices.algorithmConsiderations[0],
    practices.optimalTiming[0],
    practices.visualElements[0],
    practices.captionStructure[0],
    practices.trendingFormats[0]
  ];
  
  return quickTips;
} 