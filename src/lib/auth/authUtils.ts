import { auth } from '@/lib/firebase/firebase';

/**
 * Gets the current user's authentication token or throws an error if not authenticated
 * @returns The user's authentication token
 * @throws Error if user is not authenticated
 */
export async function getTokenOrThrow(): Promise<string> {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('User not authenticated. Please log in.');
    }
    
    const token = await currentUser.getIdToken();
    return token;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

/**
 * Checks if a user is authenticated
 * @returns Boolean indicating if a user is logged in
 */
export function isAuthenticated(): boolean {
  return !!auth.currentUser;
}

/**
 * Gets the current user ID or null if not authenticated
 * @returns The user ID or null
 */
export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null;
} 