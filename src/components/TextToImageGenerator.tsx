'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/app/components/LanguageProvider';
import { IconRefresh, IconDownload, IconPhoto } from '@tabler/icons-react';

interface TextToImageGeneratorProps {
  initialPrompt?: string;
  onImageGenerated?: (imageUrl: string, prompt: string) => void;
  className?: string;
}

export default function TextToImageGenerator({
  initialPrompt = '',
  onImageGenerated,
  className = '',
}: TextToImageGeneratorProps) {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [temperature, setTemperature] = useState<number>(0.7); // Default temperature
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiLimited, setApiLimited] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [textResponse, setTextResponse] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  
  // Define tab type for type safety
  type TabType = 'creative' | 'landscapes' | 'portrait' | 'concept' | 'abstract';
  const [activeTab, setActiveTab] = useState<TabType>('creative');
  
  const resultImageRef = useRef<HTMLDivElement>(null);

  // Categorized prompt examples
  const promptCategories = {
    creative: [
      "A futuristic cityscape with flying cars and neon lights",
      "A magical forest with glowing mushrooms and fairy lights",
      "A steampunk-inspired mechanical owl with brass gears",
      "A surreal underwater city with bubble transportation",
      "A cyberpunk street scene with holographic advertisements",
      "A floating island paradise with waterfalls and rainbows",
      "A crystal castle on the peak of a snow-capped mountain"
    ],
    landscapes: [
      "A serene mountain lake at sunrise with mist rising from the water",
      "A dramatic coastline with stormy waves crashing against cliffs",
      "A peaceful meadow with wildflowers and a single oak tree",
      "A desert landscape with unique rock formations at sunset",
      "A tropical beach with crystal clear water and palm trees",
      "A lush green valley with a winding river and distant mountains",
      "A foggy forest of ancient redwood trees in the morning light"
    ],
    portrait: [
      "A portrait of a wise elder with kind eyes and weathered skin",
      "An astronaut looking at Earth from space, reflection in helmet",
      "A painter in their studio surrounded by colorful canvases",
      "A chef preparing a gourmet meal in a professional kitchen",
      "A musician performing on stage with dramatic lighting",
      "A firefighter emerging from smoke with determination",
      "A scientist in a laboratory filled with glowing equipment"
    ],
    concept: [
      "Visualize 'The Passage of Time' as a physical place",
      "The concept of hope depicted as a landscape",
      "Artificial intelligence dreaming of electric sheep",
      "The sound of music translated into visual patterns",
      "The cycle of four seasons compressed into one image",
      "The intersection of technology and nature in harmony",
      "Childhood memories fading into adulthood responsibilities"
    ],
    abstract: [
      "A geometric abstraction of human emotions",
      "Flowing liquid colors representing the four elements",
      "Fractals and patterns inspired by mathematics",
      "A visual interpretation of classical music",
      "Abstract shapes representing the concept of infinity",
      "Vibrant color fields with subtle transitions",
      "An abstract visualization of quantum physics concepts"
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a prompt for image generation');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedImage(null);
    setTextResponse(null);
    setApiLimited(false);
    
    // Progress simulation
    setProgressStage('Preparing prompt for AI');
    setProgressPercent(10);
    
    try {
      console.log('Sending request to generate image API...');
      console.log('Using temperature:', temperature);
      
      setProgressStage('Sending request to AI model');
      setProgressPercent(30);
      
      const response = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        setGeneratedImage(data.image);
        console.log('Successfully received generated image');
        
        if (onImageGenerated) {
          onImageGenerated(data.image, prompt);
        }
      } else {
        console.log('No image in response');
      }
      
      if (data.textResponse) {
        setTextResponse(data.textResponse);
        console.log('Text response:', data.textResponse.substring(0, 100));
      }
      
      setProgressStage('Complete');
      setProgressPercent(100);
    } catch (error: any) {
      console.error('Error during image generation:', error);
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

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      // For data URL images
      if (generatedImage.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = 'generated-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For regular URL images
        const response = await fetch(generatedImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'generated-image.png';
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      setError('Failed to download image. Please try again.');
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-6 space-y-6 ${className}`}>
      <h2 className="text-2xl font-bold mb-4">{t('textToImage.title')}</h2>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-blue-700">
          {t('textToImage.description')}
        </p>
      </div>
      
      {apiLimited && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
          <h3 className="text-amber-800 font-medium mb-2">{t('textToImage.apiLimitTitle')}</h3>
          <p className="text-amber-700 text-sm">
            {t('textToImage.apiLimitDescription')}
          </p>
          <ul className="list-disc list-inside text-amber-700 text-sm mt-2 ml-2">
            <li>{t('textToImage.apiLimitReason1')}</li>
            <li>{t('textToImage.apiLimitReason2')}</li>
            <li>{t('textToImage.apiLimitReason3')}</li>
            <li>{t('textToImage.apiLimitReason4')}</li>
          </ul>
          <div className="mt-3 p-3 bg-white rounded border border-amber-200 text-sm">
            <p className="font-medium text-amber-800">{t('textToImage.currentLimitations')}</p>
            <p className="text-gray-700 mt-1">
              {t('textToImage.limitationsDescription')}
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="font-medium block mb-1">{t('textToImage.promptLabel')}</label>
          <Textarea
            placeholder={t('textToImage.promptPlaceholder')}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full"
          />
        </div>
        
        {/* Creative Control Slider */}
        <div className="space-y-2 py-2 mb-4">
          <div className="flex justify-between items-center">
            <Label htmlFor="temperature-slider" className="text-sm font-medium">
              {t('textToImage.creativityLevel')} {temperature.toFixed(1)}
            </Label>
            <span className="text-xs text-gray-500">
              {temperature < 0.4 ? t('textToImage.precise') : 
               temperature < 0.7 ? t('textToImage.balanced') : 
               t('textToImage.creative')}
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
            aria-label={t('textToImage.adjustCreativityLevel')}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{t('textToImage.precise')}</span>
            <span>{t('textToImage.balanced')}</span>
            <span>{t('textToImage.creative')}</span>
          </div>
        </div>
        
        {/* Prompt Examples in Tabs */}
        <div>
          <Label className="text-sm font-medium block mb-2">{t('textToImage.examplePrompts')}</Label>
          <div className="w-full">
            <div className="grid grid-cols-5 mb-2 bg-slate-100 p-1 rounded-md">
              {['creative', 'landscapes', 'portrait', 'concept', 'abstract'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  className={`px-3 py-1.5 text-sm font-medium transition-all rounded-sm ${
                    activeTab === tab
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t(`textToImage.${tab === 'creative' ? 'creativeCategory' : tab}`)}
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
          disabled={loading || !prompt.trim()}
          className="w-full relative h-10"
        >
          {loading ? (
            <div className="flex items-center justify-center w-full">
              <div className="mr-2">
                <IconRefresh className="animate-spin h-4 w-4 text-white" />
              </div>
              <span>{progressStage || t('textToImage.generating')}</span>
            </div>
          ) : t('textToImage.generateButton')}
          
          {/* Progress bar for loading state */}
          {loading && (
            <div className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-md" style={{ width: `${progressPercent}%` }}></div>
          )}
        </Button>
      </div>
      
      {/* Result Display */}
      {(generatedImage || textResponse) && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{t('textToImage.result')}</h3>
          </div>
          
          {generatedImage && (
            <div className="mb-6">
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <div ref={resultImageRef} className="w-full h-full">
                  <img 
                    src={generatedImage} 
                    alt={t('textToImage.resultAlt')}
                    className="object-contain w-full h-full" 
                  />
                </div>
                <div className="absolute bottom-3 right-3 flex space-x-2">
                  <button
                    onClick={handleDownload}
                    className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
                    title={t('textToImage.download')}
                  >
                    <IconDownload className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {textResponse && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">{t('textToImage.aiCommentary')}</h4>
              <p className="text-gray-700">{textResponse}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 