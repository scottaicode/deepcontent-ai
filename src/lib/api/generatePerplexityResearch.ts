/**
 * Helper function for generating research with Perplexity API
 * Extracted to its own file to avoid circular dependencies
 */

/**
 * Generate research on a specific topic using Perplexity API
 * This implementation uses a job-based pattern with polling to avoid timeouts
 * 
 * IMPORTANT: This function is configured to ALWAYS request fresh research
 * and bypass any caching mechanisms.
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
    
    console.log('Skipping cache check to generate fresh research');
    
    // Create a research job
    console.log('Making POST request to /api/perplexity/research');
    const jobResponse = await fetch('/api/perplexity/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'X-Force-Fresh': 'true'
      },
      body: JSON.stringify({
        topic: topic.trim(), // Ensure clean topic
        context: context.trim(),
        sources: sources || [],
        language,
        companyName, // Pass company name to the API route
        timestamp: Date.now(), // Add timestamp to prevent caching
        forceNew: true // Explicitly indicate we want fresh research
      }),
    });
    
    if (!jobResponse.ok) {
      let errorData = {};
      try {
        errorData = await jobResponse.json();
      } catch (e) {
        console.error('Error parsing job response:', e);
      }
      console.error('API error creating research job:', jobResponse.status, errorData);
      throw new Error(`API error: ${jobResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    const jobData = await jobResponse.json();
    
    console.log('Research job created:', jobData);
    
    // Direct response with research (no job ID)
    if (jobData.research) {
      console.log('Direct research response received, length:', jobData.research.length);
      return jobData.research;
    }
    
    if (!jobData.jobId) {
      throw new Error('No job ID returned from research API');
    }
    
    // Poll for job completion
    const maxPollAttempts = 60; // 10 minutes maximum (up from 5 minutes)
    let pollAttempt = 0;
    let consecutiveErrors = 0;
    
    // Store progress updates for reporting
    let lastReportedProgress = 0;
    
    // Function to dispatch progress events that the UI can listen to
    const reportProgress = (progress: number, message: string) => {
      if (progress > lastReportedProgress) {
        lastReportedProgress = progress;
        // Only dispatch if we're in a browser environment
        if (typeof window !== 'undefined') {
          const progressEvent = new CustomEvent('perplexity-research-progress', { 
            detail: { progress, message } 
          });
          window.dispatchEvent(progressEvent);
          console.log(`Research progress: ${progress}% - ${message}`);
        }
      }
    };
    
    // Report initial progress
    reportProgress(5, 'Starting research job...');
    
    // Function to poll the job status
    const pollJobStatus = async (): Promise<string> => {
      if (pollAttempt >= maxPollAttempts) {
        throw new Error('Research job timed out after maximum polling attempts');
      }
      
      pollAttempt++;
      
      // Add exponential backoff as polling attempts increase, but with a minimum delay
      // This ensures we wait longer between polls as time goes on
      const minDelay = 2000; // Minimum 2 seconds
      const maxDelay = 15000; // Maximum 15 seconds
      
      // Calculate delay with exponential backoff but capped
      const exponentialDelay = Math.min(maxDelay, minDelay * Math.pow(1.2, pollAttempt - 1));
      
      // Add slight randomization to avoid thundering herd problem
      const jitter = Math.random() * 500;
      const delayTime = Math.floor(exponentialDelay + jitter);
      
      // Report waiting status for longer waits
      if (delayTime > 5000 && pollAttempt % 3 === 0) {
        reportProgress(
          Math.min(85, Math.max(lastReportedProgress, 10 + (pollAttempt * 2))), 
          'Continuing research analysis...'
        );
      }
      
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, delayTime));
      
      try {
        // Check job status with cache busting parameters
        const statusResponse = await fetch(`/api/perplexity/research?jobId=${jobData.jobId}&timestamp=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'X-Force-Fresh': 'true'
          }
        });
        
        if (!statusResponse.ok) {
          let errorData = {};
          try {
            errorData = await statusResponse.json();
          } catch (e) {
            console.error('Error parsing status response:', e);
          }
          
          // Count consecutive errors
          consecutiveErrors++;
          
          // If we've had too many consecutive errors, throw an error
          if (consecutiveErrors >= 3) {
            throw new Error(`Job status check failed after multiple attempts: ${statusResponse.status} - ${JSON.stringify(errorData)}`);
          }
          
          // Otherwise, just retry
          console.warn(`Job status check error (attempt ${pollAttempt}, consecutive errors: ${consecutiveErrors}):`, errorData);
          return pollJobStatus();
        }
        
        // Reset consecutive errors on success
        consecutiveErrors = 0;
        
        const statusData = await statusResponse.json();
        
        // If job completed, return the research content
        if (statusData.status === 'completed' && statusData.research) {
          // Report 100% progress on completion
          reportProgress(100, 'Research complete!');
          return statusData.research;
        }
        
        // If job failed, throw an error
        if (statusData.status === 'failed') {
          throw new Error(`Research job failed: ${statusData.error || 'Unknown error'}`);
        }
        
        // Report progress if available
        if (statusData.progress) {
          const progressValue = parseInt(statusData.progress);
          if (!isNaN(progressValue) && progressValue > 0) {
            // Use different messages based on progress
            let message = 'Researching topic...';
            
            if (progressValue < 30) {
              message = 'Gathering initial research data...';
            } else if (progressValue < 60) {
              message = 'Analyzing research findings...';
            } else if (progressValue < 90) {
              message = 'Compiling comprehensive results...';
            } else {
              message = 'Finalizing research document...';
            }
            
            reportProgress(progressValue, message);
          }
        } else {
          // If no progress reported, use the attempt count to estimate progress
          // This ensures the UI shows some movement even if the backend isn't reporting progress
          const estimatedProgress = Math.min(80, 5 + (pollAttempt * 3));
          if (estimatedProgress > lastReportedProgress) {
            reportProgress(estimatedProgress, 'Continuing research...');
          }
        }
        
        // Job still processing, continue polling
        return pollJobStatus();
      } catch (error: any) {
        // Handle network errors with more tolerance
        if (error.message.includes('fetch failed') || error.name === 'TypeError') {
          consecutiveErrors++;
          
          if (consecutiveErrors >= 5) {
            throw new Error('Network error: Failed to check research status after multiple attempts');
          }
          
          console.warn(`Network error during polling (attempt ${pollAttempt}, consecutive errors: ${consecutiveErrors}):`, error);
          
          // Wait a bit longer for network issues and retry
          await new Promise(resolve => setTimeout(resolve, 5000));
          return pollJobStatus();
        }
        
        // For other errors, rethrow
        throw error;
      }
    };
    
    // Start polling only if we have a job ID
    if (jobData.jobId) {
      const research = await pollJobStatus();
      
      if (!research) {
        throw new Error('No research content returned from Perplexity API');
      }
      
      return research;
    } else if (jobData.research) {
      // If direct research was provided, return it
      return jobData.research;
    } else {
      throw new Error('No research content or job ID returned from API');
    }
  } catch (error: any) {
    console.error('Error generating Perplexity research:', error);
    throw error;
  }
} 