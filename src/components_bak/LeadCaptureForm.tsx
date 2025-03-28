"use client";

import React, { useState } from 'react';
import { useLeads } from '@/lib/hooks/useLeads';
import { useToast } from '@/lib/hooks/useToast';
import { Lead, LeadSource } from '@/lib/firebase/leadRepository';

interface LeadCaptureFormProps {
  contentId?: string; // Optional ID of the content this form is associated with
  source: string; // Where this lead is coming from (e.g., 'blog', 'landing-page', 'social')
  campaign?: string; // Optional campaign identifier
  medium?: string; // Optional medium (e.g., 'email', 'social', 'website')
  referrer?: string; // Optional referrer information
  onSuccess?: (leadId: string) => void; // Callback on successful submission
  onError?: (error: string) => void; // Callback on error
  customFields?: {
    // Additional fields to show in the form
    company?: boolean;
    jobTitle?: boolean;
    phone?: boolean;
  };
  title?: string; // Form title
  subtitle?: string; // Form subtitle
  submitButtonText?: string; // Text for the submit button
  redirectUrl?: string; // URL to redirect to after form submission
  theme?: 'light' | 'dark'; // Form theme
  className?: string; // Additional CSS classes
  layout?: 'vertical' | 'horizontal'; // Form layout
}

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({
  contentId,
  source,
  campaign,
  medium,
  referrer,
  onSuccess,
  onError,
  customFields = {
    company: false,
    jobTitle: false,
    phone: false
  },
  title = 'Get More Information',
  subtitle = 'Fill out the form below to learn more',
  submitButtonText = 'Submit',
  redirectUrl,
  theme = 'light',
  className = '',
  layout = 'vertical'
}) => {
  const { saveLead } = useLeads();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (customFields.phone && !formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    if (customFields.company && !formData.company.trim()) {
      errors.company = 'Company name is required';
    }
    
    if (customFields.jobTitle && !formData.jobTitle.trim()) {
      errors.jobTitle = 'Job title is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const leadSource: LeadSource = {
        source,
        contentId,
        campaign,
        medium,
        referrer
      };
      
      const leadData: Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        status: 'new',
        source: leadSource,
        associatedContent: contentId ? [contentId] : undefined
      };
      
      if (customFields.phone && formData.phone) {
        leadData.phone = formData.phone;
      }
      
      if (customFields.company && formData.company) {
        leadData.company = formData.company;
      }
      
      if (customFields.jobTitle && formData.jobTitle) {
        leadData.jobTitle = formData.jobTitle;
      }
      
      const leadId = await saveLead(leadData);
      
      if (leadId) {
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: '',
          jobTitle: ''
        });
        
        toast({
          title: 'Success!',
          description: 'Your information has been submitted successfully.',
          variant: 'success'
        });
        
        // Call success callback
        if (onSuccess) {
          onSuccess(leadId);
        }
        
        // Redirect if URL provided
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      } else {
        throw new Error('Failed to save lead information');
      }
    } catch (error: any) {
      console.error('Error submitting lead form:', error);
      
      toast({
        title: 'Error',
        description: 'There was a problem submitting your information. Please try again.',
        variant: 'destructive'
      });
      
      // Call error callback
      if (onError) {
        onError(error.message || 'Unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getInputClassName = (fieldName: string) => {
    const baseClasses = 'w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500';
    const darkModeClasses = theme === 'dark' ? ' bg-gray-700 border-gray-600 text-white placeholder-gray-400' : '';
    const errorClasses = formErrors[fieldName] ? ' border-red-500 focus:border-red-500 focus:ring-red-500' : '';
    
    return `${baseClasses}${darkModeClasses}${errorClasses}`;
  };
  
  const containerClassName = `rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} ${className}`;
  
  return (
    <div className={containerClassName}>
      <div className="p-6">
        <h3 className={`text-xl font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          {subtitle}
        </p>
        
        <form onSubmit={handleSubmit} className={layout === 'horizontal' ? 'flex flex-wrap -mx-2' : ''}>
          <div className={layout === 'horizontal' ? 'w-full md:w-1/2 px-2 mb-4' : 'mb-4'}>
            <label 
              htmlFor="firstName" 
              className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
            >
              First Name*
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={getInputClassName('firstName')}
              placeholder="John"
              required
            />
            {formErrors.firstName && (
              <p className="mt-1 text-sm text-red-600">{formErrors.firstName}</p>
            )}
          </div>
          
          <div className={layout === 'horizontal' ? 'w-full md:w-1/2 px-2 mb-4' : 'mb-4'}>
            <label 
              htmlFor="lastName" 
              className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
            >
              Last Name*
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={getInputClassName('lastName')}
              placeholder="Doe"
              required
            />
            {formErrors.lastName && (
              <p className="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
            )}
          </div>
          
          <div className="w-full mb-4">
            <label 
              htmlFor="email" 
              className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
            >
              Email Address*
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={getInputClassName('email')}
              placeholder="john.doe@example.com"
              required
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
            )}
          </div>
          
          {customFields.phone && (
            <div className="w-full mb-4">
              <label 
                htmlFor="phone" 
                className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
              >
                Phone Number*
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={getInputClassName('phone')}
                placeholder="(123) 456-7890"
                required={customFields.phone}
              />
              {formErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
              )}
            </div>
          )}
          
          {customFields.company && (
            <div className={layout === 'horizontal' ? 'w-full md:w-1/2 px-2 mb-4' : 'mb-4'}>
              <label 
                htmlFor="company" 
                className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
              >
                Company*
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className={getInputClassName('company')}
                placeholder="Acme Inc."
                required={customFields.company}
              />
              {formErrors.company && (
                <p className="mt-1 text-sm text-red-600">{formErrors.company}</p>
              )}
            </div>
          )}
          
          {customFields.jobTitle && (
            <div className={layout === 'horizontal' ? 'w-full md:w-1/2 px-2 mb-4' : 'mb-4'}>
              <label 
                htmlFor="jobTitle" 
                className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
              >
                Job Title*
              </label>
              <input
                type="text"
                id="jobTitle"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                className={getInputClassName('jobTitle')}
                placeholder="Marketing Manager"
                required={customFields.jobTitle}
              />
              {formErrors.jobTitle && (
                <p className="mt-1 text-sm text-red-600">{formErrors.jobTitle}</p>
              )}
            </div>
          )}
          
          <div className="mt-2 w-full">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full rounded-md py-2 px-4 font-medium ${
                theme === 'dark'
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              } transition-colors duration-200 flex justify-center items-center`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                submitButtonText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadCaptureForm; 