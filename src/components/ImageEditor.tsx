'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ImageEditor() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiLimited, setApiLimited] = useState<boolean>(false);
  
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const sourceImageRef = useRef<HTMLDivElement>(null);
  const targetImageRef = useRef<HTMLDivElement>(null);
  const resultImageRef = useRef<HTMLDivElement>(null);

  // Effect to update image displays whenever images change
  useEffect(() => {
    if (sourceImage && sourceImageRef.current) {
      sourceImageRef.current.innerHTML = '';
      const img = document.createElement('img');
      img.src = `data:image/jpeg;base64,${sourceImage}`;
      img.alt = 'Source';
      img.className = 'object-contain w-full h-full';
      sourceImageRef.current.appendChild(img);
    }
    
    if (targetImage && targetImageRef.current) {
      targetImageRef.current.innerHTML = '';
      const img = document.createElement('img');
      img.src = `data:image/jpeg;base64,${targetImage}`;
      img.alt = 'Target';
      img.className = 'object-contain w-full h-full';
      targetImageRef.current.appendChild(img);
    }
    
    if (resultImage && resultImageRef.current) {
      resultImageRef.current.innerHTML = '';
      const img = document.createElement('img');
      img.src = resultImage;
      img.alt = 'Result';
      img.className = 'object-contain w-full h-full';
      resultImageRef.current.appendChild(img);
    }
  }, [sourceImage, targetImage, resultImage]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'source' | 'target') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file size (max 10MB)
      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSizeInBytes) {
        alert(`Image size too large (max 10MB). Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
        return;
      }

      // Validate file type
      const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!acceptedTypes.includes(file.type)) {
        alert('Only JPEG, PNG and WebP images are supported');
        return;
      }

      const reader = new FileReader();
      
      reader.onloadend = () => {
        // Make sure we have a result and it's a string
        if (!reader.result || typeof reader.result !== 'string') {
          console.error('FileReader did not produce a valid result');
          return;
        }
        
        // Extract the base64 data (remove the data:image/xxx;base64, prefix)
        const base64String = reader.result;
        const base64Data = base64String.split(',')[1];
        
        if (!base64Data) {
          console.error('Could not extract base64 data from image');
          return;
        }
        
        console.log(`${type} image loaded, size: ${base64Data.length} chars`);
        
        if (type === 'source') {
          setSourceImage(base64Data);
        } else {
          setTargetImage(base64Data);
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image upload:', error);
      alert('Error processing the image. Please try another file.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceImage || !prompt) {
      alert('Please upload at least a source image and provide a prompt');
      return;
    }

    setLoading(true);
    setError(null);
    setResultImage(null);
    setResultText(null);
    setApiLimited(false);
    
    try {
      console.log('Sending request to edit image API...');
      console.log('Source image size:', sourceImage.length, 'chars');
      if (targetImage) {
        console.log('Target image size:', targetImage.length, 'chars');
      }
      
      const response = await fetch('/api/gemini/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceImage,
          targetImage,
          prompt,
        }),
      });

      const data = await response.json();
      console.log('Response received:', { status: response.status, hasError: !!data.error, hasImage: !!data.image });
      
      if (data.error) {
        setError(data.error);
        if (data.apiLimited) {
          setApiLimited(true);
        }
        return;
      }

      if (data.apiLimited) {
        setApiLimited(true);
      }
      
      if (data.image) {
        setResultImage(data.image);
        console.log('Successfully received edited image');
      } else {
        console.log('No image in response');
      }
      
      if (data.textResponse) {
        setResultText(data.textResponse);
        console.log('Text response:', data.textResponse.substring(0, 100));
      }
    } catch (error: any) {
      console.error('Error during image editing:', error);
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const promptExamples = [
    "Add a red hat to the woman",
    "Make the background blue",
    "Turn this into a painting",
    "Add a digital effect to the image",
    "Add a cartoon effect",
  ];

  const removeSourceImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setSourceImage(null);
    if (sourceImageRef.current) {
      sourceImageRef.current.innerHTML = '';
    }
  };

  const removeTargetImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setTargetImage(null);
    if (targetImageRef.current) {
      targetImageRef.current.innerHTML = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">AI Image Editor</h2>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-blue-700">
          Upload one or two images and describe how you want to edit them.
          Gemini 2.0 Flash will generate a new image based on your instructions.
        </p>
      </div>
      
      {apiLimited && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
          <h3 className="text-amber-800 font-medium mb-2">Gemini Experimental API Limitation</h3>
          <p className="text-amber-700 text-sm">
            Your request is returning text analysis but no generated image. This is likely because:
          </p>
          <ul className="list-disc list-inside text-amber-700 text-sm mt-2 ml-2">
            <li>Gemini 2.0 Flash image generation is an <a href="https://developers.googleblog.com/en/experiment-with-gemini-20-flash-native-image-generation/" className="underline font-medium" target="_blank" rel="noopener noreferrer">experimental feature</a> (released March 12, 2025)</li>
            <li>It requires a paid tier Gemini API key</li>
            <li>Your API access must be from a supported region</li>
            <li>You must explicitly enable image generation in your Google Cloud console</li>
          </ul>
          <div className="mt-3 p-3 bg-white rounded border border-amber-200 text-sm">
            <p className="font-medium text-amber-800">Current Limitations:</p>
            <p className="text-gray-700 mt-1">
              Even with access to the experimental API, Google notes that "the image generation capability is still being refined" and may not consistently provide high-quality image edits for all requests.
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium">Source Image</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {sourceImage ? (
              <div className="relative w-full aspect-square">
                <div ref={sourceImageRef} className="w-full h-full"></div>
                <button 
                  onClick={removeSourceImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                  title="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-2">Upload source image (required)</p>
                <Button
                  onClick={() => sourceInputRef.current?.click()}
                  variant="outline"
                >
                  Choose File
                </Button>
              </div>
            )}
            <input
              type="file"
              ref={sourceInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'source')}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Target Image <span className="text-gray-500 text-sm font-normal">(optional)</span></h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {targetImage ? (
              <div className="relative w-full aspect-square">
                <div ref={targetImageRef} className="w-full h-full"></div>
                <button 
                  onClick={removeTargetImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                  title="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-2">Upload target image (optional, for combining images)</p>
                <Button
                  onClick={() => targetInputRef.current?.click()}
                  variant="outline"
                >
                  Choose File
                </Button>
              </div>
            )}
            <input
              type="file"
              ref={targetInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'target')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="font-medium block mb-1">Editing Instructions</label>
          <Textarea
            placeholder="Enter your prompt (e.g., 'Put a red hat on the woman' or 'Change the background to a beach scene')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {promptExamples.map((example, index) => (
            <button
              key={index}
              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-full"
              onClick={(e) => {
                e.preventDefault(); 
                setPrompt(example);
              }}
            >
              {example}
            </button>
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !sourceImage || !prompt}
          className="w-full"
        >
          {loading ? 'Generating...' : 'Generate Edited Image'}
        </Button>
      </div>
      
      {/* Result Display */}
      {(resultImage || resultText) && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-xl font-bold mb-4">Result</h3>
          
          {resultImage && (
            <div className="mb-6">
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <div ref={resultImageRef} className="w-full h-full"></div>
                <a 
                  href={resultImage}
                  download="edited-image.jpg"
                  className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
                  title="Download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </a>
              </div>
            </div>
          )}
          
          {resultText && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">AI Commentary</h4>
              <p className="text-gray-700">{resultText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 