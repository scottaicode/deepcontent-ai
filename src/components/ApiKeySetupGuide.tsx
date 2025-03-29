import React from 'react';

interface ApiKeySetupGuideProps {
  apiType: 'anthropic' | 'perplexity';
  isVisible: boolean;
  onClose: () => void;
}

export default function ApiKeySetupGuide({ apiType, isVisible, onClose }: ApiKeySetupGuideProps) {
  if (!isVisible) return null;

  const anthropicInstructions = [
    "Sign up for an Anthropic account at https://console.anthropic.com/",
    "Create a new API key in the Anthropic console",
    "Copy your API key",
    "Create or edit the .env.local file in your project root",
    "Add ANTHROPIC_API_KEY=your_api_key to the file",
    "Restart your development server with npm run dev"
  ];

  const perplexityInstructions = [
    "Sign up for a Perplexity API account at https://docs.perplexity.ai/",
    "Create a new API key in the Perplexity dashboard",
    "Copy your API key",
    "Create or edit the .env.local file in your project root",
    "Add PERPLEXITY_API_KEY=your_api_key to the file",
    "Restart your development server with npm run dev"
  ];

  const instructions = apiType === 'anthropic' ? anthropicInstructions : perplexityInstructions;
  const apiName = apiType === 'anthropic' ? 'Anthropic Claude' : 'Perplexity';
  const docsLink = apiType === 'anthropic' 
    ? 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api'
    : 'https://docs.perplexity.ai/guides/model-cards';

  const pricingLink = apiType === 'anthropic'
    ? 'https://www.anthropic.com/api#pricing'
    : 'https://docs.perplexity.ai/guides/pricing';

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{apiName} API Setup Guide</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-2">To use the {apiName} API, you need to set up an API key:</p>
          
          <ol className="list-decimal pl-6 space-y-2 mt-4">
            {instructions.map((instruction, index) => (
              <li key={index} className="text-gray-700">{instruction}</li>
            ))}
          </ol>
        </div>

        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <h3 className="font-medium text-blue-800 mb-2">Environment Variables Format</h3>
          <pre className="bg-gray-800 text-white p-3 rounded overflow-x-auto">
            {apiType === 'anthropic' 
              ? 'ANTHROPIC_API_KEY=your_api_key_here' 
              : 'PERPLEXITY_API_KEY=your_api_key_here'}
          </pre>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Official Documentation</h3>
            <a 
              href={docsLink}
              target="_blank"
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {apiName} API Documentation
            </a>
          </div>
          
          <div>
            <h3 className="font-medium mb-1">Pricing Information</h3>
            <a 
              href={pricingLink}
              target="_blank"
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {apiName} API Pricing
            </a>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-6 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
} 