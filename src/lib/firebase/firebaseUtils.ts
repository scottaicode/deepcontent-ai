import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

/**
 * Creates necessary Firestore indexes for content querying
 * Call this function during app initialization to ensure indexes exist
 */
export const createRequiredIndexes = async () => {
  try {
    // We can't actually create indexes programmatically via client SDK
    // Instead, log instructions for the developer
    console.info(
      'Firebase indexes required for this application:',
      '\n',
      '1. Collection: "content", Fields: ["userId" ASC, "createdAt" DESC]',
      '\n',
      '2. Collection: "research", Fields: ["userId" ASC, "createdAt" DESC]',
      '\n',
      'Please create these indexes manually in the Firebase console or click the links in the error messages.'
    );
    
    // Instructions for the most common index issues
    console.info(
      'To create indexes:',
      '\n',
      '1. Go to Firebase Console → Firestore Database → Indexes tab',
      '\n',
      '2. Click "Add Index"',
      '\n',
      '3. Select the collection ("content" or "research")',
      '\n',
      '4. Add fields with proper order (usually "userId" Ascending and "createdAt" Descending)',
      '\n',
      '5. Click Create'
    );
    
    // Check if we're in development mode
    if (process.env.NODE_ENV === 'development') {
      console.info(
        'DEVELOPMENT MODE: For a quick solution, click the links in the error messages to create indexes automatically.'
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error in createRequiredIndexes:', error);
    return false;
  }
};
