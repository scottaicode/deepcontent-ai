import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, limit, query, doc, getDoc, where } from "firebase/firestore";
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
    
    if (!currentUser) {
      console.log('No authenticated user found during Firestore test');
      return false;
    }
    
    // First try to check connectivity using a simple exists() check
    // which doesn't require read permission on documents
    try {
      // Try to check if any document exists in system collection (which should always be accessible)
      const systemDocRef = doc(db, 'system', 'status');
      await getDoc(systemDocRef);
      console.log('Firestore connection successful via system check');
      return true;
    } catch (systemCheckError) {
      console.log('System document check failed, trying fallback test', systemCheckError);
      
      // Fallback: Try to fetch user's own content
      try {
        const userContentQuery = query(
          collection(db, 'content'),
          where('userId', '==', currentUser.uid),
          limit(1)
        );
        
        await getDocs(userContentQuery);
        console.log('Firestore connection successful via user content check');
        return true;
      } catch (userContentError) {
        console.error('All Firestore connection tests failed:', userContentError);
        return false;
      }
    }
  } catch (error) {
    console.error('Firestore connection test error:', error);
    return false;
  }
};

export { app, auth, db, storage, functions };
