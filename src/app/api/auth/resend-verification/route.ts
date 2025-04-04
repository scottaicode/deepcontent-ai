import { getAuth, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeApp, deleteApp } from "firebase/app";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase on the server side
const app = initializeApp(firebaseConfig, "server-verification-app");
const auth = getAuth(app);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Sign in the user to get their user object
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Send verification email
    await sendEmailVerification(user);

    return NextResponse.json(
      { message: "Verification email sent successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error resending verification email:", error);
    
    // Return appropriate error message
    const errorCode = error.code;
    let errorMessage = "Failed to send verification email";
    
    if (errorCode === "auth/user-not-found") {
      errorMessage = "No user found with this email";
    } else if (errorCode === "auth/wrong-password") {
      errorMessage = "Invalid password";
    } else if (errorCode === "auth/too-many-requests") {
      errorMessage = "Too many attempts. Please try again later";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  } finally {
    // Clean up the app instance to avoid memory leaks
    try {
      await auth.signOut();
      deleteApp(app);
    } catch (error) {
      console.error("Error cleaning up Firebase app:", error);
    }
  }
} 