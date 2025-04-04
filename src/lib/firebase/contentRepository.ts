import { db } from "./firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  serverTimestamp, 
  Timestamp, 
  limit, 
  DocumentData
} from "firebase/firestore";

// Content Types
export interface ContentItem {
  id?: string;
  title: string;
  content: string;
  contentType: string;
  platform: string;
  subPlatform?: string;
  persona: string;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  tags?: string[];
  researchData?: string;
  status: 'draft' | 'published' | 'archived';
  mediaUrls?: string[];
  style?: string;
  length?: 'short' | 'medium' | 'long';
  language?: string;
}

const COLLECTION = 'content';

/**
 * Save new content to Firestore
 */
export const saveContent = async (contentData: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    console.log('Starting save to Firestore collection:', COLLECTION);
    
    // Validate required data before saving
    if (!contentData.title || !contentData.content || !contentData.userId) {
      const missingFields = [];
      if (!contentData.title) missingFields.push('title');
      if (!contentData.content) missingFields.push('content');
      if (!contentData.userId) missingFields.push('userId');
      
      const errorMessage = `Missing required content data: ${missingFields.join(', ')}`;
      console.error(errorMessage, contentData);
      throw new Error(errorMessage);
    }
    
    // Ensure contentType has a value
    if (!contentData.contentType) {
      console.log('No contentType provided, using default: "general"');
      contentData.contentType = 'general';
    }
    
    // Ensure platform has a value
    if (!contentData.platform) {
      console.log('No platform provided, using default: "other"');
      contentData.platform = 'other';
    }
    
    // Ensure status has a value
    if (!contentData.status) {
      console.log('No status provided, using default: "draft"');
      contentData.status = 'draft';
    }

    // Add language if not present
    if (!contentData.language) {
      console.log('No language provided, using default: "en"');
      contentData.language = 'en';
    }
    
    // Log data being saved for debugging
    console.log('Saving content data:', {
      userId: contentData.userId,
      title: contentData.title,
      contentType: contentData.contentType,
      platform: contentData.platform,
      status: contentData.status,
      language: contentData.language,
      contentLength: contentData.content?.length || 0
    });
    
    // Prepare the data with timestamp fields
    const now = serverTimestamp();
    const contentToSave = {
      ...contentData,
      createdAt: now,
      updatedAt: now
    };
    
    // Create the document with error handling
    try {
      const docRef = await addDoc(collection(db, COLLECTION), contentToSave);
      console.log('Document created with ID:', docRef.id);
      return docRef.id;
    } catch (firestoreError) {
      // Handle specific Firestore errors
      console.error('Firestore error when saving content:', firestoreError);
      
      let errorMessage = 'Failed to save to database';
      
      // Check for permission denied errors
      if (firestoreError instanceof Error) {
        if (firestoreError.message.includes('permission-denied') || 
            firestoreError.message.includes('Missing or insufficient permissions')) {
          errorMessage = 'Permission denied: Check Firestore security rules';
        } else if (firestoreError.message.includes('network')) {
          errorMessage = 'Network error when saving content';
        }
      }
      
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error saving content:", error);
    throw error;
  }
};

/**
 * Update existing content
 */
export const updateContent = async (id: string, contentData: Partial<Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      ...contentData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating content:", error);
    throw error;
  }
};

/**
 * Get content by ID
 */
export const getContentById = async (id: string): Promise<ContentItem | null> => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as ContentItem;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting content:", error);
    throw error;
  }
};

/**
 * Get all content for a user
 */
export const getUserContent = async (userId: string, status?: ContentItem['status'], contentType?: string, maxLimit?: number): Promise<ContentItem[]> => {
  try {
    // First query just by userId without ordering (this should work without composite indexes)
    let baseQuery = query(
      collection(db, COLLECTION),
      where("userId", "==", userId)
    );
    
    // Apply limit if specified
    if (maxLimit && maxLimit > 0) {
      baseQuery = query(baseQuery, limit(maxLimit));
    }
    
    let querySnapshot = await getDocs(baseQuery);
    
    // If specific filters required, use client-side filtering
    if (status || contentType) {      
      // Get all documents for this user
      const allUserDocs = await getDocs(query(
        collection(db, COLLECTION),
        where("userId", "==", userId)
      ));
      
      let allDocsArray = allUserDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContentItem[];
      
      // Apply filters in memory
      if (status) {
        allDocsArray = allDocsArray.filter(item => item.status === status);
      }
      
      if (contentType) {
        allDocsArray = allDocsArray.filter(item => item.contentType === contentType);
      }
      
      // Sort by updatedAt manually (descending)
      allDocsArray.sort((a, b) => {
        const timeA = a.updatedAt ? (a.updatedAt as any).seconds || 0 : 0;
        const timeB = b.updatedAt ? (b.updatedAt as any).seconds || 0 : 0;
        return timeB - timeA; // Descending order
      });
      
      // Apply limit in memory
      if (maxLimit && maxLimit > 0) {
        allDocsArray = allDocsArray.slice(0, maxLimit);
      }
      
      return allDocsArray;
    }
    
    // Standard processing for basic query
    const contentItems = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      } as ContentItem;
    });
    
    return contentItems;
  } catch (error) {
    console.error("Error getting user content:", error);
    throw error;
  }
};

/**
 * Delete content
 */
export const deleteContent = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error("Error deleting content:", error);
    throw error;
  }
};

/**
 * Archive content (soft delete)
 */
export const archiveContent = async (id: string): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      status: 'archived',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error archiving content:", error);
    throw error;
  }
};

/**
 * Restore archived content to draft status
 */
export const restoreContent = async (id: string): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      status: 'draft',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error restoring content:", error);
    throw error;
  }
};

/**
 * Search user content by keyword
 */
export const searchUserContent = async (userId: string, keyword: string): Promise<ContentItem[]> => {
  // Firestore doesn't support full text search natively
  // For now, we'll retrieve all user content and filter on the client side
  // For production, consider using Algolia or ElasticSearch for better performance
  try {
    const allContent = await getUserContent(userId);
    
    return allContent.filter(item => {
      const searchableText = `${item.title} ${item.content}`.toLowerCase();
      return searchableText.includes(keyword.toLowerCase());
    });
  } catch (error) {
    console.error("Error searching content:", error);
    throw error;
  }
};

/**
 * Get content statistics for dashboard
 */
export const getUserContentStats = async (userId: string): Promise<{
  total: number; 
  published: number; 
  draft: number; 
  archived: number;
  byType: Record<string, number>;
}> => {
  try {
    const allContent = await getUserContent(userId);
    
    const stats = {
      total: allContent.length,
      published: 0,
      draft: 0,
      archived: 0,
      byType: {} as Record<string, number>
    };
    
    allContent.forEach(item => {
      // Count by status
      if (item.status === 'published') stats.published++;
      else if (item.status === 'draft') stats.draft++;
      else if (item.status === 'archived') stats.archived++;
      
      // Count by type
      if (!stats.byType[item.contentType]) {
        stats.byType[item.contentType] = 0;
      }
      stats.byType[item.contentType]++;
    });
    
    return stats;
  } catch (error) {
    console.error("Error getting content stats:", error);
    throw error;
  }
}; 