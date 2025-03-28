"use client";

import { useState, useEffect } from 'react';

type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching user data
    const checkAuth = async () => {
      try {
        // In a real app, this would check if the user is authenticated
        // For now, we'll create a mock user
        setTimeout(() => {
          // Mock user for development
          const mockUser = {
            uid: 'mock-user-123',
            email: 'user@example.com',
            displayName: 'Test User',
          };
          setUser(mockUser);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Authentication error:', error);
        setUser(null);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signOut = async () => {
    // In a real app, this would sign the user out
    setUser(null);
  };

  return { user, loading, signOut };
} 