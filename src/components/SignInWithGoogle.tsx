"use client";

import { useAuth } from '../lib/hooks/useAuth';

interface SignInWithGoogleProps {
  disabled?: boolean;
  disabledMessage?: string;
}

export default function SignInWithGoogle({ 
  disabled = false, 
  disabledMessage = "Google sign-in disabled" 
}: SignInWithGoogleProps) {
  const { signInWithGoogle } = useAuth();

  if (disabled) {
    return (
      <button
        disabled
        className="flex items-center justify-center bg-gray-100 text-gray-500 font-semibold py-2 px-4 rounded-full border border-gray-300 cursor-not-allowed"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-6 h-6 mr-2 opacity-50" />
        {disabledMessage}
      </button>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center justify-center bg-white text-gray-700 font-semibold py-2 px-4 rounded-full border border-gray-300 hover:bg-gray-100 transition duration-300 ease-in-out"
    >
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-6 h-6 mr-2" />
      Sign in with Google
    </button>
  );
}
