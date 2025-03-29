import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  UserProfile,
  UserPreferences,
  SubscriptionInfo,
  getUserProfile,
  updateUserPreferences,
  updateUserSubscription,
  addToFavorites,
  removeFromFavorites,
  createOrUpdateUser
} from '../firebase/userRepository';

interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (userId: string, profile: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  updateSubscription: (subscription: Partial<SubscriptionInfo>) => Promise<void>;
  addContentToFavorites: (contentId: string) => Promise<void>;
  removeContentFromFavorites: (contentId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to fetch user profile');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Update entire profile
  const updateProfile = useCallback(async (userId: string, profileData: Partial<UserProfile>): Promise<void> => {
    // In a real app, you would implement this by extending userRepository 
    // with a method to update all profile fields at once
    // For now, we'll just throw an error
    throw new Error('Not implemented');
  }, []);

  // Update user preferences
  const updatePrefs = useCallback(async (preferences: Partial<UserPreferences>): Promise<void> => {
    if (!user?.uid) {
      setError('User must be logged in to update preferences');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      await updateUserPreferences(user.uid, preferences);
      
      // Refresh profile after update
      await fetchUserProfile();
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, fetchUserProfile]);

  // Update subscription
  const updateSub = useCallback(async (subscription: Partial<SubscriptionInfo>): Promise<void> => {
    if (!user?.uid) {
      setError('User must be logged in to update subscription');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      await updateUserSubscription(user.uid, subscription);
      
      // Refresh profile after update
      await fetchUserProfile();
    } catch (err) {
      console.error('Error updating subscription:', err);
      setError('Failed to update subscription');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, fetchUserProfile]);

  // Add content to favorites
  const addToFavs = useCallback(async (contentId: string): Promise<void> => {
    if (!user?.uid) {
      setError('User must be logged in to add favorites');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      await addToFavorites(user.uid, contentId);
      
      // Refresh profile after update
      await fetchUserProfile();
    } catch (err) {
      console.error('Error adding to favorites:', err);
      setError('Failed to add to favorites');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, fetchUserProfile]);

  // Remove content from favorites
  const removeFromFavs = useCallback(async (contentId: string): Promise<void> => {
    if (!user?.uid) {
      setError('User must be logged in to remove favorites');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      await removeFromFavorites(user.uid, contentId);
      
      // Refresh profile after update
      await fetchUserProfile();
    } catch (err) {
      console.error('Error removing from favorites:', err);
      setError('Failed to remove from favorites');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, fetchUserProfile]);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  // Create or update user profile on auth state change
  useEffect(() => {
    if (user) {
      // Ensure user profile exists in Firestore when user is authenticated
      const syncUser = async () => {
        try {
          await createOrUpdateUser(user);
          await fetchUserProfile();
        } catch (err) {
          console.error('Error syncing user profile:', err);
          setError('Failed to sync user profile');
        }
      };
      
      syncUser();
    } else {
      // Clear profile when user logs out
      setProfile(null);
    }
  }, [user, fetchUserProfile]);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    updatePreferences: updatePrefs,
    updateSubscription: updateSub,
    addContentToFavorites: addToFavs,
    removeContentFromFavorites: removeFromFavs,
    refreshProfile
  };
} 