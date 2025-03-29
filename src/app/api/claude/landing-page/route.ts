import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

// Constants - Using the Claude 3.7 Sonnet model
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

interface LandingPageRequest {
  contentDetails: {
    contentType: string;
    platform: string;
    targetAudience: string;
    businessType?: string;
    researchTopic?: string;
    primarySubject?: string;
    youtubeTranscript?: string;
    deepResearch?: string;
  };
  landingPageSettings: {
    title: string;
    subtitle: string;
    colorScheme: string;
    includeNewsletter: boolean;
    includeTestimonials: boolean;
    includePricing: boolean;
    ctaText: string;
    ctaUrl: string;
    selectedSections: string[];
  };
  researchData?: string;
}

/**
 * Call the Claude API to generate a landing page
 */
async function generateLandingPage(request: LandingPageRequest, apiKey: string): Promise<string> {
  try {
    console.log("Creating Anthropic client for landing page generation...");
    const anthropicClient = new Anthropic({
      apiKey: apiKey,
    });
    
    // Get current date for reference
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    
    // Build a prompt that instructs Claude to generate complete HTML and CSS
    let systemPrompt = `You are an expert web developer specializing in creating modern, responsive landing pages with HTML, CSS, and JavaScript.
You have up-to-date knowledge about web development best practices as of ${currentMonth} ${currentYear}.

YOUR TASK:
Generate a COMPLETE, PRODUCTION-READY landing page HTML file that includes:
1. All necessary HTML structure
2. Embedded CSS styles (in a <style> tag)
3. Any required JavaScript (in a <script> tag)
4. Modern design elements using Flexbox and CSS Grid
5. Responsive design that works on mobile, tablet, and desktop
6. Accessible markup following WCAG guidelines
7. Performance optimizations

DESIGN REQUIREMENTS:
- Create a sleek, professional design with modern aesthetics
- Use subtle animations and transitions for better UX
- Implement a clean, easy-to-read typography hierarchy
- Ensure visual hierarchy guides users to key actions
- Create a visually consistent design system throughout
- Add appropriate white space for readability and visual comfort
- Use hero images or graphics appropriately (with placeholder URLs)
- Ensure all interactive elements have proper hover/focus states

TECHNICAL REQUIREMENTS:
- Use semantic HTML5 elements
- Include viewport meta tag and proper document structure
- Implement responsive design with media queries
- Use CSS variables for color themes and easy customization
- Include basic form validation with JavaScript
- Add smooth scrolling to anchor links
- Ensure design works without JavaScript (progressive enhancement)
- Add appropriate meta tags for SEO

The landing page must be READY TO USE as-is when saved as an HTML file.
IMPORTANT: DO NOT use external libraries or CDNs. All CSS and JavaScript must be included directly in the HTML file.
`;

    // Build the user message with specific details
    const userMessage = `I need a professional landing page for my business with the following details:

BUSINESS DETAILS:
- Target audience: ${request.contentDetails.targetAudience}
- Business type: ${request.contentDetails.businessType || 'Not specified'}
${request.researchData ? `- Additional research/context: ${request.researchData}` : ''}

LANDING PAGE REQUIREMENTS:
- Title: ${request.landingPageSettings.title}
- Subtitle: ${request.landingPageSettings.subtitle}
- Color scheme: ${request.landingPageSettings.colorScheme}
- CTA text: ${request.landingPageSettings.ctaText}
- CTA URL: ${request.landingPageSettings.ctaUrl}

SECTIONS TO INCLUDE:
${request.landingPageSettings.selectedSections.map(section => `- ${section}`).join('\n')}
${request.landingPageSettings.includeNewsletter ? '- Newsletter signup form' : ''}
${request.landingPageSettings.includeTestimonials ? '- Testimonials section' : ''}
${request.landingPageSettings.includePricing ? '- Pricing section' : ''}

Please generate a complete, production-ready HTML file for this landing page that I can use immediately.
The HTML should include embedded CSS and any necessary JavaScript. The design should be modern, professional, and responsive.
The landing page should follow the latest web design trends and best practices as of ${currentMonth} ${currentYear}.
`;

    // Make the API call
    console.log("Calling Claude API to generate landing page...");
    const response = await anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ],
      max_tokens: 4000,
    });

    // Extract and return the HTML content
    console.log("Landing page generated successfully");
    const content = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    // Extract just the HTML content if it's wrapped in markdown code blocks
    if (content.includes('```html')) {
      const htmlMatch = content.match(/```html([\s\S]*?)```/);
      if (htmlMatch && htmlMatch[1]) {
        return htmlMatch[1].trim();
      }
    }
    
    return content;
    
  } catch (error: any) {
    console.error("Error in Claude API call:", error);
    throw new Error(`Failed to generate landing page: ${error.message}`);
  }
}

/**
 * POST handler for landing page generation
 */
export async function POST(req: Request) {
  try {
    // Validate API key
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      console.error("Missing Anthropic API key");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Parse request body
    const requestData: LandingPageRequest = await req.json();
    
    // Validate required fields
    if (!requestData.landingPageSettings || !requestData.landingPageSettings.title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate the landing page HTML
    const html = await generateLandingPage(requestData, anthropicApiKey);
    
    // Return the HTML content
    return NextResponse.json({ html });
    
  } catch (error: any) {
    console.error("Error in landing page generation:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error occurred" },
      { status: 500 }
    );
  }
} 