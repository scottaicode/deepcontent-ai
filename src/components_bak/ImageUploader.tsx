import React, { useState, useRef } from 'react';
import { Upload, Camera, X } from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useToast } from '@/lib/hooks/useToast';

interface ImageUploaderProps {
  onImageUpload: (file: File, previewUrl: string) => void;
  onImageRemove?: () => void;
  initialImage?: string;
  className?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  aspectRatio?: number; // width/height, e.g., 1 for square, 1.91 for Instagram landscape
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  onImageRemove,
  initialImage,
  className = '',
  maxSizeMB = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  aspectRatio,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(initialImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('imageUploader.invalidType', { defaultValue: 'Invalid file type' }),
        description: t('imageUploader.allowedTypes', { defaultValue: 'Please upload a JPG, PNG, or WebP image' }),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: t('imageUploader.tooLarge', { defaultValue: 'File too large' }),
        description: t('imageUploader.maxSize', { defaultValue: `Maximum file size is ${maxSizeMB}MB` }),
        variant: 'destructive',
      });
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    
    // Check aspect ratio if specified
    if (aspectRatio) {
      const img = new Image();
      img.onload = () => {
        const imageRatio = img.width / img.height;
        const tolerance = 0.1; // Allow 10% deviation from the ideal ratio
        
        if (Math.abs(imageRatio - aspectRatio) > tolerance * aspectRatio) {
          toast({
            title: t('imageUploader.aspectRatioWarning', { defaultValue: 'Aspect ratio warning' }),
            description: t('imageUploader.aspectRatioMessage', { 
              defaultValue: `This image doesn't match the recommended aspect ratio. It may be cropped when published.` 
            }),
            variant: 'destructive',
          });
        }
      };
      img.src = previewUrl;
    }

    // Notify parent component
    onImageUpload(file, previewUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageRemove) {
      onImageRemove();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {!preview ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('imageUploader.dragDrop', { defaultValue: 'Drag and drop an image, or click to browse' })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('imageUploader.supportedFormats', { 
                defaultValue: 'PNG, JPG or WebP (max. {maxSize}MB)',
                maxSize: maxSizeMB 
              })}
            </p>
            {aspectRatio && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('imageUploader.recommendedRatio', { 
                  defaultValue: 'Recommended aspect ratio: {ratio}',
                  ratio: aspectRatio.toFixed(2)
                })}
              </p>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={allowedTypes.join(',')}
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden">
          <img 
            src={preview} 
            alt={t('imageUploader.preview', { defaultValue: 'Image preview' })} 
            className="w-full h-auto object-cover" 
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-gray-900/70 text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
            aria-label={t('imageUploader.remove', { defaultValue: 'Remove image' })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader; 