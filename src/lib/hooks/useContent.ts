import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  ContentItem,
  saveContent, 
  getContentById, 
  getUserContent, 
  updateContent, 
  deleteContent, 
  archiveContent,
  searchUserContent,
  restoreContent
} from '../firebase/contentRepository';

interface UseContentProps {
  contentId?: string;
  status?: 'draft' | 'published' | 'archived';
  contentType?: string;
  limit?: number;
}

interface UseContentReturn {
  content: ContentItem | null;
  contentList: ContentItem[];
  isLoading: boolean;
  error: string | null;
  saveContent: (data: Omit<ContentItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateContent: (id: string, data: Partial<Omit<ContentItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  archiveContent: (id: string) => Promise<void>;
  restoreContent: (id: string) => Promise<void>;
  refreshContent: () => Promise<void>;
  searchContent: (keyword: string) => Promise<ContentItem[]>;
  getAllContent: () => Promise<ContentItem[]>;
}

export function useContent({ contentId, status, contentType, limit }: UseContentProps = {}): UseContentReturn {
  const { user } = useAuth();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Log the current user ID for debugging purposes
  useEffect(() => {
    console.log('useContent hook initialized with user:', user?.uid || 'Not authenticated');
    console.log('Auth state:', user ? 'Authenticated' : 'Not authenticated');
    
    // Verify Firebase auth directly
    import('@/lib/firebase/firebase').then(({ auth }) => {
      console.log('Direct Firebase auth check - current user:', auth.currentUser?.uid || 'Not authenticated');
    });
  }, [user]);

  // Fetch a single content item by ID
  const fetchContentById = useCallback(async () => {
    if (!contentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedContent = await getContentById(contentId);
      setContent(fetchedContent);
    } catch (err) {
      console.error('Error fetching content by ID:', err);
      setError('Failed to fetch content');
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  // Fetch content list for the current user
  const fetchContentList = useCallback(async () => {
    if (!user?.uid) {
      console.log('No user ID available for content fetch');
      setContentList([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching content for user:', user.uid);
      try {
        const fetchedContent = await getUserContent(user.uid, status, contentType, limit);
        console.log('Fetched content count:', fetchedContent.length);
        setContentList(fetchedContent);
        setError(null); // Clear any previous errors
      } catch (fetchError: any) {
        console.error('Specific fetch error:', fetchError);
        
        // Check if this is a "collection not found" type error
        if (fetchError?.code === 'permission-denied' || 
            fetchError?.name === 'FirebaseError' || 
            fetchError?.message?.includes('collection')) {
          console.log('Collection may not exist yet, setting empty array');
          setContentList([]); // Set empty array instead of error
          setError(null); // Don't show error in this case
        } else {
          // For other types of errors, show the error message
          throw fetchError;
        }
      }
    } catch (err) {
      console.error('Error fetching content list:', err);
      setError('Failed to fetch content list');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, status, contentType, limit]);

  // Get all content for the current user (without filters)
  const getAllContent = useCallback(async (): Promise<ContentItem[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      
      // Get all content regardless of status or type
      const allContent = await getUserContent(user.uid);
      return allContent;
    } catch (err) {
      console.error('Error fetching all content:', err);
      setError('Failed to fetch all content');
      return [];
    }
  }, [user?.uid]);

  // Refresh content data
  const refreshContent = useCallback(async () => {
    console.log('refreshContent called, user ID:', user?.uid);
    // Clear content lists first to avoid showing stale data
    setContent(null);
    setContentList([]);
    
    if (contentId) {
      await fetchContentById();
    } else {
      await fetchContentList();
    }
    
    // Force a synchronous check to ensure we display the latest data
    setTimeout(() => {
      if (contentList.length === 0 && user?.uid) {
        console.log('No content found after refresh, may need to check Firebase permissions or data existence');
      }
    }, 500);
  }, [contentId, fetchContentById, fetchContentList, user?.uid, contentList.length]);

  // Save new content
  const saveNewContent = useCallback(async (data: Omit<ContentItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    if (!user?.uid) {
      setError('User must be logged in to save content');
      return null;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Attempting to save content with user ID:', user.uid);
      console.log('Content data to save:', {
        title: data.title,
        contentType: data.contentType,
        platform: data.platform,
        status: data.status || 'draft' // Default to draft if not specified
      });
      
      // Verify Firestore connection first
      const { testFirestoreConnection } = await import('@/lib/firebase/firebase');
      const isConnected = await testFirestoreConnection();
      
      if (!isConnected) {
        throw new Error('Cannot connect to Firestore database');
      }
      
      // Ensure status is set - fix common cause of issues
      const contentToSave = {
        ...data,
        status: data.status || 'draft', // Default to draft if not specified
        userId: user.uid
      };
      
      const newContentId = await saveContent(contentToSave);
      
      console.log('Content saved successfully with ID:', newContentId);
      
      // Refresh content list after saving
      await refreshContent();
      
      return newContentId;
    } catch (err) {
      console.error('Error saving content:', err);
      setError(typeof err === 'object' && err !== null && 'message' in err 
        ? (err as Error).message 
        : 'Failed to save content');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, refreshContent]);

  // Update existing content
  const updateExistingContent = useCallback(async (id: string, data: Partial<Omit<ContentItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    if (!user?.uid) {
      setError('User must be logged in to update content');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      await updateContent(id, data);
      
      // Refresh content after updating
      await refreshContent();
    } catch (err) {
      console.error('Error updating content:', err);
      setError('Failed to update content');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, refreshContent]);

  // Delete content
  const deleteContentItem = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await deleteContent(id);
      
      // Refresh content list after deleting
      await refreshContent();
    } catch (err) {
      console.error('Error deleting content:', err);
      setError('Failed to delete content');
    } finally {
      setIsLoading(false);
    }
  }, [refreshContent]);

  // Archive content (soft delete)
  const archiveContentItem = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await archiveContent(id);
      
      // Refresh content list after archiving
      await refreshContent();
    } catch (err) {
      console.error('Error archiving content:', err);
      setError('Failed to archive content');
    } finally {
      setIsLoading(false);
    }
  }, [refreshContent]);

  // Restore content
  const restoreContentItem = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await restoreContent(id);
      
      // Refresh content list after restoring
      await refreshContent();
    } catch (err) {
      console.error('Error restoring content:', err);
      setError('Failed to restore content');
    } finally {
      setIsLoading(false);
    }
  }, [refreshContent]);

  // Search content
  const searchContent = useCallback(async (keyword: string): Promise<ContentItem[]> => {
    if (!user?.uid) return [];
    
    try {
      setIsLoading(true);
      setError(null);
      
      const results = await searchUserContent(user.uid, keyword);
      return results;
    } catch (err) {
      console.error('Error searching content:', err);
      setError('Failed to search content');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Initial data loading
  useEffect(() => {
    if (contentId) {
      fetchContentById();
    } else {
      fetchContentList();
    }
  }, [contentId, fetchContentById, fetchContentList]);

  // Refresh when auth state changes
  useEffect(() => {
    // When user changes, refresh content
    if (user?.uid) {
      console.log('User auth state changed, refreshing content');
      // Clear any stale data first
      setContent(null);
      setContentList([]);
      
      if (contentId) {
        fetchContentById();
      } else {
        fetchContentList();
      }
    } else {
      // Clear content when not authenticated
      setContentList([]);
      setContent(null);
    }
  }, [user?.uid, contentId, fetchContentById, fetchContentList]);

  return {
    content,
    contentList,
    isLoading,
    error,
    saveContent: saveNewContent,
    updateContent: updateExistingContent,
    deleteContent: deleteContentItem,
    archiveContent: archiveContentItem,
    restoreContent: restoreContentItem,
    refreshContent,
    searchContent,
    getAllContent
  };
} 