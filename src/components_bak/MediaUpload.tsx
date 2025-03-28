"use client";

import React, { useState, useRef, ChangeEvent } from 'react';
import { useMedia } from '@/lib/hooks/useMedia';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/lib/hooks/useToast';
import { UploadProgress } from '@/lib/firebase/mediaRepository';

interface MediaUploadProps {
  onUploadComplete?: (url: string) => void;
  allowedTypes?: string[];
  maxSize?: number;
  className?: string;
  buttonText?: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onUploadComplete,
  allowedTypes,
  maxSize,
  className = '',
  buttonText = 'Upload Media'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, validateFile } = useMedia();
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file
    const validationError = validateFile(file, allowedTypes);
    if (validationError) {
      toast({
        title: 'Invalid file',
        description: validationError,
        variant: 'destructive'
      });
      return;
    }
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
    
    setSelectedFile(file);
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    const handleProgress = (progress: UploadProgress) => {
      setUploadProgress(progress.progress);
      
      if (progress.error) {
        toast({
          title: 'Upload Failed',
          description: progress.error,
          variant: 'destructive'
        });
      }
    };
    
    try {
      const url = await uploadFile(selectedFile, handleProgress);
      
      if (url) {
        toast({
          title: 'Upload Complete',
          description: 'Your file has been uploaded successfully.'
        });
        
        if (onUploadComplete) {
          onUploadComplete(url);
        }
        
        // Reset state
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadProgress(0);
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading your file.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const cancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={allowedTypes?.join(',')}
      />
      
      {!selectedFile && (
        <button
          type="button"
          onClick={handleSelectFile}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {buttonText}
        </button>
      )}
      
      {selectedFile && (
        <div className="relative p-4 border border-gray-200 rounded-md">
          <button 
            type="button"
            onClick={cancelUpload}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
          
          <div className="flex items-center space-x-4">
            {previewUrl ? (
              <div className="w-20 h-20 overflow-hidden rounded-md">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-md">
                <span className="text-xs text-gray-500">No preview</span>
              </div>
            )}
            
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              
              {isUploading ? (
                <div className="mt-2">
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-blue-600 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {uploadProgress.toFixed(0)}% uploaded
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleUpload}
                  className="px-3 py-1 mt-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upload
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 