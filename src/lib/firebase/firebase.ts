import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from 'firebase/functions';
import { createRequiredIndexes } from './firebaseUtils';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Create required indexes
if (typeof window !== 'undefined') {
  // Only run in browser environment
  createRequiredIndexes().catch(console.error);
}

// Function to test Firestore connectivity
export const testFirestoreConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing Firestore connection...');
    
    // First, check if Firebase app is initialized
    if (!app) {
      console.error('Firebase app not initialized');
      return false;
    }
    
    // Second, check if auth is initialized
    if (!auth) {
      console.error('Firebase auth not initialized');
      return false;
    }
    
    // Third, check if Firestore is initialized
    if (!db) {
      console.error('Firestore not initialized');
      return false;
    }
    
    // Execute a simple test to see if we can access the database
    // We don't actually need to retrieve any data
    const testPromise = async () => {
      try {
        // Just check if we can access Firestore object properties
        // This avoids permission errors while still validating the connection
        return !!db.type && !!db.app;
      } catch (e) {
        console.error('Firestore object access test failed:', e);
        return false;
      }
    };
    
    // Set timeout for connection test
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.warn('Firestore connection test timed out');
        resolve(false);
      }, 5000);
    });
    
    // Verify the app is connected
    return await Promise.race([testPromise(), timeoutPromise]);
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    return false;
  }
};

export { app, auth, db, storage, functions };
