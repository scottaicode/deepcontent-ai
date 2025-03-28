import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  MediaFile,
  UploadProgress,
  uploadMedia,
  deleteMedia,
  getUserMedia,
  validateFile
} from '../firebase/mediaRepository';

interface UseMediaReturn {
  mediaList: MediaFile[];
  isLoading: boolean;
  error: string | null;
  progress: number;
  uploadFile: (file: File, progressCallback?: (progress: UploadProgress) => void) => Promise<string | null>;
  deleteFile: (url: string) => Promise<boolean>;
  refreshMedia: () => Promise<void>;
  validateFile: (file: File, allowedTypes?: string[]) => string | null;
}

export function useMedia(): UseMediaReturn {
  const { user } = useAuth();
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Fetch media list for the current user
  const fetchMediaList = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const media = await getUserMedia(user.uid);
      setMediaList(media);
    } catch (err) {
      console.error('Error fetching media:', err);
      setError('Failed to fetch media files');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Upload a file
  const uploadFile = useCallback(async (
    file: File, 
    progressCallback?: (progress: UploadProgress) => void
  ): Promise<string | null> => {
    if (!user?.uid) {
      setError('User must be logged in to upload files');
      return null;
    }
    
    try {
      setError(null);
      
      // Set up a local progress tracker if no callback provided
      const handleProgress = (progressData: UploadProgress) => {
        setProgress(progressData.progress);
        
        if (progressData.error) {
          setError(progressData.error);
        }
        
        // Pass to external callback if provided
        if (progressCallback) {
          progressCallback(progressData);
        }
      };
      
      const downloadURL = await uploadMedia(file, user.uid, handleProgress);
      
      // Refresh media list after upload
      await fetchMediaList();
      
      return downloadURL;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
      return null;
    }
  }, [user?.uid, fetchMediaList]);

  // Delete a file
  const deleteFile = useCallback(async (url: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await deleteMedia(url);
      
      // Refresh media list after deletion
      await fetchMediaList();
      
      return true;
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchMediaList]);

  // Refresh media data
  const refreshMedia = useCallback(async () => {
    await fetchMediaList();
  }, [fetchMediaList]);

  // Initial data loading
  useEffect(() => {
    fetchMediaList();
  }, [fetchMediaList]);

  return {
    mediaList,
    isLoading,
    error,
    progress,
    uploadFile,
    deleteFile,
    refreshMedia,
    validateFile
  };
} 