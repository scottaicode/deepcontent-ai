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
    
    // Check if auth is initialized and user is signed in
    const currentUser = auth.currentUser;
    console.log('Current user during Firestore test:', currentUser?.uid || 'No user authenticated');
    
    // Try to fetch a single document from any collection
    const testQuery = query(collection(db, 'content'), limit(1));
    const snapshot = await getDocs(testQuery);
    
    // Log more details about the connection status
    console.log('Firestore connection successful!', {
      empty: snapshot.empty,
      size: snapshot.size,
      authenticated: !!currentUser
    });
    
    // Return true only if both connection works AND user is authenticated
    if (!currentUser) {
      console.log('Firestore connection works but user is not authenticated');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Firestore connection failed:', error);
    return false;
  }
};

export { app, auth, db, storage, functions };
