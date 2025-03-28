import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  console.log("Claude API test endpoint called");
  
  try {
    // Simplified response with basic information only
    const response: {
      exists: boolean;
      isWorking: boolean;
      error: string | null;
      message: string;
    } = {
      exists: false,
      isWorking: false,
      error: null,
      message: "Claude API test"
    };
    
    // Check if API key exists
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("API key exists:", apiKey ? "Yes" : "No");
    
    if (!apiKey) {
      response.error = "API key not found in environment variables";
      return NextResponse.json(response, { status: 400 });
    }
    
    // API key exists
    response.exists = true;
    
    // Make a simple API call to check if the key works
    try {
      console.log("Attempting to call Anthropic API...");
      const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 10,
          messages: [
            { role: "user", content: "Test" }
          ]
        })
      });
      
      console.log("API response status:", apiResponse.status);
      
      const data = await apiResponse.json();
      console.log("API response received");
      
      if (apiResponse.ok) {
        response.isWorking = true;
        response.message = "Claude API key is valid and working";
      } else {
        response.error = data.error?.message || "API returned an error";
        response.message = "Claude API key validation failed";
      }
    } catch (apiError: any) {
      console.error("Error calling Anthropic API:", apiError);
      response.error = apiError.message || "Error connecting to Anthropic API";
      response.message = "Failed to connect to Anthropic API";
    }
    
    return NextResponse.json(response);
    
  } catch (e: any) {
    console.error("Unexpected error in Claude API test endpoint:", e);
    return NextResponse.json({
      exists: false,
      isWorking: false,
      error: e.message || "Unknown error",
      message: "Test endpoint failed"
    }, { status: 500 });
  }
} 