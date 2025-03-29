import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";

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
    const { sourceImage, targetImage, prompt } = await request.json();

    // Validate inputs - require at least sourceImage and prompt
    if (!sourceImage || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: sourceImage and prompt" },
        { status: 400 }
      );
    }

    console.log("Initializing Gemini 2.0 Flash image generation model...");
    
    // Create model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation"
    });
    
    try {
      // Create the prompt
      const formattedPrompt = targetImage
        ? `Edit these images according to these instructions: ${prompt}`
        : `Edit this image according to these instructions: ${prompt}`;

      // Log information
      console.log(`Processing edit request with ${targetImage ? 'two images' : 'one image'}`);
      console.log(`Source image size: ${sourceImage.length} chars`);
      if (targetImage) {
        console.log(`Target image size: ${targetImage.length} chars`);
      }
      console.log(`Prompt: "${formattedPrompt}"`);

      // Prepare the request parts
      const parts = [
        { text: formattedPrompt },
        { 
          inlineData: {
            mimeType: "image/jpeg",
            data: sourceImage
          }
        }
      ];
      
      // Add target image if it exists
      if (targetImage) {
        parts.push({ 
          inlineData: {
            mimeType: "image/jpeg",
            data: targetImage
          }
        });
      }

      // Make the API request
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: parts
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 1,
          topK: 32,
          maxOutputTokens: 4096
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }
        ]
      });
      
      console.log("Request sent to Gemini API, waiting for response...");
      
      if (!result.response) {
        throw new Error("No response received from Gemini");
      }
      
      // Extract parts from the response
      const responseParts = result.response.candidates?.[0]?.content?.parts || [];
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
        
        let feedbackMessage = "Your API key may not have access to image generation capabilities. You may need to upgrade to a paid tier or ensure your API key has the necessary permissions.";
        
        if (textResponse && textResponse.toLowerCase().includes("policy") || 
            textResponse && textResponse.toLowerCase().includes("violate") ||
            textResponse && textResponse.toLowerCase().includes("cannot generate")) {
          feedbackMessage = "The requested edit may not be possible due to content policy restrictions. Please try a different edit or image.";
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
      
      if (error.message?.includes('PERMISSION_DENIED') || 
          error.message?.includes('insufficient permission') ||
          error.message?.includes('not available in your region')) {
        return NextResponse.json({
          error: `Gemini image generation API error: ${error.message}. This typically requires a paid tier or specific regional access.`,
          prompt: prompt,
          image: `data:image/jpeg;base64,${sourceImage}`,
          apiLimited: true
        });
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error("Error processing request:", error);
    
    return NextResponse.json({
      error: `Gemini AI Error: ${error.message || "An unknown error occurred"}`,
      apiLimited: error.message?.includes('permission') || error.message?.includes('region') || error.message?.includes('NOT_FOUND')
    }, { status: 500 });
  }
} 