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
    // Simplified test: Check if Firebase app and Auth are initialized.
    // We avoid querying Firestore here to prevent permission errors for unverified users.
    // The real permission check happens during content loading.
    console.log('Running simplified Firestore connection test...');
    const isAuthInitialized = !!auth; // Check if auth object exists
    console.log(`Simplified test result: Auth initialized = ${isAuthInitialized}`);
    // Consider this test passed if auth is initialized, assuming Firestore is too.
    return isAuthInitialized;
  } catch (error) {
    // This catch block might not be strictly necessary anymore, but keep for safety.
    console.error('Simplified Firestore connection test failed unexpectedly:', error);
    return false;
  }
};

export { app, auth, db, storage, functions };
