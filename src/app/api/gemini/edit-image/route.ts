import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Set a longer timeout for this API route (60 seconds instead of default 15)
export const maxDuration = 60;

// Initialize the Gemini API with the key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY environment variable is not set" },
      { status: 500 }
    );
  }

  try {
    const { sourceImage, targetImage, prompt, temperature = 0.7 } = await request.json();

    // Validate inputs - require at least sourceImage and prompt
    if (!sourceImage || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: sourceImage and prompt" },
        { status: 400 }
      );
    }

    console.log("Initializing Gemini 2.0 Flash image generation model...");
    console.log(`Using temperature: ${temperature}`);
    
    // Create model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation"
    });
    
    try {
      // Create the prompt
      const formattedPrompt = targetImage
        ? `Look at these images. I want you to edit them according to these instructions: ${prompt}. Create a new image that applies these changes visually. Be creative and make the edits visible and realistic.`
        : `Look at this image of ${sourceImage.length > 50000 ? 'food' : 'a scene'}. I want you to edit it according to these instructions: "${prompt}". Create a new version of this image that applies these changes visually. The edits should be obvious and realistic. Your task is to generate an edited image, not just describe how you would edit it.`;

      // Log information
      console.log(`Processing edit request with ${targetImage ? 'two images' : 'one image'}`);
      console.log(`Source image size: ${sourceImage.length} chars`);
      if (targetImage) {
        console.log(`Target image size: ${targetImage.length} chars`);
      }
      console.log(`Prompt: "${formattedPrompt}"`);

      // Prepare the request parts - IMPORTANT: Format exactly as in the docs
      const parts = [];
      
      // Add text part first
      parts.push({ text: formattedPrompt });
      
      // Add source image
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: sourceImage
        }
      });
      
      // Add target image if it exists
      if (targetImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: targetImage
          }
        });
      }

      // Make the API call exactly as shown in the documentation examples
      const response = await model.generateContent({
        contents: [{ 
          role: "user",
          parts 
        }],
        generationConfig: {
          temperature: parseFloat(temperature.toString()), // Convert to number for safety
          topP: 1,
          topK: 32,
          maxOutputTokens: 4096,
          responseModalities: ["Text", "Image"]
        }
      } as any);
      
      console.log("Request sent to Gemini API, waiting for response...");
      
      if (!response.response) {
        throw new Error("No response received from Gemini");
      }
      
      // Extract parts from the response
      const responseParts = response.response.candidates?.[0]?.content?.parts || [];
      console.log("Response parts count:", responseParts.length);
      
      // Log the types of parts received
      console.log("Response parts types:", responseParts.map(p => {
        if (p.inlineData) return `image (${p.inlineData.mimeType})`;
        if (p.text) return `text (${p.text.substring(0, 20)}...)`;
        return "unknown";
      }));
      
      // Look for image parts
      const imageParts = responseParts.filter(part => part.inlineData?.mimeType?.startsWith("image/"));
      const textParts = responseParts.filter(part => part.text);
      
      const textResponse = textParts.map(part => part.text).join("\n");
      
      if (imageParts.length > 0 && imageParts[0].inlineData?.data) {
        console.log("Image successfully generated!");
        return NextResponse.json({
          textResponse: textResponse || "Image edited successfully.",
          prompt: prompt,
          image: `data:${imageParts[0].inlineData.mimeType};base64,${imageParts[0].inlineData.data}`,
          modelUsed: "Gemini 2.0 Flash Image Generation"
        });
      } else {
        console.log("No image in response, got text only");
        
        let feedbackMessage = "The image generation API returned only text, not an edited image. This might be because:\n\n" + 
          "1. Your API key may not have access to image generation capabilities (paid tier required)\n" +
          "2. Your API access region may not support image generation\n" +
          "3. The specific edit requested may not be supported by the model\n" +
          "4. Image generation is still experimental and may not work for all prompts";
        
        if (textResponse) {
          feedbackMessage += "\n\nAPI Response: " + textResponse;
        }
        
        if (textResponse && (
            textResponse.toLowerCase().includes("policy") || 
            textResponse.toLowerCase().includes("violate") ||
            textResponse.toLowerCase().includes("cannot generate"))) {
          feedbackMessage = "The requested edit may not be possible due to content policy restrictions. Please try a different edit or image." +
            "\n\nAPI Response: " + textResponse;
        }
        
        return NextResponse.json({
          textResponse: feedbackMessage,
          prompt: prompt,
          image: `data:image/jpeg;base64,${sourceImage}`,
          modelUsed: "Gemini 2.0 Flash (text only)",
          apiLimited: true
        });
      }
    } catch (error: any) {
      console.error("Error during image generation:", error);
      
      // Format a more helpful error message
      let errorMessage = `Gemini image generation API error: ${error.message}`;
      
      if (error.message?.includes('PERMISSION_DENIED') || 
          error.message?.includes('insufficient permission') ||
          error.message?.includes('not available in your region')) {
        errorMessage = `Gemini image generation requires a paid tier API key and supported region. Error: ${error.message}`;
      }
      
      if (error.message?.includes('NOT_FOUND')) {
        errorMessage = `The requested model (gemini-2.0-flash-exp-image-generation) was not found. This is an experimental model and may require special access.`;
      }
      
      return NextResponse.json({
        error: errorMessage,
        prompt: prompt,
        image: sourceImage ? `data:image/jpeg;base64,${sourceImage}` : null,
        apiLimited: true
      });
    }
  } catch (error: any) {
    console.error("Error processing request:", error);
    
    return NextResponse.json({
      error: `Gemini AI Error: ${error.message || "An unknown error occurred"}`,
      apiLimited: error.message?.includes('permission') || 
                error.message?.includes('region') || 
                error.message?.includes('NOT_FOUND') ||
                error.message?.includes('API key')
    }, { status: 500 });
  }
} 