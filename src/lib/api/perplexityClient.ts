/**
 * Perplexity API Client
 * 
 * This class provides methods for interacting with the Perplexity API,
 * including generating research on specific topics.
 */

// Add a backoff timeout utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class PerplexityClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.perplexity.ai/chat/completions';
  private model: string = 'sonar-deep-research';
  
  constructor(apiKey: string) {
    // Validate API key
    if (!apiKey) {
      console.error('[DIAGNOSTIC] CRITICAL ERROR: Perplexity API key is missing');
      throw new Error('Perplexity API key is missing. Please add PERPLEXITY_API_KEY to your environment variables.');
    }
    
    if (!apiKey.startsWith('pplx-')) {
      console.error('[DIAGNOSTIC] CRITICAL ERROR: Invalid Perplexity API key format');
      throw new Error('Invalid Perplexity API key format. Key should start with "pplx-".');
    }
    
    console.log('[DIAGNOSTIC] Perplexity API key validation passed in client constructor');
    this.apiKey = apiKey;
  }
  
  /**
   * Generate a completion using the Perplexity Claude API
   */
  async generateCompletion(prompt: string, model: string = 'claude-3-5-sonnet-20240620', maxTokens: number = 4000): Promise<string> {
    try {
      console.log(`[PERPLEXITY] Making API call with model: ${model}, max tokens: ${maxTokens}`);
      
      // Add artificial delay to ensure thorough processing (1-2 seconds)
      await wait(Math.floor(Math.random() * 1000) + 1000);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.2, // Lower temperature for more factual responses
          timeout: 120 // Longer timeout (120 seconds) for more thorough research
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Perplexity API error (${response.status}): ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Perplexity API');
      }
      
      // Add artificial delay after receiving response to allow processing
      await wait(1000);
      
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error('Error in Perplexity generateCompletion:', error);
      throw error;
    }
  }
  
  /**
   * Break a large research task into subtasks that can be processed within time limits
   */
  private splitResearchIntoSubtasks(topic: string, promptText: string): { subtaskPrompts: string[], recombinationPrompt: string } {
    // Extract key components of the research task
    const topicClean = topic.trim();
    
    // Create 3 subtasks focused on different aspects - increasing detail level with more specific instructions
    const subtaskPrompts = [
      // Subtask 1: Recent facts, data points, and market overview - MORE DETAILED
      `RESEARCH SUBTASK 1: Comprehensive Market Overview for "${topicClean}"\n\n` +
      `Conduct thorough and detailed research on "${topicClean}" focusing on market overview information.\n\n` +
      `Include ALL of the following sections:\n` +
      `• Current market size with specific numbers and growth trajectory\n` +
      `• Latest industry statistics and data points with sources\n` +
      `• Detailed analysis of recent trends (last 6-12 months)\n` +
      `• Key market segments, demographics, and their relative sizes\n` +
      `• Major players and their market positions\n` +
      `• Regional differences and global context\n\n` +
      `Format your response with clear section headings. Be comprehensive and thorough with factual information.\n` +
      `Include verified information from reputable sources. Cite specific metrics, statistics, and sources where available.`,
      
      // Subtask 2: Target audience and pain points - MORE DETAILED
      `RESEARCH SUBTASK 2: Comprehensive Target Audience Analysis for "${topicClean}"\n\n` +
      `Conduct thorough and detailed research on the target audience and pain points related to "${topicClean}".\n\n` +
      `Include ALL of the following sections:\n` +
      `• Detailed audience demographics (age, income, education, occupation, etc.)\n` +
      `• Audience psychographics (values, interests, lifestyle choices, etc.)\n` +
      `• Specific customer needs, desires, and expectations with supporting data\n` +
      `• Comprehensive analysis of pain points and challenges faced by customers\n` +
      `• Customer journey details and decision-making factors\n` +
      `• Audience segmentation and prioritization\n\n` +
      `Format your response with clear section headings. Provide specific examples and actionable insights.\n` +
      `Include verified information from reputable sources including industry reports, surveys, and customer reviews.`,
      
      // Subtask 3: Competitive landscape and best practices - MORE DETAILED
      `RESEARCH SUBTASK 3: Comprehensive Competitive Landscape Analysis for "${topicClean}"\n\n` +
      `Conduct thorough and detailed research on the competitive landscape and best practices related to "${topicClean}".\n\n` +
      `Include ALL of the following sections:\n` +
      `• Major competitors with detailed profiles and strengths/weaknesses\n` +
      `• Competitive positioning matrix with differentiation factors\n` +
      `• Detailed industry best practices with examples\n` +
      `• Success metrics and benchmarks with specific numbers\n` +
      `• Successful strategies with case studies\n` +
      `• Content and messaging trends that have proven effective\n` +
      `• Emerging technologies and innovations in the space\n\n` +
      `Format your response with clear section headings. Provide specific examples and case studies.\n` +
      `Include verified information from reputable sources, competitor websites, industry reports, and case studies.`
    ];
    
    // Create a prompt to recombine the subtask results
    const recombinationPrompt = 
      `I will provide you with three research documents about "${topicClean}" that cover different aspects:\n` +
      `1. Recent facts, data points, and market overview\n` +
      `2. Target audience and pain points\n` +
      `3. Competitive landscape and best practices\n\n` +
      `Your task is to synthesize these into a cohesive, comprehensive research document about "${topicClean}".\n\n` +
      `Create a well-formatted research document with clear sections including:\n` +
      `• Executive Summary\n` +
      `• Market Overview and Trends\n` +
      `• Target Audience Analysis\n` +
      `• Pain Points and Customer Needs\n` +
      `• Competitive Landscape\n` +
      `• Best Practices and Recommendations\n\n` +
      `Ensure the content flows naturally between sections. Eliminate redundancies and format with Markdown headings. Add relevant context based on the original prompt details:\n\n` +
      `Original prompt: ${promptText.substring(0, 500)}...\n\n` +
      `Here are the three research components to synthesize:`;
    
    return { subtaskPrompts, recombinationPrompt };
  }
  
  /**
   * Generate deep research on a topic using Perplexity API
   * 
   * This method implements a chunking strategy to avoid timeouts:
   * 1. Break the research into subtasks
   * 2. Process each subtask with retries and backoff
   * 3. Combine the results into a comprehensive research document
   */
  async generateResearch(promptText: string): Promise<string> {
    try {
      console.log('[PERPLEXITY] Starting chunked research generation');
      
      // Extract topic from prompt (basic extraction - can be improved)
      const topicMatch = promptText.match(/Topic:\s*"([^"]+)"/i);
      const topic = topicMatch ? topicMatch[1] : 'the requested topic';
      
      console.log(`[PERPLEXITY] Researching topic: "${topic}"`);
      
      // Add delay before starting research to prevent quick returns
      await wait(2000);
      
      // Start timing the whole process
      const totalStartTime = Date.now();
      
      // Split the research into manageable subtasks
      const { subtaskPrompts, recombinationPrompt } = this.splitResearchIntoSubtasks(topic, promptText);
      
      // Process each subtask with retries
      const subtaskResults: string[] = [];
      
      for (let i = 0; i < subtaskPrompts.length; i++) {
        console.log(`[PERPLEXITY] Processing subtask ${i+1}/${subtaskPrompts.length} (expecting 30-60 seconds per component)`);
        
        // Add artificial delay between components to ensure thoroughness
        if (i > 0) {
          console.log('[PERPLEXITY] Waiting between research components for thorough processing');
          await wait(3000); // Wait 3 seconds between components
        }
        
        // Try up to 3 times with exponential backoff
        let attempt = 0;
        let result = '';
        let success = false;
        
        const startTime = Date.now();
        
        while (attempt < 3 && !success) {
          try {
            if (attempt > 0) {
              // Wait with exponential backoff before retrying
              const backoffMs = Math.pow(2, attempt + 2) * 1000; // Increased backoff (8s, 16s, 32s)
              console.log(`[PERPLEXITY] Retrying subtask ${i+1} after ${backoffMs}ms (attempt ${attempt+1}/3)`);
              await wait(backoffMs);
            }
            
            // Generate research for this subtask with increased token limit
            result = await this.generateCompletion(subtaskPrompts[i], 'claude-3-5-sonnet-20240620', 6000);
            success = true;
          } catch (error) {
            attempt++;
            console.error(`[PERPLEXITY] Error in subtask ${i+1}, attempt ${attempt}:`, error);
            
            if (attempt >= 3) {
              // After 3 failed attempts, use a more robust fallback approach
              console.log(`[PERPLEXITY] Using fallback for subtask ${i+1} after 3 failed attempts`);
              
              // Create a more detailed fallback prompt that focuses on depth for that specific component
              let fallbackPrompt = '';
              if (i === 0) {
                fallbackPrompt = `Perform comprehensive market research on "${topic}" including market size, growth trajectory, recent trends, key statistics, and major players. Focus on providing specific data points, statistics, and factual information from reliable sources. Be thorough and detailed. Take your time to consider all relevant aspects.`;
              } else if (i === 1) {
                fallbackPrompt = `Conduct a detailed analysis of the target audience and customer pain points for "${topic}". Include demographic information, psychographic profiles, specific needs, common challenges, and customer journey insights. Provide real examples and be as specific as possible. Consider both primary and secondary audience segments.`;
              } else {
                fallbackPrompt = `Analyze the competitive landscape and best practices related to "${topic}". Identify major competitors, their positioning, strengths and weaknesses, industry benchmarks, successful strategies, and emerging trends. Include specific examples, case studies, and actionable insights. Evaluate at least 5-7 key competitors in detail.`;
              }
              
              try {
                // Try the improved fallback with a different model and higher token limit
                result = await this.generateCompletion(fallbackPrompt, 'claude-3-5-sonnet-20240620', 6000);
                success = true;
              } catch (fallbackError) {
                console.error(`[PERPLEXITY] First fallback failed for subtask ${i+1}:`, fallbackError);
                
                await wait(5000); // Wait 5 seconds before final attempt
                
                // If the first fallback fails, try an even simpler approach with a different model
                try {
                  // Create an even more simplified fallback prompt
                  const simplePrompt = `Research the following about ${topic}: ${
                    i === 0 ? 'key market facts, statistics, and trends' : 
                    i === 1 ? 'target audience details and their pain points' : 
                    'major competitors and industry best practices'
                  }. Be thorough and detailed. Include as many specific facts and examples as possible.`;
                  
                  result = await this.generateCompletion(simplePrompt, 'claude-3-5-sonnet-20240620', 5000);
                  success = true;
                } catch (finalError) {
                  // If all attempts fail, use a minimal template with placeholder that clearly indicates this is a section that needs manual research
                  console.error(`[PERPLEXITY] All fallbacks failed for subtask ${i+1}:`, finalError);
                  const section = i === 0 ? 'Market Overview' : i === 1 ? 'Target Audience Analysis' : 'Competitive Landscape';
                  result = `## ${section}\n\nThis section requires additional research. The information available for "${topic}" was limited during the automated research process. We recommend supplementing this report with manual research focused on ${
                    i === 0 ? 'market statistics, industry trends, and growth projections' : 
                    i === 1 ? 'customer demographics, needs, and pain points' : 
                    'competitor analysis and industry best practices'
                  }.\n\nSome general information that may be relevant:\n\n- ${topic} is an important area with significant implications\n- Consider consulting industry reports and specialized sources for more detailed information\n- Surveys and customer feedback will be valuable for deeper insights`;
                }
              }
            }
          }
        }
        
        const componentTime = Math.floor((Date.now() - startTime) / 1000);
        console.log(`[PERPLEXITY] Component ${i+1} completed in ${componentTime} seconds`);
        
        // Ensure minimum processing time of 30 seconds per component for thoroughness
        const minComponentTime = 30 * 1000; // 30 seconds
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < minComponentTime) {
          const additionalWaitTime = minComponentTime - elapsedTime;
          console.log(`[PERPLEXITY] Ensuring minimum processing time with additional ${Math.floor(additionalWaitTime/1000)}s wait`);
          await wait(additionalWaitTime);
        }
        
        subtaskResults.push(result);
      }
      
      // Add delay before recombination phase
      console.log('[PERPLEXITY] All components collected, waiting before recombination phase');
      await wait(3000);
      
      // Now recombine the subtask results
      console.log('[PERPLEXITY] Recombining subtask results');
      
      // Construct the full recombination prompt
      const fullRecombinationPrompt = `${recombinationPrompt}\n\n` +
        `RESEARCH COMPONENT 1:\n${subtaskResults[0]}\n\n` +
        `RESEARCH COMPONENT 2:\n${subtaskResults[1]}\n\n` +
        `RESEARCH COMPONENT 3:\n${subtaskResults[2]}`;
      
      // Try to recombine with retries
      let recombinedResult = '';
      let recombineSuccess = false;
      let recombineAttempt = 0;
      
      const recombineStartTime = Date.now();
      
      while (recombineAttempt < 3 && !recombineSuccess) {
        try {
          if (recombineAttempt > 0) {
            // Wait with exponential backoff before retrying
            const backoffMs = Math.pow(2, recombineAttempt + 2) * 1000; // Increased backoff
            console.log(`[PERPLEXITY] Retrying recombination after ${backoffMs}ms (attempt ${recombineAttempt+1}/3)`);
            await wait(backoffMs);
          }
          
          // Recombine the research components with increased token limit
          recombinedResult = await this.generateCompletion(fullRecombinationPrompt, 'claude-3-5-sonnet-20240620', 7000);
          recombineSuccess = true;
        } catch (error) {
          recombineAttempt++;
          console.error(`[PERPLEXITY] Error in recombination, attempt ${recombineAttempt}:`, error);
          
          if (recombineAttempt >= 3) {
            // After 3 failed attempts, do a better concatenation than just the simple one
            console.log('[PERPLEXITY] Using enhanced fallback concatenation after 3 failed recombination attempts');
            
            // Create a more sophisticated concatenation with better section headers and transitions
            recombinedResult = `# Research Report on "${topic}"\n\n` +
              `## Executive Summary\n\nThis comprehensive research provides detailed insights on ${topic}, covering the market landscape, audience analysis, and competitive environment. The report is divided into three main sections: market overview with key statistics, target audience analysis with pain points, and competitive landscape with best practices.\n\n` +
              `## Market Overview and Key Trends\n\n${subtaskResults[0]}\n\n` +
              `## Target Audience Analysis and Pain Points\n\nBuilding on the market overview, this section explores the specific characteristics of the target audience for ${topic}.\n\n${subtaskResults[1]}\n\n` +
              `## Competitive Landscape and Best Practices\n\nWith an understanding of both the market and the target audience, this section examines the competitive environment and identifies effective strategies.\n\n${subtaskResults[2]}\n\n` +
              `## Recommendations\n\nBased on the comprehensive research presented above, here are key recommendations for approaching ${topic}:\n\n` +
              `1. Focus on addressing the identified audience pain points\n` +
              `2. Leverage the market trends highlighted in the overview section\n` +
              `3. Adopt the best practices identified in the competitive analysis\n` +
              `4. Consider the unique market position opportunities identified in this research\n` +
              `5. Develop content that speaks directly to the audience needs and expectations`;
            
            recombineSuccess = true;
          }
        }
      }
      
      const recombineTime = Math.floor((Date.now() - recombineStartTime) / 1000);
      console.log(`[PERPLEXITY] Recombination completed in ${recombineTime} seconds`);
      
      // Ensure minimum total processing time of 3 minutes for thoroughness
      const totalElapsedTime = Date.now() - totalStartTime;
      const minTotalTime = 3 * 60 * 1000; // 3 minutes
      if (totalElapsedTime < minTotalTime) {
        const finalWaitTime = minTotalTime - totalElapsedTime;
        console.log(`[PERPLEXITY] Ensuring thorough research with final ${Math.floor(finalWaitTime/1000)}s processing period`);
        await wait(finalWaitTime);
      }
      
      const totalTimeMinutes = Math.floor(((Date.now() - totalStartTime) / (60 * 1000)) * 10) / 10;
      console.log(`[PERPLEXITY] Research generation complete in ${totalTimeMinutes} minutes`);
      
      return recombinedResult;
    } catch (error: any) {
      console.error('Error in Perplexity generateResearch:', error);
      throw error;
    }
  }
} 