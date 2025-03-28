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
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || safeTranslate('auth.errors.signIn', 'Failed to sign in'));
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
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                {safeTranslate('auth.signIn.emailLabel', emailLabel)}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={safeTranslate('auth.signIn.emailPlaceholder', emailLabel)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {safeTranslate('auth.signIn.passwordLabel', passwordLabel)}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={safeTranslate('auth.signIn.passwordPlaceholder', passwordLabel)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex justify-center items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {safeTranslate('auth.signIn.signingIn', signingInText)}
                </>
              ) : (
                safeTranslate('auth.signIn.button', signInButtonText)
              )}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <span className="text-gray-500">{safeTranslate('auth.signIn.noAccount', noAccountText)}</span>{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              {safeTranslate('auth.signIn.signUp', signUpText)}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}