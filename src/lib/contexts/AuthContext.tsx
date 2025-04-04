"use client";

import React, { createContext, useEffect, useState } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User,
  setPersistence, 
  browserLocalPersistence,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  getIdTokenResult
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";

// DEVELOPMENT FLAG: Set to true to bypass authentication in development
const BYPASS_AUTH_FOR_DEV = false;

// Import the direct Firebase config that doesn't rely on process.env variables
const firebaseConfig = {
  apiKey: "AIzaSyD3SjBt4rcN0TxNtpod8lNyNE_UKdX0GYw",
  authDomain: "deepcontent-53022.firebaseapp.com",
  projectId: "deepcontent-53022",
  storageBucket: "deepcontent-53022.appspot.com",
  messagingSenderId: "398075751792",
  appId: "1:398075751792:web:2b52857b283b1acb3373b5"
};

// Initialize Firebase directly in this file to avoid circular dependencies
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<void>;
  bypassAuthActive: boolean;
  isEmailVerified: () => boolean;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

// Create a mock user for development
const mockUser = BYPASS_AUTH_FOR_DEV ? {
  uid: 'dev-user-123',
  email: 'dev@example.com',
  displayName: 'Development User',
  emailVerified: true,
  isAnonymous: false,
  // Add other required User properties as needed
} as User : null;

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  signIn: async () => {},
  signUp: async () => {},
  bypassAuthActive: BYPASS_AUTH_FOR_DEV,
  isEmailVerified: () => false,
  sendVerificationEmail: async () => {},
  sendPasswordReset: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize with mockUser if BYPASS_AUTH_FOR_DEV is true
  const [user, setUser] = useState<User | null>(BYPASS_AUTH_FOR_DEV ? mockUser : null);
  const [loading, setLoading] = useState(!BYPASS_AUTH_FOR_DEV);

  // Set persistence to local (survives browser restarts)
  useEffect(() => {
    // Skip on server-side or if bypassing auth
    if (typeof window === 'undefined' || BYPASS_AUTH_FOR_DEV) {
      if (BYPASS_AUTH_FOR_DEV) {
        console.log('DEVELOPMENT MODE: Authentication is bypassed');
        setLoading(false);
      }
      return;
    }
    
    const setupPersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('Firebase auth persistence set to LOCAL');
      } catch (error) {
        console.error('Error setting auth persistence:', error);
      }
    };
    
    setupPersistence();
  }, []);

  useEffect(() => {
    // Skip on server-side or if bypassing auth
    if (typeof window === 'undefined' || BYPASS_AUTH_FOR_DEV) {
      setLoading(false);
      return () => {};
    }
    
    console.log('Setting up auth state change listener');
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user ? `User ${user.uid} logged in` : 'No user');
      setUser(user);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth state change listener');
      unsubscribe();
    }
  }, []);

  const signInWithGoogle = async () => {
    if (BYPASS_AUTH_FOR_DEV) {
      console.log('DEVELOPMENT MODE: Bypassing Google sign in');
      setUser(mockUser);
      return;
    }
    
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signOutUser = async () => {
    if (BYPASS_AUTH_FOR_DEV) {
      console.log('DEVELOPMENT MODE: Bypassing sign out');
      // Still set user to null to simulate sign out
      setUser(null);
      window.location.href = '/';
      return;
    }
    
    console.log('signOutUser function called in AuthContext');
    try {
      if (!auth.currentUser) {
        console.log('No user currently signed in');
        return;
      }
      
      console.log('Current user before sign out:', auth.currentUser.uid);
      console.log('Attempting to call firebaseSignOut...');
      
      await firebaseSignOut(auth);
      
      console.log('firebaseSignOut completed successfully');
      // Clear any cached data or state
      setUser(null);
      
      // Force a page reload to refresh the authentication state
      window.location.href = '/';
      
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  // Email/Password sign in
  const signIn = async (email: string, password: string) => {
    if (BYPASS_AUTH_FOR_DEV) {
      console.log('DEVELOPMENT MODE: Bypassing email/password sign in');
      setUser(mockUser);
      return { user: mockUser };
    }
    
    try {
      console.log("Attempting to sign in with email and password");
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("Sign in successful");
      return result;
    } catch (error) {
      console.error("Error signing in with email/password", error);
      throw error;
    }
  };

  // Email/Password sign up
  const signUp = async (email: string, password: string) => {
    if (BYPASS_AUTH_FOR_DEV) {
      console.log('DEVELOPMENT MODE: Bypassing email/password sign up');
      setUser(mockUser);
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send verification email
      await sendEmailVerification(userCredential.user);
      console.log('Verification email sent to:', email);
      
      // You can add additional user profile setup here if needed
      // Example: await updateProfile(userCredential.user, { displayName: name });
    } catch (error) {
      console.error("Error signing up with email/password", error);
      throw error;
    }
  };

  // Check if email is verified
  const isEmailVerified = () => {
    if (!user) return false;
    return user.emailVerified;
  };

  // Resend verification email
  const sendVerificationEmail = async () => {
    if (!user) throw new Error('No user is currently signed in');
    
    try {
      await sendEmailVerification(user);
      console.log('Verification email resent to:', user.email);
    } catch (error) {
      console.error("Error sending verification email", error);
      throw error;
    }
  };

  // Send password reset email
  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent to:', email);
    } catch (error) {
      console.error("Error sending password reset email", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        signInWithGoogle, 
        signOut: signOutUser,
        signIn,
        signUp,
        bypassAuthActive: BYPASS_AUTH_FOR_DEV,
        isEmailVerified,
        sendVerificationEmail,
        sendPasswordReset
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
