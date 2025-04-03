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
        if (errorData.message && errorData.message.includes('API key')) {
          // If there's an API key error, generate questions locally
          console.log('API key error detected, generating questions locally');
          const localQuestions = generateLocalQuestions(details);
          setFollowUpQuestions(localQuestions);
          setIsLoading(false);
          return;
        }
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
      
      // If there's any error, generate questions locally as a fallback
      console.log('Using fallback local question generation');
      const localQuestions = generateLocalQuestions(details);
      setFollowUpQuestions(localQuestions);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate questions locally when API fails
  const generateLocalQuestions = (details: ContentDetails): string[] => {
    const { researchTopic, contentType, platform, targetAudience } = details;
    
    // Default questions based on content type
    const questions = [
      `What specific aspects of ${researchTopic} are most important to include for ${targetAudience}?`,
      `What are the main challenges users face when learning about ${researchTopic}?`,
      `What format would work best for presenting information about ${researchTopic} on ${platform}?`
    ];
    
    return questions;
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
      
      // Set the preventLanguageRedirect flag to avoid language redirect issues
      sessionStorage.setItem('preventLanguageRedirect', 'true');
      console.log('[FollowupPage] Setting preventLanguageRedirect flag for research page navigation');
      
      // Navigate to the research page and indicate to start at the Generate Research step
      // This will ensure the user goes through the Generate Research UI
      router.push('/create/research?step=3&showGenerateUI=true');
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
    <div className="min-h-screen flex flex-col">
      <main className="flex flex-col items-center p-8 max-w-5xl mx-auto flex-grow">
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

      {/* Footer - Redesigned with clarity and accessibility */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('common.appName')}</h2>
              <p className="text-gray-400 mb-4">{t('homePage.footer.subtitle')}</p>
              <div className="flex space-x-4">
                <span className="text-gray-600 cursor-not-allowed">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </span>
                <span className="text-gray-600 cursor-not-allowed">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('homePage.footer.product')}</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.features')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.pricing')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.faq')}</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('homePage.footer.resources')}</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.blog')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.guides')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.support')}</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('homePage.footer.company')}</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.about')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.careers')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.privacy')}</span></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 mt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} DeepContent. {t('homePage.footer.rights')}</p>
            <div className="mt-4 md:mt-0 text-sm text-gray-400">
              {t('homePage.footer.powered')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 