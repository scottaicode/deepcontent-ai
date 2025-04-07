import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk'; // Assuming Anthropic SDK is used

// Define expected input structure (aligns with AdDetails from frontend)
interface AdMakerRequest {
  projectName: string;
  productDescription: string;
  targetAudience: string;
  adObjective: string;
  keyMessage: string;
  platforms: string[];
  callToAction?: string;
  numVariations: number;
  elementsToVary: string[];
  // Potentially add persona/style if needed for ad generation
}

// Define expected output structure (aligns with AdVariation from frontend)
interface AdVariation {
  id: number;
  headline: string;
  bodyScript: string;
  visualGuidance: string;
  platformSuitability: string[];
}

const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219'; // Use the specified model

// Placeholder for a function that crafts the prompt for Claude
async function craftAdVariationPrompt(request: AdMakerRequest): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Construct the detailed prompt
  const prompt = `You are an expert AI advertising assistant specializing in creating high-performing ad creative variations. Your task is to generate ${request.numVariations} distinct ad variations based on the provided details.

**CRITICAL INSTRUCTION:** Ensure each variation is distinct and focuses on altering the elements specified in the 'Elements to Vary' section. Adhere STRICTLY to the output format specified at the end.

**Ad Creative Brief:**
*   **Product/Service:** ${request.productDescription}
*   **Target Audience:** ${request.targetAudience}
*   **Advertising Objective:** ${request.adObjective}
*   **Key Message to Convey:** ${request.keyMessage}
*   **Target Platform(s):** ${request.platforms.join(', ')}
*   **Call To Action (CTA):** ${request.callToAction || 'Learn More'}
*   **Number of Variations to Generate:** ${request.numVariations}
*   **Elements to Vary Across Variations:** ${request.elementsToVary.join(', ')} (Focus your variations primarily on these aspects)

**General Requirements:**
*   **Platform Best Practices:** Tailor the language, structure, and visual guidance to current (${currentYear}) best practices for each specified platform. For video platforms (like Instagram Reels, TikTok, YouTube Shorts), provide script elements suitable for short-form video (e.g., hook within 3 seconds, engaging visuals, clear audio cues). For static/feed platforms (like Facebook Feed, LinkedIn Feed, Instagram Feed), focus on compelling copy and strong image/graphic suggestions.
*   **Tone:** Maintain an engaging and persuasive tone appropriate for the target audience and objective, unless 'Tone' is listed as an element to vary.
*   **Clarity:** Ensure headlines are attention-grabbing and body copy/scripts are clear and concise.
*   **Visuals:** Provide concrete, actionable visual guidance or storyboard ideas that align with the copy/script and platform.
*   **Uniqueness:** Each variation must offer a meaningfully different approach, angle, or execution based on the 'Elements to Vary'.

**Output Format (STRICT):**
Generate *only* the ad variations. Do NOT include any preamble, introductory text, explanations, or concluding remarks outside the defined variation format. Use the following format precisely for *each* variation, incrementing the [Variation Number]:

---VARIATION START 1---
**Headline:** [Generated Headline/Hook for Variation 1]
**Body/Script:** [Generated Body Copy or Video Script for Variation 1]
**Visual Guidance:** [Generated Visual Ideas/Storyboard for Variation 1]
**Platform Suitability:** [List the specific platform(s) this variation is most suitable for from the target list: ${request.platforms.join(', ')}]
---VARIATION END 1---

---VARIATION START 2---
**Headline:** [Generated Headline/Hook for Variation 2]
**Body/Script:** [Generated Body Copy or Video Script for Variation 2]
**Visual Guidance:** [Generated Visual Ideas/Storyboard for Variation 2]
**Platform Suitability:** [List the specific platform(s) this variation is most suitable for from the target list: ${request.platforms.join(', ')}]
---VARIATION END 2---

... continue this pattern for all ${request.numVariations} variations, incrementing the number in the START and END delimiters.
`;

  console.log("--- Crafted Ad Variation Prompt ---");
  console.log(prompt.substring(0, 1000) + "..."); // Log start of prompt
  console.log("--- End Crafted Prompt Snippet ---");

  return prompt;
}

// Function calling the AI API and parsing the response
async function callClaudeForAds(prompt: string, apiKey: string): Promise<AdVariation[]> {
  console.log("--- Entering callClaudeForAds ---");
  console.log("Prompt Snippet:", prompt.substring(0, 500) + "..."); 

  try {
    console.log("Instantiating Anthropic client...");
    const anthropic = new Anthropic({ apiKey });
    console.log("Anthropic client instantiated.");

    console.log("Calling anthropic.messages.create...");
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      temperature: 0.7, 
      system: "You are an expert AI advertising assistant. Follow the user's formatting instructions precisely.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    console.log("anthropic.messages.create call completed."); 
    console.log("--- Received Response Object from Claude API ---");
    console.log(JSON.stringify(response, null, 2)); 
    console.log("---------------------------------------------");
    let rawResponseText = '';
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      const textBlock = response.content.find(block => block.type === 'text');
      if (textBlock && 'text' in textBlock) {
        rawResponseText = textBlock.text;
      }
    }
    if (!rawResponseText) {
      console.error('Claude response did not contain usable text content. Check the full response object logged above for details (e.g., stop_reason). Stop Reason:', response.stop_reason);
      const stopReason = response.stop_reason ? ` Stop Reason: ${response.stop_reason}` : '';
      throw new Error(`Received empty or invalid response from AI.${stopReason}`); 
    }
    console.log("Raw Response Length:", rawResponseText.length);
    console.log("Raw Response Snippet:", rawResponseText.substring(0, 500) + "...");
    const variations: AdVariation[] = [];
    const variationBlocks = rawResponseText.split(/---VARIATION START \d+---/).filter(block => block.trim() !== '');
    console.log(`Found ${variationBlocks.length} potential variation blocks.`);
    for (let i = 0; i < variationBlocks.length; i++) {
      const block = variationBlocks[i].split(/---VARIATION END \d+---/)[0].trim(); 
      if (!block) continue;
      const headlineMatch = block.match(/\*\*Headline:\*\*\s*([\s\S]*?)(?=\n\*\*Body\/Script:\*\*)/); 
      const bodyScriptMatch = block.match(/\*\*Body\/Script:\*\*\s*([\s\S]*?)(?=\n\*\*Visual Guidance:\*\*)/);
      const visualGuidanceMatch = block.match(/\*\*Visual Guidance:\*\*\s*([\s\S]*?)(?=\n\*\*Platform Suitability:\*\*)/);
      const platformSuitabilityMatch = block.match(/\*\*Platform Suitability:\*\*\s*([\s\S]*)/);
      const headline = headlineMatch?.[1]?.trim() || '';
      const bodyScript = bodyScriptMatch?.[1]?.trim() || '';
      const visualGuidance = visualGuidanceMatch?.[1]?.trim() || '';
      const platformSuitabilityText = platformSuitabilityMatch?.[1]?.trim() || '';
      if (headline || bodyScript || visualGuidance || platformSuitabilityText) { 
        const platformSuitability = platformSuitabilityText.split(/[\n,]+/).map(p => p.trim()).filter(p => p !== '');
        variations.push({
          id: i + 1,
          headline: headline || '[Headline not found]',
          bodyScript: bodyScript || '[Body/Script not found]',
          visualGuidance: visualGuidance || '[Visual Guidance not found]',
          platformSuitability: platformSuitability.length > 0 ? platformSuitability : ['[Platform not specified]']
        });
        console.log(`Successfully parsed variation ${i + 1}`);
      } else {
          console.warn(`Could not parse variation block ${i + 1}. Content snippet:\n${block.substring(0,300)}...`);
      }
    }
    if (variations.length === 0 && rawResponseText.length > 0) {
        console.error("Failed to parse any variations from the raw response. Check Claude's output format adherence.");
    }
    console.log("--- Exiting callClaudeForAds successfully ---");
    return variations;
  } catch (error) {
    console.error('--- Error within callClaudeForAds ---', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during AI interaction';
    throw new Error(`AI call/parsing failed: ${errorMessage}`);
  }
}

export async function POST(request: Request) {
  console.log('AI Admaker API endpoint hit');
  try {
    const requestData: AdMakerRequest = await request.json();
    console.log('Received Admaker request:', requestData);

    // --- Input Validation --- 
    if (!requestData.productDescription || !requestData.targetAudience || !requestData.keyMessage || !requestData.platforms || requestData.platforms.length === 0 || !requestData.numVariations || !requestData.elementsToVary || requestData.elementsToVary.length === 0) {
      return NextResponse.json({ error: 'Missing required fields for ad generation.' }, { status: 400 });
    }

    // --- API Key Check ---
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('Anthropic API key not configured');
      return NextResponse.json({ error: 'API key configuration error.' }, { status: 500 });
    }

    // --- Craft Prompt --- 
    const prompt = await craftAdVariationPrompt(requestData);

    // --- Call AI --- 
    const variations = await callClaudeForAds(prompt, apiKey);
    
    console.log('Successfully generated ad variations (mocked):', variations.length);

    // --- Return Response --- 
    return NextResponse.json({ variations });

  } catch (error) {
    console.error('Error in AI Admaker API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to generate ad variations.', details: errorMessage }, { status: 500 });
  }
} 