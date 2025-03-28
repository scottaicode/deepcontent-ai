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
  browserLocalPersistence
} from "firebase/auth";
import { auth } from "../firebase/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  signIn: async () => {},
  signUp: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set persistence to local (survives browser restarts)
  useEffect(() => {
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
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signOutUser = async () => {
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
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in with email/password", error);
      throw error;
    }
  };

  // Email/Password sign up
  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // You can add additional user profile setup here if needed
      // Example: await updateProfile(userCredential.user, { displayName: name });
    } catch (error) {
      console.error("Error signing up with email/password", error);
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
        signUp
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
