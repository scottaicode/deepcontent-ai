/**
 * Perplexity API Client
 * 
 * This class provides methods for interacting with the Perplexity API,
 * including generating research on specific topics.
 */

export class PerplexityClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.perplexity.ai/chat/completions';
  private model: string = 'sonar-deep-research';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  /**
   * Generate research on a specific topic using Perplexity API
   * Now with retry logic for network issues
   */
  async generateResearch(prompt: string, options: any = {}): Promise<string> {
    // Maximum number of retry attempts
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: Error | null = null;
    
    while (retryCount < maxRetries) {
      try {
        const maxTokens = options.maxTokens || 4000;
        const temperature = options.temperature || 0.2;
        const timeoutMs = options.timeoutMs || 360000; // 6 minutes timeout
        const language = options.language || 'en';
        
        // Create current date formatting for citations - MOVED UP BEFORE PROMPT CREATION
        const currentDate = new Date();
        const formattedDate = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
        
        // Extract company name from prompt for system prompt enhancement
        let companyName = '';
        const companyMatch = prompt.match(/company-specific information about "(.*?)"/i);
        if (companyMatch && companyMatch[1]) {
          companyName = companyMatch[1];
          console.log('Detected company name from prompt:', companyName);
        } else {
          // Try to extract company name from topic
          const topicMatch = prompt.match(/topic:\s*"([^"]+)"/i);
          if (topicMatch && topicMatch[1]) {
            const potentialCompany = topicMatch[1];
            // Check if this looks like a company name (typically a single word or 2-3 words)
            if (/^(\w+)(\s+\w+){0,2}$/.test(potentialCompany) && !potentialCompany.includes(' for ')) {
              companyName = potentialCompany;
              console.log('Extracted potential company name from topic:', companyName);
            }
          }
        }
        
        // Create base company research instructions
        const companyResearchInstructions = companyName ? 
        `MANDATORY COMPANY RESEARCH INSTRUCTIONS:
1. FIRST AND MOST IMPORTANT: Visit the official website of ${companyName} at https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com (also try .net, .org, .co if .com doesn't work)
2. ALWAYS check LinkedIn company page at https://www.linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '')}/
3. ALWAYS look at social media profiles: Facebook, Twitter/X, Instagram
4. Look for specific product names, ingredients, pricing, and unique features
5. Find recent news articles and press releases about ${companyName}
6. Identify key executives and their backgrounds
7. Look for customer reviews and testimonials
8. Compare with 2-3 competitors to highlight differentiators

For each research section, you MUST include specific information about ${companyName} BEFORE discussing general industry trends.

CRITICAL: YOU MUST PROVIDE DIRECT EVIDENCE OF CHECKING THESE SOURCES BY STATING:
- "Upon examining Tranont's official website (www.tranont.com), I found the following specific information: [DETAILS]"
- "According to Tranont's LinkedIn company page, [SPECIFIC DETAILS]"
- "Tranont's Facebook page shows [SPECIFIC DETAILS]"

The first section of your research MUST be titled "Company-Specific Information" and contain AT LEAST 300 words of information EXCLUSIVELY from ${companyName}'s website and social media. This is a FIRM REQUIREMENT.

CITATION REQUIREMENT: For EACH piece of company-specific information you provide, you MUST explicitly state where you found it:
- "According to ${companyName}'s official website..."
- "From their LinkedIn company page..."
- "As stated in their Facebook post dated..."
- "According to the CEO's profile..."

FOR EVERY PRODUCT OR SERVICE from ${companyName} mentioned, include at least 3 specific details such as:
- Exact product name
- Price point (if available)
- Key ingredients or components
- Target audience
- Key benefits claimed by the company
- Unique selling propositions

You MUST directly quote from company materials where relevant.` 
        : '';
        
        // Create language-specific instructions
        const languageSpecificInstructions = language === 'es' ? 
        `INSTRUCCIONES DE INVESTIGACIÓN DE EMPRESAS OBLIGATORIAS:
1. PRIMERO Y MÁS IMPORTANTE: Visita el sitio web oficial de ${companyName} en https://www.${companyName?.toLowerCase().replace(/\s+/g, '')}.com (también prueba .net, .org, .co si .com no funciona)
2. SIEMPRE verifica la página de empresa en LinkedIn en https://www.linkedin.com/company/${companyName?.toLowerCase().replace(/\s+/g, '')}/
3. SIEMPRE revisa los perfiles de redes sociales: Facebook, Twitter/X, Instagram
4. Busca nombres específicos de productos, ingredientes, precios y características únicas
5. Encuentra artículos de noticias recientes y comunicados de prensa sobre ${companyName}
6. Identifica a los ejecutivos clave y sus antecedentes
7. Busca reseñas y testimonios de clientes
8. Compara con 2-3 competidores para destacar los diferenciadores

Para cada sección de investigación, DEBES incluir información específica sobre ${companyName} ANTES de analizar las tendencias generales de la industria.

REQUISITO DE CITACIÓN: Para CADA información específica de la empresa que proporciones, DEBES indicar explícitamente dónde la encontraste:
- "Según el sitio web oficial de ${companyName}..."
- "De su página de empresa en LinkedIn..."
- "Según lo indicado en su publicación de Facebook con fecha..."
- "Según el perfil del CEO..."

PARA CADA PRODUCTO O SERVICIO de ${companyName} mencionado, incluye al menos 3 detalles específicos como:
- Nombre exacto del producto
- Precio (si está disponible)
- Ingredientes o componentes clave
- Público objetivo
- Beneficios clave que afirma la empresa
- Propuestas únicas de venta

DEBES citar directamente de los materiales de la empresa cuando sea relevante.` 
        : companyResearchInstructions;
        
        // Extract content type from prompt
        const contentType = prompt.includes('COMPANY RESEARCH STRUCTURE') ? 'business' : 
                          prompt.includes('PERSONAL BRAND RESEARCH STRUCTURE') ? 'personal_brand' :
                          prompt.includes('EXPERT RESEARCH STRUCTURE') ? 'expert' :
                          prompt.includes('CREATOR CONTENT RESEARCH STRUCTURE') ? 'hobbyist' : 'general';
        
        console.log('Detected content type from prompt:', contentType);
        
        // Create an enhanced system prompt that adapts to the content type
        const systemPrompt = companyName ? 
          `You are a highly specialized research assistant focused on providing comprehensive, accurate, and detailed ${contentType === 'business' ? 'company' : contentType === 'personal_brand' ? 'personal brand' : contentType === 'expert' ? 'expert' : contentType === 'hobbyist' ? 'creator content' : 'general'} research.

${language === 'es' ? languageSpecificInstructions : companyResearchInstructions}

CRITICAL RESEARCH PROCESS: You must follow these steps IN ORDER:
1. Start by USING THE SCRAPED WEBSITE CONTENT I HAVE PROVIDED - this is your most authoritative source
2. MANDATORY: You MUST quote directly from the scraped website content I've provided
3. If I've provided website content, do NOT rely on your own knowledge of the ${contentType === 'business' ? 'company' : 'creator/expert'} - use what I've given you
4. For any analytical section, reference specific details from the scraped website content I provided

STRICT REQUIREMENT: Your response MUST begin with a section that focuses on the ${contentType === 'business' ? 'company' : contentType === 'personal_brand' ? 'creator' : contentType === 'expert' ? 'expert' : 'creator'} profile and information from the scraped data.

STRICT FORMAT FOR CITATIONS:
"According to the scraped content from ${contentType === 'business' ? companyName + "'s" : "the creator's/expert's"} website: [direct quote from the provided scraped content]"
"From the website content I provided: [specific details from scraped content]"

Your research MUST contain SPECIFIC DETAILS from the scraped website content including:
${contentType === 'business' ? 
`- Actual product names exactly as shown in the scraped content
- Pricing information from the scraped content (if available)
- Company history details from the scraped content` :
contentType === 'personal_brand' ? 
`- Service offerings and methodologies from the scraped content
- Unique approach and philosophy from the scraped content
- Client outcomes or testimonials from the scraped content` :
contentType === 'expert' ? 
`- Methodologies and frameworks from the scraped content
- Areas of specialized knowledge from the scraped content
- Key contributions or innovations from the scraped content` :
`- Techniques and approaches from the scraped content
- Content themes and style elements from the scraped content
- Creative philosophy or unique elements from the scraped content`}
- Direct quotes from the scraped website paragraphs (marked as quotes)
- At least 15-20 explicit references to the scraped website content throughout your research

AT LEAST 60% of your research MUST focus specifically on ${companyName ? companyName : "the subject"}, using the scraped website data I've provided. Your research will be considered INCOMPLETE if it doesn't extensively cite and quote from the scraped website content.` 
          : 
          'You are a research assistant that provides comprehensive, accurate, and detailed responses based on the latest available information. When provided with specific user data like scraped websites, transcripts, or image analysis, you MUST prioritize and heavily reference that information in your response.';
        
        console.log('Perplexity API request configuration:', {
          url: this.baseUrl,
          model: this.model,
          maxTokens,
          temperature,
          timeoutMs,
          hasCompanyFocus: !!companyName,
          language,
          retryAttempt: retryCount + 1
        });
        
        // Log a preview of the system prompt for debugging
        console.log('System prompt preview:', systemPrompt.substring(0, 100) + '...');
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        // Configure request body for sonar-deep-research model
        // This model has built-in research capabilities, so we don't need to specify web search tools
        const requestBody: any = {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        };
        
        // Replace formattedDate in the system prompt if it's used
        if (systemPrompt.includes('${formattedDate}')) {
          requestBody.messages[0].content = systemPrompt.replace(/\${formattedDate}/g, formattedDate);
        }
        
        // Try the API call with a fetch that handles connection errors
        console.log(`Attempt ${retryCount + 1} of ${maxRetries}: Calling Perplexity API...`);
        
        try {
          // Call API
          const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });
          
          // Clear timeout
          clearTimeout(timeoutId);
          
          // Check response
          console.log('Perplexity API response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          // Parse response
          const data = await response.json();
          console.log('Perplexity API response received successfully');
          
          // Extract research content
          const research = data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : '';
            
          if (!research) {
            throw new Error('No research content found in API response');
          }
          
          return research;
        } catch (fetchError: any) {
          // If this is a network error, we'll retry
          if (
            fetchError.message.includes('fetch failed') || 
            fetchError.message.includes('network') || 
            fetchError.message.includes('connection') ||
            fetchError.name === 'AbortError'
          ) {
            lastError = new Error(`Network error (attempt ${retryCount + 1}): ${fetchError.message}`);
            console.warn(`Network error encountered, retrying (${retryCount + 1}/${maxRetries}):`, fetchError.message);
            retryCount++;
            
            // Add exponential backoff delay before retrying
            const delayMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
            console.log(`Waiting ${delayMs}ms before retry attempt ${retryCount + 1}...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            // Continue to next iteration
            continue;
          }
          
          // If it's not a network error, rethrow
          console.error('Non-network error from Perplexity API:', fetchError);
          throw fetchError;
        }
      } catch (error: any) {
        // Store the last error
        lastError = error;
        
        // If this wasn't already a network retry condition from the inner catch
        if (retryCount < maxRetries - 1) {
          retryCount++;
          console.warn(`Error in Perplexity request, retrying (${retryCount}/${maxRetries}):`, error.message);
          
          // Add exponential backoff delay before retrying
          const delayMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
          console.log(`Waiting ${delayMs}ms before retry attempt ${retryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // We've exhausted our retries, rethrow the last error
          console.error('Error generating research with Perplexity after all retry attempts:', error);
          throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
    
    // If we get here, we've exhausted retries
    throw lastError || new Error('Failed to generate research after multiple attempts');
  }
} 