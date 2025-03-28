import { storage } from "./firebase";
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  listAll,
  getMetadata
} from "firebase/storage";

// Define allowed file types and size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export interface UploadProgress {
  progress: number;
  downloadURL: string | null;
  error: string | null;
}

export interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  path: string;
  createdAt: number;
}

/**
 * Validate file before upload
 */
export const validateFile = (file: File, allowedTypes: string[] = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
  }
  
  if (!allowedTypes.includes(file.type)) {
    return `File type '${file.type}' is not allowed`;
  }
  
  return null;
};

/**
 * Upload file to Firebase Storage
 */
export const uploadMedia = (
  file: File, 
  userId: string, 
  progressCallback?: (progress: UploadProgress) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      if (progressCallback) {
        progressCallback({
          progress: 0,
          downloadURL: null,
          error: validationError
        });
      }
      reject(new Error(validationError));
      return;
    }
    
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `users/${userId}/media/${filename}`;
    const storageRef = ref(storage, storagePath);
    
    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Listen for state changes, errors, and completion
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Track upload progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (progressCallback) {
          progressCallback({
            progress,
            downloadURL: null,
            error: null
          });
        }
      },
      (error) => {
        // Handle upload errors
        console.error("Error uploading file:", error);
        if (progressCallback) {
          progressCallback({
            progress: 0,
            downloadURL: null,
            error: error.message
          });
        }
        reject(error);
      },
      async () => {
        // Upload completed successfully
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          if (progressCallback) {
            progressCallback({
              progress: 100,
              downloadURL,
              error: null
            });
          }
          resolve(downloadURL);
        } catch (error) {
          console.error("Error getting download URL:", error);
          if (progressCallback) {
            progressCallback({
              progress: 100,
              downloadURL: null,
              error: 'Failed to get download URL'
            });
          }
          reject(error);
        }
      }
    );
  });
};

/**
 * Delete file from Firebase Storage
 */
export const deleteMedia = async (url: string): Promise<void> => {
  try {
    // Extract the path from the URL
    const decodedUrl = decodeURIComponent(url);
    const startIndex = decodedUrl.indexOf('/o/') + 3;
    const endIndex = decodedUrl.indexOf('?');
    const path = decodedUrl.substring(startIndex, endIndex);
    
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

/**
 * Get all media files for a user
 */
export const getUserMedia = async (userId: string): Promise<MediaFile[]> => {
  try {
    const userMediaRef = ref(storage, `users/${userId}/media`);
    const listResult = await listAll(userMediaRef);
    
    const mediaFiles = await Promise.all(
      listResult.items.map(async (itemRef) => {
        try {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          
          return {
            id: itemRef.name,
            name: itemRef.name.substring(itemRef.name.indexOf('_') + 1),
            type: metadata.contentType || '',
            size: metadata.size || 0,
            url,
            path: itemRef.fullPath,
            createdAt: metadata.timeCreated 
              ? new Date(metadata.timeCreated).getTime() 
              : Date.now()
          };
        } catch (error) {
          console.error(`Error getting metadata for ${itemRef.name}:`, error);
          return null;
        }
      })
    );
    
    return mediaFiles.filter(file => file !== null) as MediaFile[];
  } catch (error) {
    console.error("Error getting user media:", error);
    throw error;
  }
}; 