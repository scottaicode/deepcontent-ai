/**
 * Helper function for generating research with Perplexity API
 * Extracted to its own file to avoid circular dependencies
 */

/**
 * Generate research on a specific topic using Perplexity API
 */
export async function generatePerplexityResearch(
  topic: string,
  context: string,
  sources?: string[],
  language?: string,
  companyName?: string
): Promise<string> {
  try {
    console.log('Calling Perplexity research API with:', { 
      topic, 
      context,
      sources: sources || [],
      language,
      companyName: companyName || 'N/A'
    });
    
    // Validate topic to ensure it's not empty
    if (!topic || topic.trim() === '') {
      throw new Error('Empty research topic provided to Perplexity API');
    }
    
    const response = await fetch('/api/perplexity/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: topic.trim(), // Ensure clean topic
        context: context.trim(),
        sources: sources || [],
        language,
        companyName // Pass company name to the API route
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    if (!data.research) {
      throw new Error('No research content returned from Perplexity API');
    }
    
    return data.research;
  } catch (error) {
    console.error('Error generating Perplexity research:', error);
    throw error;
  }
} 