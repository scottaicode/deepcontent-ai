"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTranslation } from '@/lib/hooks/useTranslation';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signUp } = useAuth();
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
    
    if (password !== confirmPassword) {
      setError(safeTranslate('auth.signUp.errors.passwordsMismatch', 'Passwords do not match'));
      return;
    }
    
    if (password.length < 6) {
      setError(safeTranslate('auth.signUp.errors.passwordLength', 'Password must be at least 6 characters'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signUp(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || safeTranslate('auth.signUp.errors.generic', 'Failed to create account'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Define language-specific text
  const pageTitle = language === 'es' ? 'Crear una cuenta nueva' : 'Create a new account';
  const emailLabel = language === 'es' ? 'Correo electrónico' : 'Email address';
  const passwordLabel = language === 'es' ? 'Contraseña' : 'Password';
  const confirmPasswordLabel = language === 'es' ? 'Confirmar contraseña' : 'Confirm password';
  const signUpButtonText = language === 'es' ? 'Registrarse' : 'Sign up';
  const signingUpText = language === 'es' ? 'Registrando...' : 'Signing up...';
  const haveAccountText = language === 'es' ? '¿Ya tienes una cuenta?' : 'Already have an account?';
  const signInText = language === 'es' ? 'Iniciar sesión' : 'Sign in';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {safeTranslate('auth.signUp.title', pageTitle)}
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
                {safeTranslate('auth.signUp.emailLabel', emailLabel)}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={safeTranslate('auth.signUp.emailPlaceholder', emailLabel)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {safeTranslate('auth.signUp.passwordLabel', passwordLabel)}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={safeTranslate('auth.signUp.passwordPlaceholder', passwordLabel)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                {safeTranslate('auth.signUp.confirmPasswordLabel', confirmPasswordLabel)}
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={safeTranslate('auth.signUp.confirmPasswordPlaceholder', confirmPasswordLabel)}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {safeTranslate('auth.signUp.signingUp', signingUpText)}
                </>
              ) : (
                safeTranslate('auth.signUp.button', signUpButtonText)
              )}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <span className="text-gray-500">{safeTranslate('auth.signUp.haveAccount', haveAccountText)}</span>{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              {safeTranslate('auth.signUp.signIn', signInText)}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}