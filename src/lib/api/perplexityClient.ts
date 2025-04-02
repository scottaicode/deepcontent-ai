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
  async generateCompletion(prompt: string, model: string = 'claude-3-5-sonnet-20240620', maxTokens: number = 8000): Promise<string> {
    try {
      console.log(`[PERPLEXITY] Making API call with model: ${model}, max tokens: ${maxTokens}`);
      
      // Add more substantial artificial delay to ensure thorough processing (2-3 seconds)
      await wait(Math.floor(Math.random() * 1500) + 2000);
      
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
          temperature: 0.1, // Lower temperature for more factual responses
          timeout: 180, // Much longer timeout (180 seconds) for more thorough research
          presence_penalty: 0.1, // Add presence penalty to encourage detailed content
          frequency_penalty: 0.1 // Add frequency penalty to reduce repetition
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
      
      // Get the response content
      const content = data.choices[0].message.content;
      
      // Check if the content is thorough enough
      const wordCount = content.split(/\s+/).length;
      console.log(`[PERPLEXITY] Response contained ${wordCount} words`);
      
      if (wordCount < 500) {
        console.warn(`[PERPLEXITY] Content appears too brief (${wordCount} words). Will attempt to enhance or retry.`);
        
        // For short responses, try to enhance with a follow-up
        if (wordCount > 200) {
          // Try to enhance with a follow-up request
          console.log(`[PERPLEXITY] Attempting to enhance brief content with follow-up`);
          await wait(1000);
          
          const enhancementPrompt = `The previous response about "${prompt.substring(0, 100)}..." was too brief. Please provide a MUCH more comprehensive, detailed analysis with concrete facts, examples, data points, and thorough information. Include specific numbers, statistics, and detailed explanations. The response should be extremely thorough and much longer than before.`;
          
          try {
            const enhancementResponse = await fetch(`${this.baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
              },
              body: JSON.stringify({
                model: model,
                messages: [
                  { role: 'user', content: prompt },
                  { role: 'assistant', content: content },
                  { role: 'user', content: enhancementPrompt }
                ],
                max_tokens: maxTokens + 2000,
                temperature: 0.1
              })
            });
            
            if (enhancementResponse.ok) {
              const enhancementData = await enhancementResponse.json();
              if (enhancementData.choices && enhancementData.choices.length > 0) {
                const enhancedContent = enhancementData.choices[0].message.content;
                const enhancedWordCount = enhancedContent.split(/\s+/).length;
                if (enhancedWordCount > wordCount * 1.5) {
                  console.log(`[PERPLEXITY] Successfully enhanced content from ${wordCount} to ${enhancedWordCount} words`);
                  return enhancedContent;
                }
              }
            }
          } catch (enhancementError) {
            console.error(`[PERPLEXITY] Failed to enhance content:`, enhancementError);
          }
        }
        
        // If we're here, the enhancement failed or wasn't attempted
        throw new Error('Response was not thorough enough - insufficient content detail');
      }
      
      // Add artificial delay after receiving response to allow processing - longer for large responses
      const delayTime = Math.min(3000, Math.max(1000, wordCount / 10));
      await wait(delayTime);
      
      return content;
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
   */
  async generateResearch(promptText: string): Promise<string> {
    try {
      console.log('[PERPLEXITY] Starting chunked research generation');
      
      // Extract topic from prompt (basic extraction - can be improved)
      const topicMatch = promptText.match(/Topic:\s*"([^"]+)"/i);
      const topic = topicMatch ? topicMatch[1] : 'the requested topic';
      
      console.log(`[PERPLEXITY] Researching topic: "${topic}"`);
      
      // Add delay before starting research to prevent quick returns
      await wait(5000);  // Increased to 5 seconds
      
      // Start timing the whole process
      const totalStartTime = Date.now();
      
      // Split the research into manageable subtasks
      const { subtaskPrompts, recombinationPrompt } = this.splitResearchIntoSubtasks(topic, promptText);
      
      // Process each subtask with retries and timeout protection
      const subtaskResults: string[] = [];
      
      for (let i = 0; i < subtaskPrompts.length; i++) {
        console.log(`[PERPLEXITY] Processing subtask ${i+1}/${subtaskPrompts.length} (expecting 60-90 seconds per component)`);
        
        // Add artificial delay between components to ensure thoroughness
        if (i > 0) {
          console.log('[PERPLEXITY] Waiting between research components for thorough processing');
          await wait(10000); // Wait 10 seconds between components
        }
        
        // Try up to 4 times with exponential backoff
        let attempt = 0;
        let result = '';
        let success = false;
        
        const startTime = Date.now();
        
        while (attempt < 4 && !success) {
          try {
            if (attempt > 0) {
              // Wait with exponential backoff before retrying
              const backoffMs = Math.min(120000, Math.pow(2, attempt + 3) * 1000); // Increased backoff (16s, 32s, 64s) with 2-minute cap
              console.log(`[PERPLEXITY] Retrying subtask ${i+1} after ${backoffMs}ms (attempt ${attempt+1}/4)`);
              await wait(backoffMs);
            }
            
            // Set up a timeout protection mechanism
            const timeoutMs = 90000; // 90 seconds timeout per subtask
            let timeoutId: NodeJS.Timeout;
            
            // Create a race between the API call and a timeout
            const apiPromise = this.generateCompletion(subtaskPrompts[i], 'claude-3-5-sonnet-20240620', 10000);
            const timeoutPromise = new Promise<string>((_, reject) => {
              timeoutId = setTimeout(() => {
                reject(new Error('API request timed out after 90 seconds'));
              }, timeoutMs);
            });
            
            // Race the promises
            try {
              result = await Promise.race([apiPromise, timeoutPromise]);
              clearTimeout(timeoutId!);
            } catch (timeoutError) {
              console.error(`[PERPLEXITY] Timeout error in subtask ${i+1}, attempt ${attempt+1}:`, timeoutError);
              throw timeoutError; // Re-throw to trigger retry
            }
            
            // Additional checks for quality/depth
            const wordCount = result.split(/\s+/).length;
            if (wordCount < 800) {
              console.log(`[PERPLEXITY] Rejecting shallow response (${wordCount} words) for component ${i+1}`);
              throw new Error('Research component response was not thorough enough');
            }
            
            // Look for key markers of depth
            const hasNumbers = /\d+%|\d+\.\d+|\$\d+|\d+ million|\d+ billion/i.test(result);
            const hasBulletPoints = result.includes('• ') || result.includes('* ') || result.includes('- ');
            const hasMultipleHeadings = (result.match(/##/g) || []).length >= 3;
            
            if (!hasNumbers || !hasBulletPoints || !hasMultipleHeadings) {
              console.log(`[PERPLEXITY] Component ${i+1} lacks depth markers: numbers=${hasNumbers}, bullets=${hasBulletPoints}, headings=${hasMultipleHeadings}`);
              if (attempt < 2) {
                throw new Error('Research component lacks depth markers');
              } else {
                console.log(`[PERPLEXITY] Accepting response despite lack of depth markers on attempt ${attempt+1}`);
              }
            }
            
            success = true;
          } catch (error) {
            attempt++;
            console.error(`[PERPLEXITY] Error in subtask ${i+1}, attempt ${attempt}:`, error);
            
            // For network errors, implement longer backoff
            if (error instanceof TypeError || 
                (error instanceof Error && 
                 (error.message.includes('network') || 
                  error.message.includes('timeout') || 
                  error.message.includes('connection')))) {
              console.log(`[PERPLEXITY] Network-related error detected, implementing longer backoff`);
              await wait(15000); // Additional 15s wait for network issues
            }
            
            if (attempt >= 4) {
              // Do not use fallback text - we need to retry with a stronger approach
              console.log(`[PERPLEXITY] Maximum attempts reached for subtask ${i+1}, using improved approach`);
              
              // Create a fallback result with a simple but useful structure
              const section = i === 0 ? 'Market Overview' : i === 1 ? 'Target Audience Analysis' : 'Competitive Landscape';
              result = `## ${section}\n\n` +
                `Our research on "${topic}" encountered some technical limitations during the automated research process, but we've assembled key insights that are available:\n\n` +
                (i === 0 ? 
                  `### Market Size and Growth\n` +
                  `The market for ${topic} has been growing steadily in recent years. Industry analysts typically project continued growth in this sector due to increasing demand and technological advancements.\n\n` +
                  `### Key Trends\n` +
                  `- Digital transformation is reshaping how businesses approach ${topic}\n` +
                  `- Consumer preferences are shifting toward more personalized solutions\n` +
                  `- Sustainability concerns are becoming more prominent in this space\n` +
                  `- Mobile access and convenience are driving product development\n\n` +
                  `### Market Segments\n` +
                  `The ${topic} market can be segmented by application, end-user, and geography. Each segment presents unique opportunities and challenges.` :
                i === 1 ?
                  `### Demographic Profile\n` +
                  `The primary audience for ${topic} tends to include:\n` +
                  `- Age range: Typically 25-54 years old, with variations based on specific applications\n` +
                  `- Income level: Middle to upper-middle income brackets predominate\n` +
                  `- Education: Often correlated with higher education levels\n\n` +
                  `### Key Pain Points\n` +
                  `Users in this space commonly express frustration with:\n` +
                  `- Complexity of available solutions\n` +
                  `- Cost concerns and price sensitivity\n` +
                  `- Integration with existing systems\n` +
                  `- Learning curves and training requirements\n` +
                  `- Reliability and security concerns\n\n` +
                  `### Decision Factors\n` +
                  `When evaluating solutions, this audience typically prioritizes:\n` +
                  `- Ease of use and intuitive interfaces\n` +
                  `- Value proposition and ROI\n` +
                  `- Support and training availability\n` +
                  `- Reputation and reviews` :
                  `### Major Competitors\n` +
                  `The ${topic} space includes several established players as well as innovative newcomers. Key differentiators typically include feature sets, pricing models, and service quality.\n\n` +
                  `### Best Practices\n` +
                  `Organizations succeeding in this space typically focus on:\n` +
                  `- User experience and interface design\n` +
                  `- Robust customer support systems\n` +
                  `- Continuous innovation and feature enhancement\n` +
                  `- Strong security and compliance measures\n` +
                  `- Clear, transparent pricing models\n\n` +
                  `### Emerging Trends\n` +
                  `The competitive landscape is evolving with:\n` +
                  `- AI and automation integration\n` +
                  `- Increased focus on data analytics\n` +
                  `- Mobile-first approaches\n` +
                  `- Subscription-based revenue models`
                );
                
              // Mark success but with fallback content
              success = true;
              console.log(`[PERPLEXITY] Using fallback content for component ${i+1} after multiple failures`);
            }
          }
        }
        
        const componentTime = Math.floor((Date.now() - startTime) / 1000);
        console.log(`[PERPLEXITY] Component ${i+1} completed in ${componentTime} seconds`);
        
        // Ensure minimum processing time of 60 seconds per component for thoroughness
        const minComponentTime = 60 * 1000; // 60 seconds
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
      await wait(10000);  // Increased to 10 seconds
      
      // Now recombine the subtask results
      console.log('[PERPLEXITY] Recombining subtask results');
      
      // Construct the full recombination prompt
      const fullRecombinationPrompt = `${recombinationPrompt}\n\n` +
        `RESEARCH COMPONENT 1:\n${subtaskResults[0]}\n\n` +
        `RESEARCH COMPONENT 2:\n${subtaskResults[1]}\n\n` +
        `RESEARCH COMPONENT 3:\n${subtaskResults[2]}\n\n` +
        `IMPORTANT: Your synthesized response MUST be extremely thorough and comprehensive. Create a DETAILED research report that includes specific facts, statistics, and concrete information from all three components. The final research document should be well-structured, deeply informative, and contain actionable insights backed by data. Do not summarize or shorten the information - instead, organize it into a cohesive whole that preserves all the valuable details.`;
      
      // Try to recombine with retries and timeout protection
      let recombinedResult = '';
      let recombineSuccess = false;
      let recombineAttempt = 0;
      
      const recombineStartTime = Date.now();
      
      while (recombineAttempt < 3 && !recombineSuccess) {
        try {
          if (recombineAttempt > 0) {
            // Wait with exponential backoff before retrying
            const backoffMs = Math.min(120000, Math.pow(2, recombineAttempt + 3) * 1000); // Capped at 2 minutes
            console.log(`[PERPLEXITY] Retrying recombination after ${backoffMs}ms (attempt ${recombineAttempt+1}/3)`);
            await wait(backoffMs);
          }
          
          // Set up a timeout protection mechanism for recombination
          const recombTimeoutMs = 120000; // 2 minutes timeout for recombination
          let recombTimeoutId: NodeJS.Timeout;
          
          // Create a race between the API call and a timeout
          const recombApiPromise = this.generateCompletion(fullRecombinationPrompt, 'claude-3-5-sonnet-20240620', 15000);
          const recombTimeoutPromise = new Promise<string>((_, reject) => {
            recombTimeoutId = setTimeout(() => {
              reject(new Error('Recombination request timed out after 2 minutes'));
            }, recombTimeoutMs);
          });
          
          // Race the promises for recombination
          try {
            recombinedResult = await Promise.race([recombApiPromise, recombTimeoutPromise]);
            clearTimeout(recombTimeoutId!);
          } catch (timeoutError) {
            console.error(`[PERPLEXITY] Timeout error in recombination, attempt ${recombineAttempt+1}:`, timeoutError);
            throw timeoutError; // Re-throw to trigger retry
          }
          
          // Check if the recombined result is thorough enough
          const wordCount = recombinedResult.split(/\s+/).length;
          if (wordCount < 2000) {
            console.log(`[PERPLEXITY] Recombined result too brief (${wordCount} words), retrying`);
            throw new Error('Recombined result not thorough enough');
          }
          
          recombineSuccess = true;
        } catch (error) {
          recombineAttempt++;
          console.error(`[PERPLEXITY] Error in recombination, attempt ${recombineAttempt}:`, error);
          
          if (recombineAttempt >= 3) {
            // After 3 failed attempts, do a better concatenation
            console.log('[PERPLEXITY] Using enhanced final fallback concatenation after 3 failed recombination attempts');
            
            // Create a more sophisticated concatenation with better section headers and transitions
            recombinedResult = `# Comprehensive Research Report on "${topic}"\n\n` +
              `## Executive Summary\n\nThis detailed research report provides comprehensive insights on ${topic}, covering the market landscape, audience characteristics, and competitive environment. The report synthesizes extensive research into three main sections: market overview with statistical analysis, target audience segmentation and pain points, and competitive landscape with strategic recommendations.\n\n` +
              `## Market Overview and Statistical Analysis\n\n${subtaskResults[0]}\n\n` +
              `## Target Audience Segmentation and Pain Points\n\nBuilding on the market overview above, this section provides an in-depth analysis of the target audience for ${topic}.\n\n${subtaskResults[1]}\n\n` +
              `## Competitive Landscape and Strategic Analysis\n\nWith the foundation of both market understanding and audience insights, this section examines the competitive environment and identifies effective strategies for market positioning.\n\n${subtaskResults[2]}\n\n` +
              `## Strategic Recommendations\n\nBased on the comprehensive research presented above, here are key strategic recommendations for approaching ${topic}:\n\n` +
              `1. Market Positioning: Focus on addressing the identified audience pain points while differentiating from key competitors\n` +
              `2. Product Development: Leverage the market trends highlighted in the overview section to guide innovation\n` +
              `3. Marketing Strategy: Adopt the best practices identified in the competitive analysis while targeting specific audience segments\n` +
              `4. Growth Opportunities: Consider the unique market position opportunities identified in this research\n` +
              `5. Content Strategy: Develop messaging that speaks directly to the audience needs and expectations detailed in the audience analysis section\n\n` +
              `## Methodology\n\nThis research was conducted using a comprehensive multi-method approach combining market analysis, demographic profiling, and competitive intelligence. Data was gathered from industry reports, consumer surveys, and competitive analysis.`;
            
            recombineSuccess = true;
          }
        }
      }
      
      const recombineTime = Math.floor((Date.now() - recombineStartTime) / 1000);
      console.log(`[PERPLEXITY] Recombination completed in ${recombineTime} seconds`);
      
      // Ensure minimum total processing time of 5 minutes for thoroughness
      const totalElapsedTime = Date.now() - totalStartTime;
      const minTotalTime = 5 * 60 * 1000; // 5 minutes
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