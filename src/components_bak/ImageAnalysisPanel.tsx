import React, { useState, useRef, useMemo } from 'react';
import { Image, Lightbulb, Loader2, ChevronUp, ChevronDown, Search, Eye, EyeOff, BrainCircuit, Upload } from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useToast } from '@/lib/hooks/useToast';
import ImageUploader from './ImageUploader';

interface ImageAnalysisPanelProps {
  contextType?: 'general' | 'social-media' | 'landing-page' | 'research';
  onAnalysisComplete?: (analysis: string) => void;
  customPrompt?: string;
  className?: string;
  startCollapsed?: boolean;
}

// Direct text constants by language to avoid translation key rendering issues
const TRANSLATIONS = {
  en: {
    title: 'Image Analysis',
    collapsedDescription: 'Get AI insights from images to enhance your content',
    description: 'Upload an image to get AI-powered insights and content ideas',
    viewFullAnalysis: 'View complete analysis',
    modifyAnalysisSettings: 'Edit image analysis',
    expandPanel: 'Upload an image for analysis',
    collapsePanel: 'Collapse panel',
    customPrompt: 'Custom Analysis Instructions',
    optional: '(Optional)',
    promptPlaceholder: 'E.g., "Identify key visual elements and suggest how they can strengthen my marketing message"',
    analyzing: 'Analyzing...',
    analyze: 'Analyze with Claude',
    results: 'Analysis Results',
    hideFullAnalysis: 'Show less'
  },
  es: {
    title: 'Análisis de Imagen',
    collapsedDescription: 'Obtén ideas de IA a partir de imágenes para mejorar tu contenido',
    description: 'Sube una imagen para obtener ideas y análisis con IA',
    viewFullAnalysis: 'Ver análisis completo',
    modifyAnalysisSettings: 'Editar análisis de imagen',
    expandPanel: 'Subir una imagen para análisis',
    collapsePanel: 'Contraer panel',
    customPrompt: 'Instrucciones personalizadas',
    optional: '(Opcional)',
    promptPlaceholder: 'Ej., "Identifica elementos visuales clave y sugiere cómo pueden fortalecer mi mensaje de marketing"',
    analyzing: 'Analizando...',
    analyze: 'Analizar con Claude',
    results: 'Resultados del análisis',
    hideFullAnalysis: 'Mostrar menos'
  }
};

const ImageAnalysisPanel: React.FC<ImageAnalysisPanelProps> = ({
  contextType = 'general',
  onAnalysisComplete,
  customPrompt,
  className = '',
  startCollapsed = false,
}) => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customUserPrompt, setCustomUserPrompt] = useState(customPrompt || '');
  const [isExpanded, setIsExpanded] = useState(!startCollapsed);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  // Get the appropriate text based on the current language
  const TEXT = useMemo(() => {
    // Default to English if the language isn't supported
    return TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
  }, [language]);

  const toggleExpand = (e: React.MouseEvent) => {
    // Prevent default behavior to avoid page jumps
    e.preventDefault();
    
    // Toggle the expanded state
    setIsExpanded(!isExpanded);
    
    // If we're expanding the panel, scroll it into view after state update
    if (!isExpanded) {
      setTimeout(() => {
        if (panelRef.current) {
          panelRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
        }
      }, 100);
    }
  };

  const toggleAnalysisExpansion = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowFullAnalysis(!showFullAnalysis);
  };

  const handleImageUpload = (file: File, previewUrl: string) => {
    setImageFile(file);
    setImagePreview(previewUrl);
    
    // Reset analysis when a new image is uploaded
    setAnalysis('');
    setShowFullAnalysis(false);
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis('');
    setShowFullAnalysis(false);
  };

  const analyzeImage = async () => {
    if (!imageFile) {
      toast({
        title: t('imageAnalysis.noImage', { defaultValue: 'No image' }),
        description: t('imageAnalysis.uploadFirst', { defaultValue: 'Please upload an image first' }),
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Create form data to send to the API
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Build the prompt with language instructions
      let promptWithLanguage = customUserPrompt || '';
      
      // Add explicit language instruction based on the current language
      if (language === 'es') {
        // Add Spanish instructions if not already in the prompt
        if (!promptWithLanguage.toLowerCase().includes('español') && !promptWithLanguage.toLowerCase().includes('spanish')) {
          promptWithLanguage = `Por favor, analiza esta imagen y responde completamente en español. ${promptWithLanguage}`;
        }
      } else if (language === 'en') {
        // Add English instructions if not already in the prompt
        if (!promptWithLanguage.toLowerCase().includes('english')) {
          promptWithLanguage = `Please analyze this image and respond in English. ${promptWithLanguage}`;
        }
      }
      
      formData.append('prompt', promptWithLanguage);
      formData.append('contextType', contextType);
      formData.append('language', language);

      // Call the API
      const response = await fetch('/api/claude/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis);
      }

      toast({
        title: t('imageAnalysis.success', { defaultValue: 'Analysis complete' }),
        description: t('imageAnalysis.successDesc', { defaultValue: 'Claude has analyzed your image' }),
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: t('imageAnalysis.error', { defaultValue: 'Analysis failed' }),
        description: t('imageAnalysis.errorDesc', { 
          defaultValue: 'Could not analyze the image. Please try again.'
        }),
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Helper function to get a preview of the analysis (first paragraph or first few lines)
  const getAnalysisPreview = () => {
    if (!analysis) return '';
    
    // First, try to find the first paragraph
    const paragraphs = analysis.split('\n\n');
    if (paragraphs.length > 0 && paragraphs[0].trim()) {
      // Return first paragraph if it's not too long
      if (paragraphs[0].length < 200) return paragraphs[0];
    }
    
    // Otherwise, return the first 150 characters
    return analysis.slice(0, 150) + '...';
  };

  // Helper to format analysis text with proper markdown/structure
  const formatAnalysisText = (text: string) => {
    const formattedLines = text.split('\n').map((line, index) => {
      // Handle headers with ## markdown format
      if (line.startsWith('##')) {
        return (
          <h3 key={index} className="text-md font-semibold mt-3 mb-1 text-gray-800 dark:text-gray-200">
            {line.replace(/^##\s+/, '')}
          </h3>
        );
      }
      
      // Handle headers with # markdown format
      if (line.startsWith('#') && !line.startsWith('##')) {
        return (
          <h2 key={index} className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">
            {line.replace(/^#\s+/, '')}
          </h2>
        );
      }
      
      // Handle lists
      if (line.match(/^-\s+/)) {
        return (
          <li key={index} className="ml-4 text-gray-700 dark:text-gray-300">
            {line.replace(/^-\s+/, '')}
          </li>
        );
      }
      
      // Regular paragraph with line break
      return (
        <React.Fragment key={index}>
          {line.trim() ? (
            <p className="text-gray-700 dark:text-gray-300 my-1">{line}</p>
          ) : (
            <div className="h-2"></div> // Empty space for blank lines
          )}
        </React.Fragment>
      );
    });
    
    return <div className="space-y-1">{formattedLines}</div>;
  };

  // Initial collapsed view just shows the header and a button to expand
  if (!isExpanded) {
    return (
      <div ref={panelRef} className={`rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`} id="image-analysis-panel">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-blue-600" />
              {TEXT.title}
            </h3>
            <button
              onClick={toggleExpand}
              className="p-1.5 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="Expand panel"
              id="expand-image-panel-btn"
              aria-expanded={isExpanded}
              aria-controls="image-analysis-content"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {TEXT.collapsedDescription}
          </p>
        </div>
        
        {analysis && (
          <div className="p-4">
            <div className="prose dark:prose-invert prose-sm max-w-none">
              <p className="text-gray-700 dark:text-gray-300 text-sm">{getAnalysisPreview()}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 justify-between">
              <button
                onClick={toggleAnalysisExpansion}
                className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors text-sm"
                id="view-full-analysis-btn"
                aria-expanded={showFullAnalysis}
                aria-controls="analysis-content"
              >
                <Eye className="h-4 w-4 mr-1.5" />
                <span>
                  {TEXT.viewFullAnalysis}
                </span>
              </button>
              
              <button
                onClick={toggleExpand}
                className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors text-sm"
                id="edit-analysis-btn"
                aria-expanded={isExpanded}
                aria-controls="image-analysis-content"
              >
                <Upload className="h-4 w-4 mr-1.5" />
                <span>
                  {TEXT.modifyAnalysisSettings}
                </span>
              </button>
            </div>
          </div>
        )}
        
        {!analysis && (
          <div className="p-4 flex justify-center">
            <button
              onClick={toggleExpand}
              className="flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              id="upload-image-btn"
              aria-expanded={isExpanded}
              aria-controls="image-analysis-content"
            >
              <Upload className="h-4 w-4 mr-2" />
              <span>
                {TEXT.expandPanel}
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Expanded view
  return (
    <div ref={panelRef} className={`rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`} id="image-analysis-panel">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-blue-600" />
            {TEXT.title}
          </h3>
          <button 
            onClick={toggleExpand}
            className="p-1.5 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Collapse panel"
            id="collapse-image-panel-btn"
            aria-expanded={isExpanded}
            aria-controls="image-analysis-content"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {TEXT.description}
        </p>
      </div>
      
      <div className="p-4" id="image-analysis-content">
        <ImageUploader 
          onImageUpload={handleImageUpload}
          onImageRemove={handleImageRemove}
          initialImage={imagePreview || undefined}
          maxSizeMB={10}
        />
        
        {imagePreview && (
          <div className="mt-4">
            <div className="flex flex-col space-y-2">
              <label 
                htmlFor="custom-prompt" 
                className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center"
              >
                <Lightbulb className="h-4 w-4 text-amber-500 mr-1.5" />
                {TEXT.customPrompt}
                <span className="ml-1 text-xs text-gray-500">{TEXT.optional}</span>
              </label>
              <textarea
                id="custom-prompt"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder={TEXT.promptPlaceholder}
                value={customUserPrompt}
                onChange={(e) => setCustomUserPrompt(e.target.value)}
              />
            </div>
            
            <button
              type="button"
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              id="analyze-image-btn"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  {TEXT.analyzing}
                </>
              ) : (
                <>
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  {TEXT.analyze}
                </>
              )}
            </button>
          </div>
        )}
        
        {analysis && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                <Lightbulb className="h-4 w-4 text-yellow-500 mr-1.5" />
                {TEXT.results}
              </h4>
            </div>
            <div className="prose dark:prose-invert prose-sm max-w-none" id="analysis-content">
              {!showFullAnalysis ? (
                <>
                  <p className="text-gray-700 dark:text-gray-300">{getAnalysisPreview()}</p>
                  <div className="flex justify-center mt-3">
                    <button
                      onClick={toggleAnalysisExpansion}
                      className="flex items-center justify-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      id="view-full-analysis-expanded-btn"
                      aria-expanded={showFullAnalysis}
                      aria-controls="analysis-content"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      <span>
                        {TEXT.viewFullAnalysis}
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {formatAnalysisText(analysis)}
                  <div className="flex justify-center mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={toggleAnalysisExpansion}
                      className="flex items-center justify-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      id="hide-full-analysis-btn"
                      aria-expanded={showFullAnalysis}
                      aria-controls="analysis-content"
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      <span>
                        {TEXT.hideFullAnalysis}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-center mt-4">
          <button
            onClick={toggleExpand}
            className="flex items-center justify-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            id="collapse-panel-btn" 
            aria-expanded={isExpanded}
            aria-controls="image-analysis-content"
            title={TEXT.collapsePanel}
          >
            <span className="mr-2">
              {TEXT.collapsePanel}
            </span>
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageAnalysisPanel; 