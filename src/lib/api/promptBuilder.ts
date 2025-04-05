/**
 * Prompt Builder for Research API Calls
 * 
 * This module provides functions for constructing detailed prompts
 * for research-oriented API calls to Perplexity and other models.
 */

interface PromptOptions {
  audience?: string;
  contentType?: string;
  platform?: string;
  depth?: 'basic' | 'comprehensive';
  sources?: string[];
  additionalContext?: string;
  language?: string;
  companyName?: string;
  websiteContent?: any; // Add website content as an option
}

// Helper function to detect content type (business, personal_brand, expert, hobbyist)
function detectContentType(websiteContent: any, companyName: string): 'business' | 'personal_brand' | 'expert' | 'hobbyist' {
  // Default to business if we have a specific company name
  let detectedType: 'business' | 'personal_brand' | 'expert' | 'hobbyist' = 'business';
  
  if (!websiteContent) {
    return detectedType;
  }
  
  // Count signals for different content types
  let businessSignals = 0;
  let personalBrandSignals = 0;
  let expertSignals = 0;
  let hobbyistSignals = 0;
  
  // Check website title
  const title = websiteContent.title || '';
  if (title.toLowerCase().includes('coach') || 
      title.toLowerCase().includes('trainer') || 
      title.toLowerCase().includes('consultant') ||
      title.toLowerCase().includes('expert') ||
      title.toLowerCase().includes('specialist')) {
    personalBrandSignals += 2;
  }
  
  // Check for personal pronouns in content
  const allText = [
    ...(websiteContent.paragraphs || []),
    ...(websiteContent.headings || []),
    websiteContent.aboutContent || '',
  ].join(' ').toLowerCase();
  
  // Personal brand signals
  if (allText.includes('i help') || 
      allText.includes('my clients') || 
      allText.includes('my services') ||
      allText.includes('my approach') ||
      allText.includes('my philosophy')) {
    personalBrandSignals += 3;
  }
  
  // Expert signals
  if (allText.includes('research') || 
      allText.includes('publication') || 
      allText.includes('methodology') ||
      allText.includes('framework') ||
      allText.includes('approach')) {
    expertSignals += 2;
  }
  
  // Hobbyist signals
  if (allText.includes('recipe') || 
      allText.includes('craft') || 
      allText.includes('diy') ||
      allText.includes('hobby') ||
      allText.includes('passion')) {
    hobbyistSignals += 3;
  }
  
  // Business signals
  if (allText.includes('our team') || 
      allText.includes('our company') || 
      allText.includes('our products') ||
      allText.includes('founded in') ||
      allText.includes('our mission')) {
    businessSignals += 2;
  }
  
  // Check for pricing pages or ecommerce
  if (websiteContent.pricingInfo || 
      allText.includes('pricing') || 
      allText.includes('subscription') ||
      allText.includes('package')) {
    businessSignals += 2;
  }
  
  // Determine the content type based on highest signal count
  const signalCounts = [
    { type: 'business', count: businessSignals },
    { type: 'personal_brand', count: personalBrandSignals },
    { type: 'expert', count: expertSignals },
    { type: 'hobbyist', count: hobbyistSignals }
  ];
  
  console.log('Content type detection signals:', JSON.stringify(signalCounts));
  
  // Sort by count in descending order
  signalCounts.sort((a, b) => b.count - a.count);
  
  // If highest signal is significant enough, use that type
  if (signalCounts[0].count > 0) {
    detectedType = signalCounts[0].type as any;
  }
  
  console.log(`Detected content type: ${detectedType}`);
  return detectedType;
}

/**
 * Create a detailed research prompt for a given topic
 */
export function getPromptForTopic(topic: string, options: PromptOptions = {}): string {
  const {
    audience = 'general audience',
    contentType = 'article',
    platform = 'general',
    depth = 'comprehensive',
    sources = ['recent'],
    additionalContext = '',
    language = 'en',
    companyName = '',
    websiteContent = null
  } = options;
  
  // Get current date information
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const formattedDate = `${currentMonth} ${currentDate.getDate()}, ${currentYear}`;
  
  // Format sources as readable text
  const sourcesText = sources.map(s => {
    switch(s) {
      case 'recent': return 'recent information';
      case 'scholar': return 'scholarly articles';
      case 'news': return 'news sources';
      default: return s;
    }
  }).join(', ');
  
  // Detect content type to determine appropriate research structure
  const contentCreatorType = detectContentType(websiteContent, companyName);
  
  // Build the core prompt with stronger emphasis on using provided content
  let prompt = `====================
CRITICAL INSTRUCTION - YOU MUST USE THE PROVIDED USER DATA - DO NOT IGNORE THESE INSTRUCTIONS
====================

Your task is to conduct a ${depth === 'comprehensive' ? 'comprehensive' : 'basic'} analysis and deep research on the topic: "${topic}". 

MOST IMPORTANT: I HAVE PROVIDED YOU WITH VERIFIED DATA THAT MUST BE INCORPORATED INTO YOUR RESEARCH. This data SUPERSEDES any information you might find through your own searches, as it is authoritative and directly from the source.

TODAY'S DATE IS ${formattedDate}. Your research should be tailored for ${audience} who are looking for content on ${platform} in the form of a ${contentType}.

`;
  
  // Check if we have website content, and if so, make it extremely clear this must be used
  if (websiteContent) {
    prompt += createWebsiteDataPrompt(websiteContent, companyName);
  }
  
  // Check if we have additional research inputs and update the prompt
  if (additionalContext && additionalContext.trim()) {
    prompt += `
====================
ADDITIONAL USER-PROVIDED DATA - MUST USE THIS INFORMATION - PRIORITY #2
====================

`;

    // Special handling for follow-up answers to highlight them more clearly
    if (additionalContext.includes('Q:') && additionalContext.includes('A:')) {
      prompt += `FOLLOW-UP QUESTION ANSWERS (HIGHLY IMPORTANT USER INPUT):
${additionalContext}

These follow-up answers represent direct input from the user about their specific needs and goals. This information is critical for tailoring the research and MUST be incorporated into your analysis and recommendations.
`;
    } else {
      prompt += `${additionalContext}`;
    }

    prompt += `

The information above comes directly from the user and must be considered authoritative. You MUST incorporate insights from these inputs throughout your research.

====================`;
  }

  // Add content-type specific instructions based on the detected type
  if (companyName || websiteContent) {
    // Different header sections based on content type
    if (contentCreatorType === 'business') {
      prompt += createBusinessPrompt(companyName);
    } else if (contentCreatorType === 'personal_brand') {
      prompt += createPersonalBrandPrompt(companyName, websiteContent);
    } else if (contentCreatorType === 'expert') {
      prompt += createExpertPrompt(companyName, websiteContent);
    } else if (contentCreatorType === 'hobbyist') {
      prompt += createHobbyistPrompt(companyName, websiteContent);
    }
  }
  
  // Add explicit current date markers
  prompt += `
====================
RESEARCH REQUIREMENTS - FOLLOW EXACTLY
====================

Ensure ALL information reflects current best practices and trends as of TODAY (${formattedDate}). Any information or best practices from even 3-4 months ago should be clearly labeled as potentially outdated.

Use ${sourcesText} to ensure accuracy and relevance, STRICTLY PRIORITIZING data sources published within the last 90 days. For ALL statistics or platform-specific information, you MUST include the publication date (month/year) to verify recency.

CRITICAL REMINDER: THE USER-PROVIDED DATA (website content, transcript, image analysis, document content, follow-up answers) MUST BE YOUR PRIMARY SOURCES. They are verified, current, and directly relevant to the research needs.

YOUR RESEARCH MUST BE BASED ON AND DIRECTLY CITE:
1. The scraped website data I've provided above (HIGHEST PRIORITY SOURCE)
2. YouTube transcript (if provided)
3. Direct quotes from their website (use the scraped content I provided)
4. Document content analysis (if provided)
5. Image analysis insights (if provided)
6. Answers to follow-up questions (if provided)

`;

  // Create appropriate structure based on content type
  prompt += createResearchStructure(contentCreatorType, companyName, formattedDate, currentMonth, currentYear, platform);

  // Add language instruction (keep the original language handling)
  if (language === 'es') {
    prompt += `\n\nIMPORTANTE: Tu respuesta COMPLETA debe estar escrita en español. No uses inglés en absoluto. Esto incluye TODOS los encabezados, datos, estadísticas, citas y texto explicativo.`;
  } else if (language !== 'en') {
    prompt += `\n\nIMPORTANT: Your entire response MUST be written in ${language}. Do not use English at all. This includes ALL headings, data points, citations, and explanatory text.`;
  }

  // Add debug logging
  if (companyName) {
    console.log(`🔍 Generated research prompt for "${companyName}" as ${contentCreatorType} (${prompt.length} chars)`);
    // Log the first 200 chars and last 200 chars to avoid excessive logging
    console.log(`Prompt preview: ${prompt.substring(0, 200)}... [middle truncated] ...${prompt.substring(prompt.length - 200)}`);
  }
  
  return prompt;
}

// Helper function to create business-specific prompt
function createBusinessPrompt(companyName: string): string {
  return `
====================
COMPANY RESEARCH STRUCTURE REQUIREMENTS - FOLLOW EXACTLY
====================

This research ABSOLUTELY MUST focus heavily on company-specific information about "${companyName}". 

YOU MUST START YOUR RESEARCH WITH A SECTION TITLED:
===== ${companyName.toUpperCase()} COMPANY RESEARCH =====

This first section must be AT LEAST 500 WORDS LONG and contain ONLY information derived from:
1. The scraped website data I've provided above (HIGHEST PRIORITY SOURCE)
2. Any additional user-provided data I've given you

This section must contain:
1. Company overview with founding date, mission, and leadership 
2. Specific details about 2-3 of their main products/services with exact names and pricing
3. Direct quotes from their website (use the scraped content I provided)
4. Information about their unique approach or differentiators

CITATION REQUIREMENT: For EACH piece of company-specific information, you MUST explicitly state its source, such as:
- "According to ${companyName}'s official website..." (include direct quotes from the scraped data)
- "Based on the scraped data from ${companyName}'s website..."

AT LEAST 60% of your research MUST focus specifically on "${companyName}" - this is NON-NEGOTIABLE. For each section below, you MUST include specific information about "${companyName}" before discussing general industry trends.

FOR EVERY PRODUCT OR SERVICE mentioned, include at least 3 specific details such as:
- Exact product name (from the scraped website data)
- Price point (if available in the scraped data)
- Key ingredients or components (from the scraped data)
- Target audience (from the scraped data)
- Key benefits claimed by the company (from the scraped data)
- Unique selling propositions (from the scraped data)

If certain information is not available in the scraped data I provided, state this explicitly but still make your best effort to provide company-specific insights based on what IS available.

====================`;
}

// Helper function to create personal brand prompt (coaches, trainers, consultants, etc.)
function createPersonalBrandPrompt(creatorName: string, websiteContent: any): string {
  // Try to extract the creator's name if not provided
  let name = creatorName;
  if (!name && websiteContent?.title) {
    // Try to extract a name from the title
    const nameParts = websiteContent.title.split(/[\s\|\-–—]/);
    if (nameParts.length > 0) {
      name = nameParts[0].trim();
    }
  }
  
  const creatorTitle = detectCreatorTitle(websiteContent);
  
  return `
====================
PERSONAL BRAND RESEARCH STRUCTURE REQUIREMENTS - FOLLOW EXACTLY
====================

This research ABSOLUTELY MUST focus heavily on the creator's expertise, methodology, and offerings as a ${creatorTitle}.

YOU MUST START YOUR RESEARCH WITH A SECTION TITLED:
===== CREATOR PROFILE AND EXPERTISE =====

This first section must be AT LEAST 500 WORDS LONG and contain ONLY information derived from:
1. The scraped website data I've provided above (HIGHEST PRIORITY SOURCE)
2. Any additional user-provided data I've given you

This section must contain:
1. The creator's background, philosophy, and area of expertise
2. Specific details about their services, programs, or offerings
3. Direct quotes from their website (use the scraped content I provided)
4. Information about their unique methodology and approach

CITATION REQUIREMENT: For EACH piece of information, you MUST explicitly state its source, such as:
- "According to the creator's website..." (include direct quotes from the scraped data)
- "Based on the scraped data from the website..."

AT LEAST 60% of your research MUST focus specifically on this creator's work - this is NON-NEGOTIABLE. For each section below, you MUST include specific information about their approach before discussing general industry trends.

FOR EVERY SERVICE OR OFFERING mentioned, include specific details such as:
- Exact service name/title (from the scraped website data)
- Methodology or framework used (from the scraped data)
- Target client outcomes (from the scraped data)
- Client testimonials or results (if available in the scraped data)
- Unique approach or differentiation (from the scraped data)

If certain information is not available in the scraped data I provided, state this explicitly but still make your best effort to provide creator-specific insights based on what IS available.

====================`;
}

// Helper function to create expert prompt (thought leaders, academics, specialized professionals)
function createExpertPrompt(expertName: string, websiteContent: any): string {
  // Try to extract the expert's name if not provided
  let name = expertName;
  if (!name && websiteContent?.title) {
    // Try to extract a name from the title
    const nameParts = websiteContent.title.split(/[\s\|\-–—]/);
    if (nameParts.length > 0) {
      name = nameParts[0].trim();
    }
  }
  
  const expertField = detectExpertField(websiteContent);
  
  return `
====================
EXPERT RESEARCH STRUCTURE REQUIREMENTS - FOLLOW EXACTLY
====================

This research ABSOLUTELY MUST focus heavily on the expert's knowledge, methodology, and contributions to the field of ${expertField}.

YOU MUST START YOUR RESEARCH WITH A SECTION TITLED:
===== EXPERT INSIGHTS AND METHODOLOGY =====

This first section must be AT LEAST 500 WORDS LONG and contain ONLY information derived from:
1. The scraped website data I've provided above (HIGHEST PRIORITY SOURCE)
2. Any additional user-provided data I've given you

This section must contain:
1. The expert's background, credentials, and area of specialization
2. Specific details about their research, methodologies, or frameworks
3. Direct quotes from their website (use the scraped content I provided)
4. Information about their key contributions to the field

CITATION REQUIREMENT: For EACH piece of information, you MUST explicitly state its source, such as:
- "According to the expert's website..." (include direct quotes from the scraped data)
- "Based on the scraped data from the website..."

AT LEAST 60% of your research MUST focus specifically on this expert's work - this is NON-NEGOTIABLE. For each section below, you MUST include specific information about their approach before discussing general industry trends.

FOR EVERY METHODOLOGY OR FRAMEWORK mentioned, include specific details such as:
- Key principles or components (from the scraped website data)
- Application contexts (from the scraped data)
- Evidence of effectiveness (from the scraped data)
- How it differs from conventional approaches (from the scraped data)

If certain information is not available in the scraped data I provided, state this explicitly but still make your best effort to provide expert-specific insights based on what IS available.

====================`;
}

// Helper function to create hobbyist prompt (recipes, crafts, DIY, personal blogs)
function createHobbyistPrompt(creatorName: string, websiteContent: any): string {
  // Try to extract the creator's name if not provided
  let name = creatorName;
  if (!name && websiteContent?.title) {
    // Try to extract a name from the title
    const nameParts = websiteContent.title.split(/[\s\|\-–—]/);
    if (nameParts.length > 0) {
      name = nameParts[0].trim();
    }
  }
  
  const hobbyType = detectHobbyType(websiteContent);
  
  return `
====================
CREATOR CONTENT RESEARCH STRUCTURE REQUIREMENTS - FOLLOW EXACTLY
====================

This research ABSOLUTELY MUST focus heavily on the creator's ${hobbyType} content, style, and creative approach.

YOU MUST START YOUR RESEARCH WITH A SECTION TITLED:
===== CREATOR STYLE AND APPROACH =====

This first section must be AT LEAST 500 WORDS LONG and contain ONLY information derived from:
1. The scraped website data I've provided above (HIGHEST PRIORITY SOURCE)
2. Any additional user-provided data I've given you

This section must contain:
1. The creator's background and creative philosophy
2. Specific details about their style, techniques, or signature elements
3. Direct quotes from their website (use the scraped content I provided)
4. Information about what makes their content unique or appealing

CITATION REQUIREMENT: For EACH piece of information, you MUST explicitly state its source, such as:
- "According to the creator's website..." (include direct quotes from the scraped data)
- "Based on the scraped data from the website..."

AT LEAST 60% of your research MUST focus specifically on this creator's work - this is NON-NEGOTIABLE. For each section below, you MUST include specific information about their content before discussing general industry trends.

FOR EVERY TECHNIQUE OR PROJECT mentioned, include specific details such as:
- Materials or ingredients used (from the scraped website data)
- Process or methodology (from the scraped data)
- Visual style or presentation approach (from the scraped data)
- Audience engagement elements (from the scraped data)

If certain information is not available in the scraped data I provided, state this explicitly but still make your best effort to provide creator-specific insights based on what IS available.

====================`;
}

// Helper function to create the appropriate research structure based on content type
function createResearchStructure(contentType: string, name: string | undefined, formattedDate: string, currentMonth: string, currentYear: string | number, platform: string): string {
  if (contentType === 'business') {
    return `Structure the research with these REQUIRED sections:
${name ? `
### 1. ${name.toUpperCase()} COMPANY RESEARCH
- Direct findings from their website (using the scraped data I provided)
- Specific products and services offered (from the scraped website data)
- Company history, mission, and executives (from the scraped website data)
- Direct quotes and specific details with citations (from the scraped website data)` : ''}

### ${name ? '2' : '1'}. Current Significance (${currentMonth} ${currentYear})
- Explain why this topic matters RIGHT NOW
- Highlight any major developments in the past 30-60 days
- Include 3-5 current statistics WITH PUBLICATION DATES
${name ? `- Specifically address how this relates to ${name}'s current market position and products (reference the scraped website data)` : ''}

### ${name ? '3' : '2'}. Latest Trends and Developments (Past 90 Days)
- Focus EXCLUSIVELY on trends that emerged or evolved in the past quarter
- Include exact figures and percentages from the most recent studies
- Note any significant shifts from previous industry assumptions
${name ? `- Identify how ${name} is positioned relative to these trends and what products/services they offer in this space (reference the scraped website data)` : ''}

### ${name ? '4' : '3'}. Current Best Practices (As of ${formattedDate})
- Detail what is working RIGHT NOW on ${platform} for this type of content
- Specify which practices are newly effective (past 30-60 days)
- Highlight which older tactics have declined in effectiveness recently
${name ? `- Analyze whether ${name}'s current approach aligns with these best practices and how their products address current needs (reference the scraped website data)` : ''}

### ${name ? '5' : '4'}. Actionable Recommendations
- Provide specific tactics based ONLY on current research
- Include implementation guidance with expected outcomes
- Prioritize recommendations by potential impact
${name ? `- Tailor recommendations specifically for ${name}'s unique position, products, and strengths (reference the scraped website data)` : ''}

### ${name ? '6' : '5'}. Sources and Citations
- List 5-8 high-quality sources WITH PUBLICATION DATES
- Focus heavily on sources published in the past 90 days
- Format citations properly with titles, authors, and dates
${name ? `- Include specific citations of ${name}'s website content (from the scraped data I provided)` : ''}

====================

CURRENCY VERIFICATION REQUIREMENT:
- EVERY statistic must include its publication date (Month Year)
- ALL best practices must indicate when they became effective or were last verified
- ANY information older than 6 months must be clearly flagged as potentially outdated
- Include a currency note at the beginning: "This research is current as of ${formattedDate}"
- For any claim that cannot be verified with recent data, explicitly note this limitation`;
  }
  else if (contentType === 'personal_brand') {
    return `Structure the research with these REQUIRED sections:

### 1. CREATOR PROFILE AND EXPERTISE
- Background and qualifications (using the scraped data I provided)
- Service offerings and methodology (from the scraped website data)
- Philosophy and approach (from the scraped website data)
- Direct quotes and specific details with citations (from the scraped website data)

### 2. Current Significance (${currentMonth} ${currentYear})
- Explain why this topic/niche matters RIGHT NOW
- Highlight any major developments in the past 30-60 days
- Include 3-5 current statistics WITH PUBLICATION DATES
- Specifically address how the creator's approach relates to current market needs (reference the scraped website data)

### 3. Latest Trends and Developments (Past 90 Days)
- Focus EXCLUSIVELY on trends that emerged or evolved in the past quarter
- Include exact figures and percentages from the most recent studies
- Note any significant shifts from previous industry assumptions
- Identify how the creator's methodology aligns with these trends (reference the scraped website data)

### 4. Current Best Practices (As of ${formattedDate})
- Detail what is working RIGHT NOW on ${platform} for this type of content
- Specify which practices are newly effective (past 30-60 days)
- Highlight which older tactics have declined in effectiveness recently
- Analyze whether the creator's current approach aligns with these best practices (reference the scraped website data)

### 5. Actionable Recommendations
- Provide specific tactics based ONLY on current research
- Include implementation guidance with expected outcomes
- Prioritize recommendations by potential impact
- Tailor recommendations specifically for the creator's unique positioning and strengths (reference the scraped website data)

### 6. Sources and Citations
- List 5-8 high-quality sources WITH PUBLICATION DATES
- Focus heavily on sources published in the past 90 days
- Format citations properly with titles, authors, and dates
- Include specific citations of the creator's website content (from the scraped data I provided)

====================

CURRENCY VERIFICATION REQUIREMENT:
- EVERY statistic must include its publication date (Month Year)
- ALL best practices must indicate when they became effective or were last verified
- ANY information older than 6 months must be clearly flagged as potentially outdated
- Include a currency note at the beginning: "This research is current as of ${formattedDate}"
- For any claim that cannot be verified with recent data, explicitly note this limitation`;
  }
  else if (contentType === 'expert') {
    return `Structure the research with these REQUIRED sections:

### 1. EXPERT INSIGHTS AND METHODOLOGY
- Background and credentials (using the scraped data I provided)
- Methodologies and frameworks (from the scraped website data)
- Key contributions to the field (from the scraped website data)
- Direct quotes and specific details with citations (from the scraped website data)

### 2. Current Significance (${currentMonth} ${currentYear})
- Explain why this topic/field matters RIGHT NOW
- Highlight any major developments in the past 30-60 days
- Include 3-5 current statistics WITH PUBLICATION DATES
- Specifically address how the expert's work relates to current challenges (reference the scraped website data)

### 3. Latest Trends and Developments (Past 90 Days)
- Focus EXCLUSIVELY on trends that emerged or evolved in the past quarter
- Include exact figures and percentages from the most recent studies
- Note any significant shifts from previous paradigms or assumptions
- Identify how the expert's methodologies align with these trends (reference the scraped website data)

### 4. Current Best Practices (As of ${formattedDate})
- Detail what is working RIGHT NOW in this field
- Specify which approaches are newly effective (past 30-60 days)
- Highlight which older methodologies have declined in effectiveness recently
- Analyze whether the expert's current approach aligns with these best practices (reference the scraped website data)

### 5. Actionable Recommendations
- Provide specific tactics based ONLY on current research
- Include implementation guidance with expected outcomes
- Prioritize recommendations by potential impact
- Tailor recommendations specifically for application of the expert's methodologies (reference the scraped website data)

### 6. Sources and Citations
- List 5-8 high-quality sources WITH PUBLICATION DATES
- Focus heavily on sources published in the past 90 days
- Format citations properly with titles, authors, and dates
- Include specific citations of the expert's website content (from the scraped data I provided)

====================

CURRENCY VERIFICATION REQUIREMENT:
- EVERY statistic must include its publication date (Month Year)
- ALL best practices must indicate when they became effective or were last verified
- ANY information older than 6 months must be clearly flagged as potentially outdated
- Include a currency note at the beginning: "This research is current as of ${formattedDate}"
- For any claim that cannot be verified with recent data, explicitly note this limitation`;
  }
  else if (contentType === 'hobbyist') {
    return `Structure the research with these REQUIRED sections:

### 1. CREATOR STYLE AND APPROACH
- Creative background and inspiration (using the scraped data I provided)
- Techniques and signature elements (from the scraped website data)
- Content themes and subject matter (from the scraped website data)
- Direct quotes and specific details with citations (from the scraped website data)

### 2. Current Significance (${currentMonth} ${currentYear})
- Explain why this creative field matters RIGHT NOW
- Highlight any major developments in the past 30-60 days
- Include 3-5 current statistics WITH PUBLICATION DATES
- Specifically address how the creator's style relates to current trends (reference the scraped website data)

### 3. Latest Trends and Developments (Past 90 Days)
- Focus EXCLUSIVELY on trends that emerged or evolved in the past quarter
- Include exact figures and percentages from the most recent studies
- Note any significant shifts from previous creative approaches
- Identify how the creator's work aligns with these trends (reference the scraped website data)

### 4. Current Best Practices (As of ${formattedDate})
- Detail what is working RIGHT NOW on ${platform} for this type of content
- Specify which techniques are newly effective (past 30-60 days)
- Highlight which older approaches have declined in effectiveness recently
- Analyze whether the creator's current style aligns with these best practices (reference the scraped website data)

### 5. Actionable Recommendations
- Provide specific tactics based ONLY on current research
- Include implementation guidance with expected outcomes
- Prioritize recommendations by potential impact
- Tailor recommendations specifically for enhancing the creator's unique style (reference the scraped website data)

### 6. Sources and Citations
- List 5-8 high-quality sources WITH PUBLICATION DATES
- Focus heavily on sources published in the past 90 days
- Format citations properly with titles, authors, and dates
- Include specific citations of the creator's website content (from the scraped data I provided)

====================

CURRENCY VERIFICATION REQUIREMENT:
- EVERY statistic must include its publication date (Month Year)
- ALL best practices must indicate when they became effective or were last verified
- ANY information older than 6 months must be clearly flagged as potentially outdated
- Include a currency note at the beginning: "This research is current as of ${formattedDate}"
- For any claim that cannot be verified with recent data, explicitly note this limitation`;
  }
  else {
    // Generic fallback structure
    return `Structure the research with these REQUIRED sections:

### 1. Current Significance (${currentMonth} ${currentYear})
- Explain why this topic matters RIGHT NOW
- Highlight any major developments in the past 30-60 days
- Include 3-5 current statistics WITH PUBLICATION DATES

### 2. Latest Trends and Developments (Past 90 Days)
- Focus EXCLUSIVELY on trends that emerged or evolved in the past quarter
- Include exact figures and percentages from the most recent studies
- Note any significant shifts from previous assumptions

### 3. Current Best Practices (As of ${formattedDate})
- Detail what is working RIGHT NOW on ${platform} for this type of content
- Specify which practices are newly effective (past 30-60 days)
- Highlight which older tactics have declined in effectiveness recently

### 4. Actionable Recommendations
- Provide specific tactics based ONLY on current research
- Include implementation guidance with expected outcomes
- Prioritize recommendations by potential impact

### 5. Sources and Citations
- List 5-8 high-quality sources WITH PUBLICATION DATES
- Focus heavily on sources published in the past 90 days
- Format citations properly with titles, authors, and dates

====================

CURRENCY VERIFICATION REQUIREMENT:
- EVERY statistic must include its publication date (Month Year)
- ALL best practices must indicate when they became effective or were last verified
- ANY information older than 6 months must be clearly flagged as potentially outdated
- Include a currency note at the beginning: "This research is current as of ${formattedDate}"
- For any claim that cannot be verified with recent data, explicitly note this limitation`;
  }
}

// Helper function to detect creator title for personal brands
function detectCreatorTitle(websiteContent: any): string {
  if (!websiteContent) return 'professional';
  
  const allText = [
    websiteContent.title || '',
    ...(websiteContent.headings || []),
    ...(websiteContent.paragraphs || []),
    websiteContent.aboutContent || ''
  ].join(' ').toLowerCase();
  
  if (allText.includes('coach') || allText.includes('coaching')) return 'coach';
  if (allText.includes('trainer') || allText.includes('training')) return 'trainer';
  if (allText.includes('consultant')) return 'consultant';
  if (allText.includes('therapist') || allText.includes('therapy')) return 'therapist';
  if (allText.includes('designer')) return 'designer';
  if (allText.includes('instructor')) return 'instructor';
  if (allText.includes('mentor')) return 'mentor';
  if (allText.includes('speaker')) return 'speaker';
  if (allText.includes('influencer')) return 'influencer';
  if (allText.includes('creator')) return 'creator';
  
  // Default title
  return 'professional';
}

// Helper function to detect expert field
function detectExpertField(websiteContent: any): string {
  if (!websiteContent) return 'subject';
  
  const allText = [
    websiteContent.title || '',
    ...(websiteContent.headings || []),
    ...(websiteContent.paragraphs || []),
    websiteContent.aboutContent || ''
  ].join(' ').toLowerCase();
  
  if (allText.includes('technology') || allText.includes('tech') || allText.includes('software') || allText.includes('ai')) 
    return 'technology';
  if (allText.includes('health') || allText.includes('medical') || allText.includes('wellness')) 
    return 'health and wellness';
  if (allText.includes('finance') || allText.includes('invest') || allText.includes('money'))
    return 'finance';
  if (allText.includes('business') || allText.includes('entrepreneur') || allText.includes('startup'))
    return 'business';
  if (allText.includes('education') || allText.includes('learning') || allText.includes('teaching'))
    return 'education';
  if (allText.includes('psychology') || allText.includes('mental health'))
    return 'psychology';
  
  // Default field
  return 'specialized knowledge';
}

// Helper function to detect hobby type
function detectHobbyType(websiteContent: any): string {
  if (!websiteContent) return 'creative';
  
  const allText = [
    websiteContent.title || '',
    ...(websiteContent.headings || []),
    ...(websiteContent.paragraphs || []),
    websiteContent.aboutContent || ''
  ].join(' ').toLowerCase();
  
  if (allText.includes('cook') || allText.includes('recipe') || allText.includes('food') || allText.includes('bake')) 
    return 'cooking';
  if (allText.includes('craft') || allText.includes('diy') || allText.includes('handmade')) 
    return 'crafting';
  if (allText.includes('travel') || allText.includes('destination') || allText.includes('journey'))
    return 'travel';
  if (allText.includes('garden') || allText.includes('plant') || allText.includes('grow'))
    return 'gardening';
  if (allText.includes('photography') || allText.includes('photo') || allText.includes('camera'))
    return 'photography';
  if (allText.includes('art') || allText.includes('paint') || allText.includes('draw'))
    return 'art';
  if (allText.includes('blog') || allText.includes('write') || allText.includes('author'))
    return 'writing';
  
  // Default hobby
  return 'creative';
}

/**
 * Create a prompt for generating follow-up questions about a topic
 */
export function getQuestionsPrompt(topic: string, options: PromptOptions = {}): string {
  const {
    audience = 'general audience',
    contentType = 'article',
    platform = 'general',
    language = 'en'
  } = options;
  
  // Get current date for reference
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();
  const formattedDate = `${currentMonth} ${currentDate.getDate()}, ${currentYear}`;
  
  let prompt = `Generate 3 specific follow-up questions about the topic "${topic}" that would help create better ${contentType} content for ${audience} on ${platform}.
  
These questions should:
1. Focus on CURRENT aspects of the topic as of ${formattedDate}
2. Help uncover unique insights or perspectives relevant TODAY
3. Lead to information that would make the content more valuable to the audience
4. Specifically address recent developments or changes in the past 90 days

Format the response as a JSON array of strings containing only the questions.`;

  // Add language instruction for questions too
  if (language === 'es') {
    prompt += `\n\nIMPORTANTE: Tus preguntas DEBEN estar escritas en español. No uses inglés en absoluto.`;
  } else if (language !== 'en') {
    prompt += `\n\nIMPORTANT: Your questions MUST be written in ${language}. Do not use English at all.`;
  }

  return prompt;
}

/**
 * Create a prompt for refining research based on specific questions
 */
export function getRefinementPrompt(topic: string, research: string, questions: string[], language: string = 'en'): string {
  const questionsText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  
  // Get current date for reference
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();
  const formattedDate = `${currentMonth} ${currentDate.getDate()}, ${currentYear}`;
  
  let prompt = `Based on the following research about "${topic}", provide additional insights that specifically address these follow-up questions:

${questionsText}

Original Research:
"""
${research.substring(0, 2000)}... 
[truncated for brevity]
"""

Provide a concise, focused response to each question, drawing connections to the original research where relevant.

IMPORTANT: Ensure ALL information reflects current practices and trends as of ${formattedDate}. Include publication dates for any statistics or data you reference.`;

  // Add language instruction
  if (language === 'es') {
    prompt += `\n\nIMPORTANTE: Tu respuesta COMPLETA debe estar escrita en español. No uses inglés en absoluto.`;
  } else if (language !== 'en') {
    prompt += `\n\nIMPORTANT: Your entire response MUST be written in ${language}. Do not use English at all.`;
  }

  return prompt;
}

// Helper function to create website data prompt
function createWebsiteDataPrompt(websiteContent: any, companyName: string): string {
  if (!websiteContent) return '';
  
  console.log('Creating website data prompt for research with content:', 
    websiteContent.paragraphs?.length || 0, 'paragraphs,',
    websiteContent.headings?.length || 0, 'headings');
  
  let websitePrompt = `
SCRAPED WEBSITE DATA - MUST USE THIS INFORMATION - PRIORITY #1

I have performed a detailed scrape of ${companyName ? companyName + "'s" : "the subject's"} website and collected the following information. This information is AUTHORITATIVE and MUST be used as the PRIMARY SOURCE for your research:

Website Title: "${websiteContent.title || 'Not available'}"

Website Headings (${websiteContent.headings?.length || 0} total):
${websiteContent.headings?.slice(0, 15).map((h: string) => `- ${h}`).join('\n') || 'None found'}

${websiteContent.subpagesScraped?.length > 1 ? 
  `The website was scraped across ${websiteContent.subpagesScraped?.length || 1} pages including:
${websiteContent.subpagesScraped?.slice(0, 10).map((url: string) => `- ${url}`).join('\n') || 'Main page only'}` : 
  'The main page of the website was analyzed.'}

${websiteContent.aboutContent ? `About Content:
"${websiteContent.aboutContent?.substring(0, 800) || 'Not available'}${websiteContent.aboutContent?.length > 800 ? '...' : ''}"` : ''}

${websiteContent.productInfo ? `Product/Service Information:
"${websiteContent.productInfo?.substring(0, 800) || 'Not available'}${websiteContent.productInfo?.length > 800 ? '...' : ''}"` : ''}

${websiteContent.pricingInfo ? `Pricing Information:
"${websiteContent.pricingInfo?.substring(0, 800) || 'Not available'}${websiteContent.pricingInfo?.length > 800 ? '...' : ''}"` : ''}

${websiteContent.contactInfo?.emails?.length > 0 ? `Contact Email(s): ${websiteContent.contactInfo.emails.join(', ')}` : ''}
${websiteContent.contactInfo?.phones?.length > 0 ? `Contact Phone(s): ${websiteContent.contactInfo.phones.join(', ')}` : ''}
${websiteContent.contactInfo?.socialLinks?.length > 0 ? `Social Media: ${websiteContent.contactInfo.socialLinks.join(', ')}` : ''}

Key Content From The Website (MUST INCORPORATE THESE):
${websiteContent.paragraphs?.slice(0, Math.min(15, websiteContent.paragraphs?.length || 0))
  .map((p: string, i: number) => `[Content ${i+1}]: "${p.substring(0, Math.min(300, p.length))}${p.length > 300 ? '...' : ''}"`)
  .join('\n\n') || 'None found'}

CRITICAL REQUIREMENT: You MUST directly quote from and cite this scraped website data in your research. For every section in your research, include at least 2-3 direct references to this website data using the format: "According to ${companyName ? companyName + "'s" : "the subject's"} website: [direct quote]"

It is MANDATORY that you use the website content provided above as your PRIMARY SOURCE of information about ${companyName || "the subject"}. This is factual data directly extracted from their official website.
`;

  return websitePrompt;
}

export function buildResearchPrompt(
  topic: string,
  platform: string,
  contentType: string,
  audience: string,
  options: {
    businessName?: string;
    businessType?: string;
    audienceNeeds?: string;
    youtubeTranscript?: string;
    youtubeVideoId?: string;
    youtubeVideoTitle?: string;
    imageAnalysis?: string;
    websiteContent?: any; // Add website content as an option
    documentContent?: string;
    documentFilename?: string;
    followUpAnswers?: Record<string, string>;
  } = {}
): string {
  // Extract options
  const {
    businessName = '',
    businessType = '',
    audienceNeeds = '',
    youtubeTranscript = '',
    youtubeVideoId = '',
    youtubeVideoTitle = '',
    imageAnalysis = '',
    websiteContent = null,
    documentContent = '',
    documentFilename = '',
    followUpAnswers = {}
  } = options;

  const companyName = businessName || '';

  // Determine if we're dealing with a personal creator, business, or hobbyist
  const contentCreatorType = detectContentType(websiteContent, companyName);

  let prompt = ''; // Start with an empty prompt

  // ... existing buildResearchPrompt implementation ...

  // Check if we have website content, and if so, add it using our helper function
  if (websiteContent) {
    prompt += createWebsiteDataPrompt(websiteContent, companyName);
  }

  // ... existing buildResearchPrompt implementation continued ...
  
  // Add enhanced reminder about using the primary sources
  prompt += `
CRITICAL REMINDER: THE USER-PROVIDED DATA (website content, transcript, image analysis, document content, follow-up answers) MUST BE YOUR PRIMARY SOURCES. They are verified, current, and directly relevant to the research needs.

YOUR RESEARCH MUST BE BASED ON AND DIRECTLY CITE:
1. The scraped website data I've provided above (HIGHEST PRIORITY SOURCE)
2. YouTube transcript (if provided)
3. Direct quotes from their website (use the scraped content I provided)
4. Document content analysis (if provided)
5. Image analysis insights (if provided)
6. Answers to follow-up questions (if provided)
`;

  return prompt;
} 