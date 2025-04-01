import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import firebaseConfig from "./firebaseConfig";

// Only initialize Firebase on the client-side
const initializeFirebase = () => {
  if (typeof window === "undefined") {
    // Return undefined for all services when on server
    return {
      app: undefined,
      auth: undefined,
      db: undefined,
      storage: undefined,
      functions: undefined,
    };
  }

  try {
    // Initialize or get existing Firebase app
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    
    // Initialize services
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    const functions = getFunctions(app);
    
    console.log("Firebase client initialized successfully");
    
    return { app, auth, db, storage, functions };
  } catch (error) {
    console.error("Firebase initialization error:", error);
    
    // Return undefined for all services on error
    return {
      app: undefined,
      auth: undefined,
      db: undefined,
      storage: undefined,
      functions: undefined,
    };
  }
};

// Export Firebase services
export const { app, auth, db, storage, functions } = initializeFirebase(); 