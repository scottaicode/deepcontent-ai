import { db } from "./firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  DocumentData
} from "firebase/firestore";
import { User } from "firebase/auth";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin: Timestamp;
  preferences?: UserPreferences;
  subscription?: SubscriptionInfo;
  favorites?: string[]; // Array of content IDs
}

export interface UserPreferences {
  defaultContentType?: string;
  defaultPlatform?: string;
  defaultPersona?: string;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  emailNotifications?: boolean;
}

export interface SubscriptionInfo {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due';
  expiresAt?: Timestamp;
  features?: string[];
}

const COLLECTION = 'users';

/**
 * Create or update a user profile when they sign in
 */
export const createOrUpdateUser = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION, user.uid);
    const userDoc = await getDoc(userRef);
    
    const userData = {
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      lastLogin: serverTimestamp(),
    };
    
    if (!userDoc.exists()) {
      // Create new user profile
      await setDoc(userRef, {
        ...userData,
        id: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Default preferences for new users
        preferences: {
          theme: 'system',
          language: 'en',
          emailNotifications: true,
        },
        // Default subscription
        subscription: {
          plan: 'free',
          status: 'active',
          features: ['generate-content', 'basic-analytics']
        },
        favorites: []
      });
    } else {
      // Update existing user
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error creating or updating user:", error);
    throw error;
  }
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (userId: string, preferences: Partial<UserPreferences>): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION, userId);
    
    await updateDoc(userRef, {
      'preferences': preferences,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
};

/**
 * Update user subscription
 */
export const updateUserSubscription = async (userId: string, subscription: Partial<SubscriptionInfo>): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION, userId);
    
    await updateDoc(userRef, {
      'subscription': subscription,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating user subscription:", error);
    throw error;
  }
};

/**
 * Add a content item to user favorites
 */
export const addToFavorites = async (userId: string, contentId: string): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      const favorites = userData.favorites || [];
      
      if (!favorites.includes(contentId)) {
        await updateDoc(userRef, {
          favorites: [...favorites, contentId],
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error("Error adding to favorites:", error);
    throw error;
  }
};

/**
 * Remove a content item from user favorites
 */
export const removeFromFavorites = async (userId: string, contentId: string): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      const favorites = userData.favorites || [];
      
      const updatedFavorites = favorites.filter(id => id !== contentId);
      
      await updateDoc(userRef, {
        favorites: updatedFavorites,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error removing from favorites:", error);
    throw error;
  }
}; 