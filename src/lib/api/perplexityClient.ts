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
  async generateCompletion(prompt: string, model: string = 'claude-3-5-sonnet-20240620', maxTokens: number = 1000): Promise<string> {
    try {
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
          max_tokens: maxTokens
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
    
    // Create 3 subtasks focused on different aspects
    const subtaskPrompts = [
      // Subtask 1: Recent facts, data points, and market overview
      `RESEARCH SUBTASK 1: Recent Facts, Data, and Market Overview for "${topicClean}"\n\n` +
      `Your task is to research only the most recent facts, statistics, data points, and market overview information about "${topicClean}".\n\n` +
      `Focus on:\n` +
      `• Current market size, growth trajectory, and forecasts\n` +
      `• Latest statistics and data points\n` +
      `• Recent trends (last 6-12 months)\n` +
      `• Key market segments and demographics\n\n` +
      `Format your response with clear section headings. Be concise but thorough with factual information.\n` +
      `Include only verified information from reputable sources. Cite specific metrics and statistics where available.`,
      
      // Subtask 2: Target audience and pain points
      `RESEARCH SUBTASK 2: Target Audience Analysis and Pain Points for "${topicClean}"\n\n` +
      `Your task is to research the target audience, customer needs, and pain points related to "${topicClean}".\n\n` +
      `Focus on:\n` +
      `• Key audience demographics and psychographics\n` +
      `• Common customer needs, desires, and expectations\n` +
      `• Major pain points and challenges faced by customers\n` +
      `• How customers typically evaluate products/services in this space\n\n` +
      `Format your response with clear section headings. Be specific and provide actionable insights.\n` +
      `Include only verified information from reputable sources.`,
      
      // Subtask 3: Competitive landscape and best practices
      `RESEARCH SUBTASK 3: Competitive Landscape and Best Practices for "${topicClean}"\n\n` +
      `Your task is to research the competitive landscape and best practices related to "${topicClean}".\n\n` +
      `Focus on:\n` +
      `• Major competitors and their positioning\n` +
      `• Industry best practices and benchmarks\n` +
      `• Successful strategies and approaches\n` +
      `• Content and messaging trends that resonate with audiences\n\n` +
      `Format your response with clear section headings. Provide specific examples where possible.\n` +
      `Include only verified information from reputable sources.`
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
      
      // Split the research into manageable subtasks
      const { subtaskPrompts, recombinationPrompt } = this.splitResearchIntoSubtasks(topic, promptText);
      
      // Process each subtask with retries
      const subtaskResults: string[] = [];
      
      for (let i = 0; i < subtaskPrompts.length; i++) {
        console.log(`[PERPLEXITY] Processing subtask ${i+1}/${subtaskPrompts.length}`);
        
        // Try up to 3 times with exponential backoff
        let attempt = 0;
        let result = '';
        let success = false;
        
        while (attempt < 3 && !success) {
          try {
            if (attempt > 0) {
              // Wait with exponential backoff before retrying
              const backoffMs = Math.pow(2, attempt) * 1000;
              console.log(`[PERPLEXITY] Retrying subtask ${i+1} after ${backoffMs}ms (attempt ${attempt+1}/3)`);
              await wait(backoffMs);
            }
            
            // Generate research for this subtask
            result = await this.generateCompletion(subtaskPrompts[i], 'claude-3-5-sonnet-20240620', 4000);
            success = true;
          } catch (error) {
            attempt++;
            console.error(`[PERPLEXITY] Error in subtask ${i+1}, attempt ${attempt}:`, error);
            
            if (attempt >= 3) {
              // After 3 failed attempts, use a fallback approach
              console.log(`[PERPLEXITY] Using fallback for subtask ${i+1} after 3 failed attempts`);
              
              // Create a simplified version of the subtask as fallback
              const fallbackPrompt = `Please provide essential information about ${topic} related to ${
                i === 0 ? 'market facts and trends' : 
                i === 1 ? 'target audience and customer needs' : 
                'competitors and best practices'
              }. Keep it brief but informative.`;
              
              try {
                // Try the fallback with minimum expected output
                result = await this.generateCompletion(fallbackPrompt, 'claude-3-5-sonnet-20240620', 2000);
                success = true;
              } catch (fallbackError) {
                // If even fallback fails, use minimal placeholder content
                console.error(`[PERPLEXITY] Fallback failed for subtask ${i+1}:`, fallbackError);
                result = `## Research Component ${i+1}\n\nThis section could not be fully researched due to API limitations.\n\n`;
              }
            }
          }
        }
        
        subtaskResults.push(result);
      }
      
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
      
      while (recombineAttempt < 3 && !recombineSuccess) {
        try {
          if (recombineAttempt > 0) {
            // Wait with exponential backoff before retrying
            const backoffMs = Math.pow(2, recombineAttempt) * 1000;
            console.log(`[PERPLEXITY] Retrying recombination after ${backoffMs}ms (attempt ${recombineAttempt+1}/3)`);
            await wait(backoffMs);
          }
          
          // Recombine the research components
          recombinedResult = await this.generateCompletion(fullRecombinationPrompt, 'claude-3-5-sonnet-20240620', 5000);
          recombineSuccess = true;
        } catch (error) {
          recombineAttempt++;
          console.error(`[PERPLEXITY] Error in recombination, attempt ${recombineAttempt}:`, error);
          
          if (recombineAttempt >= 3) {
            // After 3 failed attempts, do a simple concatenation
            console.log('[PERPLEXITY] Using fallback concatenation after 3 failed recombination attempts');
            
            // Create a simple concatenation with section headers
            recombinedResult = `# Research Report on "${topic}"\n\n` +
              `## Executive Summary\n\nThis research provides insights on ${topic} including market trends, audience analysis, and competitive landscape.\n\n` +
              `## Market Overview and Facts\n\n${subtaskResults[0]}\n\n` +
              `## Target Audience and Pain Points\n\n${subtaskResults[1]}\n\n` +
              `## Competitive Landscape and Best Practices\n\n${subtaskResults[2]}\n\n`;
            
            recombineSuccess = true;
          }
        }
      }
      
      console.log('[PERPLEXITY] Research generation complete');
      return recombinedResult;
    } catch (error: any) {
      console.error('Error in Perplexity generateResearch:', error);
      throw error;
    }
  }
} 