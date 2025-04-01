// Simple script to test Anthropic API key
const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config({ path: '.env.local' });

// Get API key from environment variables only
const apiKey = process.env.ANTHROPIC_API_KEY;

async function testAnthropicAPI() {
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set');
    console.error('Please add it to your .env.local file or set it as an environment variable');
    return false;
  }

  console.log('Testing Anthropic API connection...');
  console.log(`Using API key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  
  try {
    // Create Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });
    
    // Test with a simple message
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 100,
      temperature: 0.7,
      system: 'You are a helpful assistant.',
      messages: [
        { role: 'user', content: 'Hello, are you working correctly? Please respond with a short test message.' }
      ]
    });
    
    // Check the response
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      const firstContent = response.content[0];
      if (typeof firstContent === 'object' && 'text' in firstContent) {
        console.log('SUCCESS! API connection working correctly.');
        console.log('Response from Claude API:');
        console.log(firstContent.text);
        return true;
      }
    }
    
    console.error('ERROR: Received unexpected response format');
    console.error(JSON.stringify(response, null, 2));
    return false;
    
  } catch (error) {
    console.error('ERROR: Failed to connect to Anthropic API');
    console.error(error.message);
    
    // Provide more specific debugging information
    if (error.message.includes('api key')) {
      console.error('This appears to be an API key issue. Please check if your key is valid and properly formatted.');
    } else if (error.message.includes('rate')) {
      console.error('This appears to be a rate limit issue. Try again later or check your usage limits.');
    } else if (error.message.includes('network')) {
      console.error('This appears to be a network connectivity issue. Check your internet connection.');
    }
    
    return false;
  }
}

// Run the test
testAnthropicAPI().then((success) => {
  if (success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}); 