import { NextResponse } from "next/server";

// Mock implementation to avoid build errors
export async function POST(req: Request) {
  try {
    // Always return a mock response
    return NextResponse.json({
      text: "This is a mock transcription. The actual OpenAI transcription API requires configuration."
    });
  } catch (error) {
    console.error("Error in transcription API:", error);
    return NextResponse.json(
      { error: "Error processing audio transcription" },
      { status: 500 }
    );
  }
}
