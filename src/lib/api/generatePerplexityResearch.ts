/**
 * Helper function for generating research with Perplexity API
 * Extracted to its own file to avoid circular dependencies
 */

/**
 * Generate research on a specific topic using Perplexity API
 * This implementation uses a job-based pattern with polling to avoid timeouts
 */
export async function generatePerplexityResearch(
  topic: string,
  context: string,
  sources?: string[],
  language?: string,
  companyName?: string
): Promise<string> {
  try {
    console.log('Starting Perplexity research job with:', { 
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
    
    // First, create a research job
    const jobResponse = await fetch('/api/perplexity/research', {
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
    
    if (!jobResponse.ok) {
      const errorData = await jobResponse.json().catch(() => ({}));
      throw new Error(`API error: ${jobResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    const jobData = await jobResponse.json();
    
    console.log('Research job created:', jobData);
    
    if (!jobData.jobId) {
      throw new Error('No job ID returned from research API');
    }
    
    // Poll for job completion
    const maxPollAttempts = 30; // 5 minutes maximum (10 second intervals)
    let pollAttempt = 0;
    
    // Function to poll the job status
    const pollJobStatus = async (): Promise<string> => {
      if (pollAttempt >= maxPollAttempts) {
        throw new Error('Research job timed out after maximum polling attempts');
      }
      
      pollAttempt++;
      
      // Add exponential backoff as polling attempts increase
      const delayTime = Math.min(10000, 2000 + (pollAttempt * 500));
      console.log(`Polling job status (attempt ${pollAttempt}/${maxPollAttempts}), waiting ${delayTime}ms`);
      
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, delayTime));
      
      // Check job status
      const statusResponse = await fetch(`/api/perplexity/research?jobId=${jobData.jobId}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({}));
        throw new Error(`Job status check failed: ${statusResponse.status} - ${JSON.stringify(errorData)}`);
      }
      
      const statusData = await statusResponse.json();
      console.log('Job status:', statusData);
      
      // If job completed, return the research content
      if (statusData.status === 'completed' && statusData.research) {
        return statusData.research;
      }
      
      // If job failed, throw an error
      if (statusData.status === 'failed') {
        throw new Error(`Research job failed: ${statusData.error || 'Unknown error'}`);
      }
      
      // Report progress if available
      if (statusData.progress) {
        console.log(`Research progress: ${statusData.progress}%`);
      }
      
      // Job still processing, continue polling
      return pollJobStatus();
    };
    
    // Start polling
    const research = await pollJobStatus();
    
    if (!research) {
      throw new Error('No research content returned from Perplexity API');
    }
    
    return research;
  } catch (error) {
    console.error('Error generating Perplexity research:', error);
    throw error;
  }
} 