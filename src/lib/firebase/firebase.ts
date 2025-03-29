import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, collection, getDocs, limit, query } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions } from 'firebase/functions';
import { createRequiredIndexes } from './firebaseUtils';

// Check if Firebase config is available
const hasFirebaseConfig = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

// Initialize Firebase conditionally, but use definite typing
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

if (hasFirebaseConfig) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Initialize Firebase
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  // Create required indexes in browser environment
  if (typeof window !== 'undefined') {
    createRequiredIndexes().catch(console.error);
  }

  console.log('Firebase initialized successfully');
} else {
  console.warn('Firebase configuration is missing or incomplete. Firebase services will not be available.');
  
  // Create mock implementations for Firebase services
  // @ts-ignore - These are intentionally incomplete implementations for build to succeed
  app = {} as FirebaseApp;
  // @ts-ignore
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
  } as Auth;
  // @ts-ignore
  db = {} as Firestore;
  // @ts-ignore
  storage = {} as FirebaseStorage;
  // @ts-ignore
  functions = {} as Functions;
}

// Function to test Firestore connectivity
export const testFirestoreConnection = async (): Promise<boolean> => {
  if (!hasFirebaseConfig) return false;
  
  try {
    console.log('Testing Firestore connection...');
    // Try to fetch a single document from any collection
    const testQuery = query(collection(db, 'content'), limit(1));
    await getDocs(testQuery);
    console.log('Firestore connection successful!');
    return true;
  } catch (error) {
    console.error('Firestore connection failed:', error);
    return false;
  }
};

// Utility to check if Firebase is properly initialized
export const isFirebaseInitialized = (): boolean => {
  return hasFirebaseConfig;
};

// Export initialized instances
export { app, auth, db, storage, functions };
