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
import { Timestamp } from 'firebase/firestore';

// DEVELOPMENT MODE: Create Firestore Timestamp objects for our mock data
const createTimestamp = () => Timestamp.fromDate(new Date());

// DEVELOPMENT MODE: Sample content for auth bypass mode
const sampleContentItems: ContentItem[] = [
  {
    id: 'sample-content-1',
    userId: 'dev-user-123',
    title: 'Sample Blog Post',
    contentType: 'blog',
    platform: 'website',
    status: 'draft',
    createdAt: createTimestamp(),
    updatedAt: createTimestamp(),
    content: '<p>This is a sample blog post for development testing.</p>',
    style: 'ariastar',
    length: 'medium',
    tags: ['sample', 'test', 'development'],
    persona: 'professional',
  },
  {
    id: 'sample-content-2',
    userId: 'dev-user-123',
    title: 'Sample Product Description',
    contentType: 'product',
    platform: 'ecommerce',
    status: 'published',
    createdAt: createTimestamp(),
    updatedAt: createTimestamp(),
    content: '<p>This is a sample product description for development testing.</p>',
    style: 'ecoessence',
    length: 'short',
    tags: ['product', 'sample', 'description'],
    persona: 'friendly',
  }
];

// DEVELOPMENT MODE: Add a function to simulate database operations
const simulateDBDelay = () => new Promise(resolve => setTimeout(resolve, 500));

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
  const { user, bypassAuthActive } = useAuth();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Development mode sampleContent state
  const [devContentList, setDevContentList] = useState<ContentItem[]>(sampleContentItems);

  // Log the current user ID for debugging purposes
  useEffect(() => {
    console.log('useContent hook initialized with user:', user?.uid || 'Not authenticated');
    console.log('Auth state:', user ? 'Authenticated' : 'Not authenticated');
    console.log('Bypass auth active:', bypassAuthActive);
    
    if (!bypassAuthActive) {
      // Verify Firebase auth directly
      import('@/lib/firebase/firebase').then(({ auth }) => {
        console.log('Direct Firebase auth check - current user:', auth.currentUser?.uid || 'Not authenticated');
      });
    }
  }, [user, bypassAuthActive]);

  // Fetch a single content item by ID
  const fetchContentById = useCallback(async () => {
    if (!contentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      if (bypassAuthActive) {
        // DEV MODE: Find content in sample data
        await simulateDBDelay();
        const foundContent = devContentList.find(item => item.id === contentId) || null;
        setContent(foundContent);
      } else {
        // PRODUCTION: Fetch from Firebase
        const fetchedContent = await getContentById(contentId);
        setContent(fetchedContent);
      }
    } catch (err) {
      console.error('Error fetching content by ID:', err);
      setError('Failed to fetch content');
    } finally {
      setIsLoading(false);
    }
  }, [contentId, bypassAuthActive, devContentList]);

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
      
      if (bypassAuthActive) {
        // DEV MODE: Filter sample content based on params
        await simulateDBDelay();
        let filteredContent = [...devContentList];
        
        if (status) {
          filteredContent = filteredContent.filter(item => item.status === status);
        }
        
        if (contentType) {
          filteredContent = filteredContent.filter(item => item.contentType === contentType);
        }
        
        if (limit && filteredContent.length > limit) {
          filteredContent = filteredContent.slice(0, limit);
        }
        
        console.log('DEV MODE: Filtered content count:', filteredContent.length);
        setContentList(filteredContent);
      } else {
        // PRODUCTION: Fetch from Firebase
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
      }
    } catch (err) {
      console.error('Error fetching content list:', err);
      setError('Failed to fetch content list');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, status, contentType, limit, bypassAuthActive, devContentList]);

  // Get all content for the current user (without filters)
  const getAllContent = useCallback(async (): Promise<ContentItem[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      
      if (bypassAuthActive) {
        // DEV MODE: Return all sample content
        await simulateDBDelay();
        return devContentList;
      } else {
        // PRODUCTION: Get all content from Firebase
        const allContent = await getUserContent(user.uid);
        return allContent;
      }
    } catch (err) {
      console.error('Error fetching all content:', err);
      setError('Failed to fetch all content');
      return [];
    }
  }, [user?.uid, bypassAuthActive, devContentList]);

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
      
      if (bypassAuthActive) {
        // DEV MODE: Create a new content item in the local state
        await simulateDBDelay();
        const now = createTimestamp();
        const newId = `dev-content-${Date.now()}`;
        
        const newContent: ContentItem = {
          ...data,
          id: newId,
          userId: user.uid,
          createdAt: now,
          updatedAt: now,
          status: data.status || 'draft'
        };
        
        // Update the dev content list
        setDevContentList(prev => [...prev, newContent]);
        console.log('DEV MODE: Content saved with ID:', newId);
        
        // Refresh content list
        await refreshContent();
        
        return newId;
      } else {
        // PRODUCTION: Save to Firebase
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
      }
    } catch (err) {
      console.error('Error saving content:', err);
      setError(typeof err === 'object' && err !== null && 'message' in err 
        ? (err as Error).message 
        : 'Failed to save content');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, refreshContent, bypassAuthActive, setDevContentList]);

  // Update existing content
  const updateExistingContent = useCallback(async (id: string, data: Partial<Omit<ContentItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    if (!user?.uid) {
      setError('User must be logged in to update content');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      if (bypassAuthActive) {
        // DEV MODE: Update the content in the local state
        await simulateDBDelay();
        setDevContentList(prev => prev.map(item => {
          if (item.id === id) {
            return {
              ...item,
              ...data,
              updatedAt: createTimestamp()
            } as ContentItem;
          }
          return item;
        }));
        console.log('DEV MODE: Content updated with ID:', id);
      } else {
        // PRODUCTION: Update in Firebase
        await updateContent(id, data);
      }
      
      // Refresh content after updating
      await refreshContent();
    } catch (err) {
      console.error('Error updating content:', err);
      setError('Failed to update content');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, refreshContent, bypassAuthActive, setDevContentList]);

  // Search content
  const searchContent = useCallback(async (keyword: string): Promise<ContentItem[]> => {
    if (!user?.uid) return [];
    
    try {
      setError(null);
      
      if (bypassAuthActive) {
        // DEV MODE: Filter sample content based on keyword
        await simulateDBDelay();
        const lowercaseKeyword = keyword.toLowerCase();
        return devContentList.filter(item => 
          item.title.toLowerCase().includes(lowercaseKeyword) || 
          (item.content && item.content.toLowerCase().includes(lowercaseKeyword)) ||
          (item.tags && item.tags.some(k => k.toLowerCase().includes(lowercaseKeyword)))
        );
      } else {
        // PRODUCTION: Search in Firebase
        return await searchUserContent(user.uid, keyword);
      }
    } catch (err) {
      console.error('Error searching content:', err);
      setError('Failed to search content');
      return [];
    }
  }, [user?.uid, bypassAuthActive, devContentList]);

  // Delete content
  const deleteContentItem = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (bypassAuthActive) {
        // DEV MODE: Remove the content from the local state
        await simulateDBDelay();
        setDevContentList(prev => prev.filter(item => item.id !== id));
        console.log('DEV MODE: Content deleted with ID:', id);
      } else {
        // PRODUCTION: Delete from Firebase
        await deleteContent(id);
      }
      
      // Refresh content list after deleting
      await refreshContent();
    } catch (err) {
      console.error('Error deleting content:', err);
      setError('Failed to delete content');
    } finally {
      setIsLoading(false);
    }
  }, [refreshContent, bypassAuthActive, setDevContentList]);

  // Archive content (soft delete)
  const archiveContentItem = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (bypassAuthActive) {
        // DEV MODE: Update the content status to archived in the local state
        await simulateDBDelay();
        setDevContentList(prev => prev.map(item => {
          if (item.id === id) {
            return {
              ...item,
              status: 'archived',
              updatedAt: createTimestamp()
            } as ContentItem;
          }
          return item;
        }));
        console.log('DEV MODE: Content archived with ID:', id);
      } else {
        // PRODUCTION: Archive in Firebase
        await archiveContent(id);
      }
      
      // Refresh content list after archiving
      await refreshContent();
    } catch (err) {
      console.error('Error archiving content:', err);
      setError('Failed to archive content');
    } finally {
      setIsLoading(false);
    }
  }, [refreshContent, bypassAuthActive, setDevContentList]);

  // Restore content from archive
  const restoreContentItem = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (bypassAuthActive) {
        // DEV MODE: Update the content status from archived to draft in the local state
        await simulateDBDelay();
        setDevContentList(prev => prev.map(item => {
          if (item.id === id && item.status === 'archived') {
            return {
              ...item,
              status: 'draft', // Restore to draft status
              updatedAt: createTimestamp()
            } as ContentItem;
          }
          return item;
        }));
        console.log('DEV MODE: Content restored with ID:', id);
      } else {
        // PRODUCTION: Restore in Firebase
        await restoreContent(id);
      }
      
      // Refresh content list after restoring
      await refreshContent();
    } catch (err) {
      console.error('Error restoring content:', err);
      setError('Failed to restore content');
    } finally {
      setIsLoading(false);
    }
  }, [refreshContent, bypassAuthActive, setDevContentList]);

  // Load initial data
  useEffect(() => {
    if (bypassAuthActive || user?.uid) {
      console.log('Initial data load triggered', { bypassAuthActive, userId: user?.uid });
      
      if (contentId) {
        fetchContentById();
      } else {
        fetchContentList();
      }
    } else {
      // Clear content when not authenticated
      setContent(null);
      setContentList([]);
      setIsLoading(false);
    }
    
    // Refresh when auth state changes
    if (user?.uid) {
      console.log('User auth state changed, refreshing content');
    }
  }, [user?.uid, contentId, fetchContentById, fetchContentList, bypassAuthActive]);

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