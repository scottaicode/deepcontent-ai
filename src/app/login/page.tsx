"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTranslation } from '@/lib/hooks/useTranslation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn } = useAuth();
  const router = useRouter();
  const { t, language } = useTranslation();
  
  // Function to safely translate with guaranteed fallback
  const safeTranslate = (key: string, defaultText: string): string => {
    const translated = t(key, { defaultValue: defaultText });
    // If translation returns the key, use the default text instead
    return translated === key ? defaultText : translated;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Check if email and password are provided
      if (!email.trim() || !password.trim()) {
        throw new Error('Email and password are required');
      }
      
      console.log('Attempting to sign in with:', email);
      
      await signIn(email, password);
      console.log('Sign in successful, redirecting to homepage...');
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle API key error specifically
      if (err.code === 'auth/api-key-not-valid-please-pass-a-valid-api-key') {
        setError('Firebase API key is invalid or restricted. Try refreshing the page or check browser console for details.');
      }
      // Handle other known error patterns
      else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later or reset your password.');
      } else if (err.message && err.message.includes('undefined')) {
        setError('Authentication system error. Please try refreshing the page.');
      } else {
        // Use the default error message
        setError(err.message || safeTranslate('auth.errors.signIn', 'Failed to sign in'));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Define language-specific text
  const pageTitle = language === 'es' ? 'Iniciar sesión en tu cuenta' : 'Sign in to your account';
  const emailLabel = language === 'es' ? 'Correo electrónico' : 'Email address';
  const passwordLabel = language === 'es' ? 'Contraseña' : 'Password';
  const signInButtonText = language === 'es' ? 'Iniciar sesión' : 'Sign in';
  const signingInText = language === 'es' ? 'Iniciando sesión...' : 'Signing in...';
  const noAccountText = language === 'es' ? '¿No tienes una cuenta?' : 'Don\'t have an account?';
  const signUpText = language === 'es' ? 'Regístrate' : 'Sign up';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {safeTranslate('auth.signIn.title', pageTitle)}
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                {emailLabel}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={emailLabel}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {passwordLabel}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={passwordLabel}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isLoading ? signingInText : signInButtonText}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <p>
              {noAccountText}{' '}
              <Link 
                href="/signup" 
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {signUpText}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}