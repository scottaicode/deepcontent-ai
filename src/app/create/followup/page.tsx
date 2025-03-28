"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";
import { useTranslation } from "@/lib/hooks/useTranslation";
import React from "react";

interface ContentDetails {
  contentType: string;
  researchTopic: string;
  businessType: string;
  targetAudience: string;
  audienceNeeds: string;
  platform: string;
  subPlatform: string;
  youtubeTranscript?: string;
  youtubeUrl?: string;
  userId?: string;
  [key: string]: any; // Allow for additional properties
}

export default function FollowupPage() {
  const router = useRouter();
  const toast = useToast();
  const [contentDetails, setContentDetails] = useState<ContentDetails | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>(['', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const [isAiGenerated, setIsAiGenerated] = useState<boolean[]>([false, false, false]);
  const [generatingAnswers, setGeneratingAnswers] = useState<boolean[]>([false, false, false]);

  // Get the current language
  const { language } = useTranslation();

  // Initialize content details from session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedContentDetails = sessionStorage.getItem('contentDetails');
        if (savedContentDetails) {
          const parsedContentDetails = JSON.parse(savedContentDetails) as ContentDetails;
          setContentDetails(parsedContentDetails);
          // Generate questions based on the content details
          generateQuestionsFromApi(parsedContentDetails);
        } else {
          // If no content details found, redirect back to create page
          console.error('No content details found in session storage');
          router.push('/create');
        }
      } catch (error) {
        console.error('Error loading content details:', error);
      }
    }
  }, [router]);

  // Function to detect if a topic is for personal use case
  const detectPersonalUseCase = (topic: string): boolean => {
    if (!topic) return false;
    
    const personalKeywords = [
      'personal', 'hobby', 'family', 'travel', 'cooking', 'recipe', 'garden',
      'vacation', 'journal', 'blog', 'diary', 'lifestyle', 'craft', 'diy', 'home'
    ];
    
    const lowercaseTopic = topic.toLowerCase();
    return personalKeywords.some(keyword => lowercaseTopic.includes(keyword));
  };

  // Function to generate follow-up questions from API
  const generateQuestionsFromApi = async (details: ContentDetails) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const isPersonalUseCase = detectPersonalUseCase(details.researchTopic);
      
      const response = await fetch('/api/claude/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...details,
          isPersonalUseCase
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch questions from API');
      }
      
      const data = await response.json();
      
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        // Take only the first 3 questions
        setFollowUpQuestions(data.questions.slice(0, 3));
      } else {
        throw new Error('No valid questions returned from the API');
      }
    } catch (error: any) {
      console.error('Error generating questions from API:', error);
      setError(`Unable to generate follow-up questions: ${error.message}. Please try again or go back to the previous step.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to retry question generation
  const handleRetry = () => {
    if (contentDetails) {
      generateQuestionsFromApi(contentDetails);
    }
  };

  // Function to handle answer changes
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...followUpAnswers];
    newAnswers[index] = value;
    setFollowUpAnswers(newAnswers);
  };

  // Function to handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate that at least the first question is answered
    if (!followUpAnswers[0] || followUpAnswers[0].trim() === '') {
      toast.toast({
        title: "Please answer the first question",
        description: "This information helps us provide more relevant research",
        variant: "destructive"
      });
      return;
    }
    
    // Save the form data to session storage along with existing content details
    if (contentDetails) {
      const updatedDetails = {
        ...contentDetails,
        followUp: {
          questions: followUpQuestions,
          answers: followUpAnswers
        }
      };
      
      sessionStorage.setItem('contentDetails', JSON.stringify(updatedDetails));
      
      // Navigate to the research page and indicate to start at step 3
      router.push('/create/research?step=3');
    }
  };

  // Check if the first question has been answered (required)
  const canSubmit = followUpAnswers[0]?.trim().length > 0;

  const renderQuestionCard = (
    question: string,
    index: number,
    answer: string,
    setAnswer: (value: string) => void
  ) => {
    return (
      <div className="mb-6 rounded-lg bg-white shadow-sm p-6 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-medium">
              {index + 1}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">{question}</h3>
            
            <div className="mb-2">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t('followup.placeholder', { defaultValue: 'Your answer...' })}
                className={`w-full rounded-md border ${isAiGenerated[index] ? 'border-purple-300 bg-purple-50' : 'border-gray-300'} px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
                rows={3}
              />
            </div>
            
            {/* AI Answer Generation Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => generateAiAnswer(index)}
                disabled={generatingAnswers[index]}
                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors flex items-center space-x-1 disabled:opacity-50"
              >
                {generatingAnswers[index] ? (
                  <>
                    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('followup.aiAnswer.generating', { defaultValue: 'Generating answer...' })}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    <span>{t('followup.aiAnswer.generateButton', { defaultValue: 'Generate AI Answer' })}</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Display a note if the answer was AI-generated */}
            {isAiGenerated[index] && answer.trim() && (
              <div className="mt-1 text-xs text-purple-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-7a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                {t('followup.aiAnswer.label', { defaultValue: 'AI-generated answer' })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Function to generate AI answer
  const generateAiAnswer = async (index: number) => {
    if (!contentDetails || !followUpQuestions[index]) return;
    
    // Update UI to show loading state
    const newGeneratingAnswers = [...generatingAnswers];
    newGeneratingAnswers[index] = true;
    setGeneratingAnswers(newGeneratingAnswers);
    
    try {
      const response = await fetch('/api/claude/answer-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: followUpQuestions[index],
          content: '', // Empty string for follow-up phase
          research: '', // No research yet
          transcript: contentDetails.youtubeTranscript || '',
          contentType: contentDetails.contentType,
          platform: contentDetails.platform,
          audience: contentDetails.targetAudience,
          topic: contentDetails.researchTopic,
          language
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI answer');
      }
      
      // Update the answer in state
      const newAnswers = [...followUpAnswers];
      newAnswers[index] = data.answer;
      setFollowUpAnswers(newAnswers);
      
      // Mark as AI generated
      const newIsAiGenerated = [...isAiGenerated];
      newIsAiGenerated[index] = true;
      setIsAiGenerated(newIsAiGenerated);
      
      // Show success message
      toast.toast({
        title: t('followup.aiAnswer.success', { defaultValue: "AI Answer Generated" }),
        description: t('followup.aiAnswer.successDesc', { defaultValue: "Answer created without repeating the question. You can edit if needed." }),
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error generating AI answer:', error);
      toast.toast({
        title: t('followup.aiAnswer.error', { defaultValue: "Error Generating Answer" }),
        description: error.message || t('followup.aiAnswer.errorDesc', { defaultValue: "Failed to generate AI answer. Please try again." }),
        variant: "destructive"
      });
    } finally {
      // Reset loading state
      const newGeneratingAnswers = [...generatingAnswers];
      newGeneratingAnswers[index] = false;
      setGeneratingAnswers(newGeneratingAnswers);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('followup.title', { defaultValue: 'Follow-up Questions' })}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('followup.subtitle', { defaultValue: 'Please answer these questions to help us generate more tailored content for you.' })}
          <span className="text-blue-600 font-medium ml-1">{t('followup.requiredNote', { defaultValue: 'Required questions are marked with *' })}</span>
        </p>
      </div>

      {/* Content Form */}
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border dark:border-gray-700 p-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">✓</div>
            <span className="text-sm mt-2 font-medium dark:text-gray-300">{t('followup.steps.myIdea', { defaultValue: 'My Idea' })}</span>
          </div>
          <div className="h-1 flex-1 bg-blue-600 mx-2"></div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">✓</div>
            <span className="text-sm mt-2 font-medium dark:text-gray-300">{t('followup.steps.target', { defaultValue: 'Target' })}</span>
          </div>
          <div className="h-1 flex-1 bg-blue-600 mx-2"></div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
            <span className="text-sm mt-2 font-medium dark:text-gray-300">{t('followup.steps.followUp', { defaultValue: 'Follow-up' })}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">{t('followup.loading', { defaultValue: 'Generating questions...' })}</p>
          </div>
        ) : error ? (
          <div className="space-y-6">
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300">
              <h3 className="text-lg font-medium mb-2">{t('common.error', { defaultValue: 'Error' })}</h3>
              <p>{error}</p>
            </div>
            <div className="flex justify-between">
              <Link 
                href="/create"
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors"
              >
                {t('followup.backToContent', { defaultValue: 'Back to Content Form' })}
              </Link>
              <button 
                onClick={handleRetry}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                {t('common.retry', { defaultValue: 'Retry' })}
              </button>
            </div>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {followUpQuestions.map((question, index) => (
              <React.Fragment key={index}>
                {renderQuestionCard(question, index, followUpAnswers[index] || '', (value) => handleAnswerChange(index, value))}
              </React.Fragment>
            ))}

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !canSubmit}
                className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <span className="animate-spin">⏳</span>
                    <span>{t('followup.loading', { defaultValue: 'Processing...' })}</span>
                  </div>
                ) : (
                  <>
                    {t('followup.submitButton', { defaultValue: 'Submit Answers' })}
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
} 