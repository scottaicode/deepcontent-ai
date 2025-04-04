import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from 'firebase/functions';
import { createRequiredIndexes } from './firebaseUtils';

// Using hardcoded Firebase config to ensure consistency with AuthContext
const firebaseConfig = {
  apiKey: "AIzaSyD3SjBt4rcN0TxNtpod8lNyNE_UKdX0GYw",
  authDomain: "deepcontent-53022.firebaseapp.com",
  projectId: "deepcontent-53022",
  storageBucket: "deepcontent-53022.appspot.com",
  messagingSenderId: "398075751792",
  appId: "1:398075751792:web:2b52857b283b1acb3373b5"
};

// This ensures we get the existing Firebase app if it already exists
console.log('Firebase initialization - existing apps:', getApps().length);
const app = getApps().length ? getApp() : initializeApp(firebaseConfig, "deepcontent-primary");
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
    
    // If user isn't authenticated, we should still test basic connectivity
    // but return false at the end since we need authentication for DB operations
    
    try {
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
    } catch (innerError: any) {
      console.error('Error during test query:', innerError);
      
      // Even if query fails, if it's just a permission issue but user is authenticated,
      // that might be fine (empty collection or missing permissions)
      if (innerError.code === 'permission-denied' && currentUser) {
        console.log('Permission denied, but user is authenticated - likely just missing data');
        return true;
      }
      
      throw innerError;
    }
  } catch (error: any) {
    // Provide more detailed error logging for better debugging
    console.error('Firestore connection failed:', error);
    
    // Log specific error types for better debugging
    if (error.code) {
      console.error(`Firebase error code: ${error.code}`);
    }
    
    if (error.name === 'FirebaseError') {
      if (error.code === 'permission-denied') {
        console.error('Permission denied accessing Firestore. Check security rules and authentication.');
      } else if (error.code === 'unavailable') {
        console.error('Firebase is unavailable. Check your network connection.');
      } else if (error.code === 'failed-precondition') {
        console.error('Operation failed. Check that all required conditions are met.');
      } else if (error.code === 'unauthenticated') {
        console.error('User is not authenticated. Please sign in again.');
      }
    } else if (error.name === 'TypeError' || error.message?.includes('undefined')) {
      console.error('Type error - Firebase may not be properly initialized or environment variables missing.');
    }
    
    return false;
  }
};

export { app, auth, db, storage, functions };
