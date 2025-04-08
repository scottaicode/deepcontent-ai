'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/app/components/LanguageProvider';

export default function ImageEditor() {
  const { t } = useLanguage();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiLimited, setApiLimited] = useState<boolean>(false);
  const [temperature, setTemperature] = useState(0.7); // Default temperature
  const [progressStage, setProgressStage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const sourceImageRef = useRef<HTMLDivElement>(null);
  const targetImageRef = useRef<HTMLDivElement>(null);
  const resultImageRef = useRef<HTMLDivElement>(null);

  // Define tab type for type safety
  type TabType = 'additions' | 'transformations' | 'backgrounds' | 'combinations' | 'effects';
  const [activeTab, setActiveTab] = useState<TabType>('additions');

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

  // Function to resize an image to a maximum width/height while maintaining aspect ratio
  const resizeImage = (base64Image: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get the resized image as base64
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        
        // Strip the prefix and return just the base64 data
        resolve(resizedBase64.split(',')[1]);
      };
      
      img.onerror = () => {
        reject(new Error('Error loading image for resizing'));
      };
      
      img.src = `data:image/jpeg;base64,${base64Image}`;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'source' | 'target') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file size (max 20MB)
      const maxSizeInBytes = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSizeInBytes) {
        alert(`Image size too large (max 20MB). Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
        return;
      }

      // Validate file type
      const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!acceptedTypes.includes(file.type)) {
        alert('Only JPEG, PNG and WebP images are supported');
        return;
      }

      const reader = new FileReader();
      
      reader.onloadend = async () => {
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
        
        console.log(`${type} image loaded, original size: ${base64Data.length} chars`);
        
        try {
          // Check if image is large and needs resizing (base64 is ~4/3 the size of the binary data)
          // If over 1MB in base64, we should resize it
          if (base64Data.length > 1000000) {
            console.log(`Resizing large ${type} image...`);
            const resizedBase64 = await resizeImage(base64Data, 1200, 1200);
            console.log(`${type} image resized from ${base64Data.length} to ${resizedBase64.length} chars`);
            
            if (type === 'source') {
              setSourceImage(resizedBase64);
            } else {
              setTargetImage(resizedBase64);
            }
          } else {
            // Image is small enough to use as-is
            if (type === 'source') {
              setSourceImage(base64Data);
            } else {
              setTargetImage(base64Data);
            }
          }
        } catch (resizeError) {
          console.error('Error resizing image:', resizeError);
          
          // Fall back to using the original image if resize fails
          if (type === 'source') {
            setSourceImage(base64Data);
          } else {
            setTargetImage(base64Data);
          }
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
    
    // Progress simulation
    setProgressStage('Preparing image data');
    setProgressPercent(10);
    
    try {
      console.log('Sending request to edit image API...');
      console.log('Source image size:', sourceImage.length, 'chars');
      if (targetImage) {
        console.log('Target image size:', targetImage.length, 'chars');
      }
      console.log('Using temperature:', temperature);
      
      setProgressStage('Sending request to AI model');
      setProgressPercent(30);
      
      const response = await fetch('/api/gemini/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceImage,
          targetImage,
          prompt,
          temperature // Pass the temperature to the API
        }),
      });

      setProgressStage('Processing AI response');
      setProgressPercent(70);
      
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
      
      setProgressStage('Finalizing result');
      setProgressPercent(90);
      
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
      
      setProgressStage('Complete');
      setProgressPercent(100);
    } catch (error: any) {
      console.error('Error during image editing:', error);
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
      // Reset progress after a brief delay
      setTimeout(() => {
        setProgressStage(null);
        setProgressPercent(0);
      }, 1000);
    }
  };

  // Categorized prompt examples
  const promptCategories = {
    additions: [
      "Add onions to the hotdog",
      "Add a person to the beach scene",
      "Add a dog to the park",
      "Put sunglasses on the person",
      "Add a coffee cup to the table",
      "Add flowers in the foreground",
      "Add clouds to the sky",
      "Add a hat to the person"
    ],
    transformations: [
      "Turn this into a watercolor painting",
      "Make it look like a pencil sketch",
      "Convert to anime style",
      "Transform into a 3D rendering",
      "Make it look like a stained glass window",
      "Convert to black and white with high contrast",
      "Make this look like a vintage photograph",
      "Transform into a digital illustration"
    ],
    backgrounds: [
      "Change background to a sunset beach",
      "Replace background with mountain landscape",
      "Make the background solid blue",
      "Remove the background completely",
      "Change to a nighttime scene",
      "Replace background with a cityscape",
      "Make the background blurry while keeping subject sharp",
      "Change background to a forest scene"
    ],
    combinations: [
      "Combine these two images side by side",
      "Put the object from image 2 into image 1",
      "Merge these images with a smooth transition",
      "Place the person from image 2 into scene in image 1",
      "Create a collage with both images",
      "Use image 2 as a background for image 1",
      "Blend these images with a gradient effect",
      "Create a reflection of image 2 in image 1"
    ],
    effects: [
      "Add a subtle glow around the subject",
      "Apply a vintage film grain effect",
      "Add a dreamy soft focus effect",
      "Create a double exposure effect",
      "Add cinematic color grading",
      "Add dramatic lighting and shadows",
      "Apply a neon light effect",
      "Add a mirror/reflection effect"
    ]
  };

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

  const handleRefinement = () => {
    if (!resultImage) return;

    // Extract the base64 data from the resultImage URL
    const base64Data = resultImage.split(',')[1];
    if (!base64Data) return;

    // Set the result as the new source image for further editing
    setSourceImage(base64Data);
    setTargetImage(null);
    setResultImage(null);
    setResultText(null);
    
    // Update prompt to indicate it's refining
    setPrompt(prompt => `Refine this image further: ${prompt}`);
    
    // Scroll to the editor section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">{t('imageEditor.title')}</h2>
      <p className="text-lg text-gray-500 mb-6">{t('imageEditor.subtitle')}</p>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-blue-700">
          {t('imageEditor.description')}
        </p>
      </div>
      
      {apiLimited && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
          <h3 className="text-amber-800 font-medium mb-2">Gemini Experimental API Limitation</h3>
          <p className="text-amber-700 text-sm">
            Your request is returning text analysis but no generated image. This is likely because:
          </p>
          <ul className="list-disc list-inside text-amber-700 text-sm mt-2 ml-2">
            <li>Gemini 2.0 Flash image generation is an <a href="https://developers.googleblog.com/en/experiment-with-gemini-20-flash-native-image-generation/" className="underline font-medium" target="_blank" rel="noopener noreferrer">experimental feature</a> (released March 12, 2023)</li>
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
        
        {/* Creative Control Slider */}
        <div className="space-y-2 py-2 mb-4">
          <div className="flex justify-between items-center">
            <Label htmlFor="temperature-slider" className="text-sm font-medium">
              {t('imageEditor.creativityLevel')} {temperature.toFixed(1)}
            </Label>
            <span className="text-xs text-gray-500">
              {temperature < 0.4 ? t('imageEditor.precise') : temperature < 0.7 ? t('imageEditor.balanced') : t('imageEditor.creative')}
            </span>
          </div>
          <Slider
            id="temperature-slider"
            min={0.1}
            max={1.0}
            step={0.1}
            value={[temperature]}
            onValueChange={(values) => setTemperature(values[0])}
            className="w-full mt-2"
            aria-label={t('imageEditor.adjustCreativityLevel')}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{t('imageEditor.precise')}</span>
            <span>{t('imageEditor.balanced')}</span>
            <span>{t('imageEditor.creative')}</span>
          </div>
        </div>
        
        {/* Prompt Examples in Tabs */}
        <div>
          <Label className="text-sm font-medium block mb-2">{t('imageEditor.examplePrompts')}</Label>
          <div className="w-full">
            <div className="grid grid-cols-5 mb-2 bg-slate-100 p-1 rounded-md">
              {['additions', 'transformations', 'backgrounds', 'combinations', 'effects'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  className={`px-3 py-1.5 text-sm font-medium transition-all rounded-sm ${
                    activeTab === tab
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t(`imageEditor.${tab === 'additions' ? 'addItems' : tab === 'transformations' ? 'transform' : tab === 'backgrounds' ? 'background' : tab === 'combinations' ? 'combine' : 'effects'}`)}
                </button>
              ))}
            </div>
            
            <div className="pt-2">
              <div className="flex flex-wrap gap-2">
                {promptCategories[activeTab] && promptCategories[activeTab].map((example, index) => (
                  <button
                    key={index}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-full"
                    onClick={() => setPrompt(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button with Loading State */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !sourceImage || !prompt}
          className="w-full relative h-10"
        >
          {loading ? (
            <div className="flex items-center justify-center w-full">
              <div className="mr-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <span>{progressStage || 'Generating...'}</span>
            </div>
          ) : 'Generate Edited Image'}
          
          {/* Progress bar for loading state */}
          {loading && (
            <div className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-md" style={{ width: `${progressPercent}%` }}></div>
          )}
        </Button>
      </div>
      
      {/* Result Display */}
      {(resultImage || resultText) && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Result</h3>
            {resultImage && (
              <Button
                onClick={handleRefinement}
                variant="outline"
                className="text-sm"
                size="sm"
              >
                Use As Source & Refine Further
              </Button>
            )}
          </div>
          
          {resultImage && (
            <div className="mb-6">
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <div ref={resultImageRef} className="w-full h-full"></div>
                <div className="absolute bottom-3 right-3 flex space-x-2">
                  <a 
                    href={resultImage}
                    download="edited-image.jpg"
                    className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
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