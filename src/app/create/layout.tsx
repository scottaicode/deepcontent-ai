"use client";

import React from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t, language } = useTranslation();

  // Function to safely translate with guaranteed fallback
  const safeTranslate = (key: string, defaultText: string): string => {
    const translated = t(key, { defaultValue: defaultText });
    // If translation returns the key, use the default text instead
    return translated === key ? defaultText : translated;
  };

  // Show loading while authentication state is being determined
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">
          {safeTranslate('loading.auth', 'Checking authentication...')}
        </p>
      </div>
    );
  }

  // If not authenticated, show login prompt
  if (!user) {
    const headerText = language === 'es' ? 'Autenticación Requerida' : 'Authentication Required';
    const messageText = language === 'es' 
      ? 'Necesitas iniciar sesión para crear y gestionar contenido. Por favor, inicia sesión o crea una cuenta para continuar.' 
      : 'You need to be logged in to create and manage content. Please sign in or create an account to continue.';
    const signInText = language === 'es' ? 'Iniciar Sesión' : 'Sign In';
    const createAccountText = language === 'es' ? 'Crear Cuenta' : 'Create Account';
    const backToHomeText = language === 'es' ? 'Volver al Inicio' : 'Back to Home';
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-4 text-center text-gray-900">
            {safeTranslate('auth.required', headerText)}
          </h1>
          <p className="text-center mb-6 text-gray-600">
            {safeTranslate('auth.contentCreationMessage', messageText)}
          </p>
          <div className="flex flex-col space-y-3">
            <button 
              onClick={() => router.push('/login')} 
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow transition-colors"
            >
              {safeTranslate('auth.signIn', signInText)}
            </button>
            <button 
              onClick={() => router.push('/signup')}
              className="w-full py-2 px-4 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium rounded-md transition-colors"
            >
              {safeTranslate('auth.createAccount', createAccountText)}
            </button>
            <button 
              onClick={() => router.push('/')}
              className="w-full py-2 px-4 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              {safeTranslate('common.backToHome', backToHomeText)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
} 