"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { useTranslation } from '@/lib/hooks/useTranslation';

export default function FollowUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contentDetails, setContentDetails] = useState<any>({});

  useEffect(() => {
    // Load content details from session storage
    const savedDetails = sessionStorage.getItem('contentDetails');
    if (savedDetails) {
      setContentDetails(JSON.parse(savedDetails));
    }

    // Load questions from session storage
    const savedQuestions = sessionStorage.getItem('followUpQuestions');
    if (savedQuestions) {
      setQuestions(JSON.parse(savedQuestions));
    } else {
      // Generate questions if not available
      generateQuestions();
    }

    // Load answers from session storage
    const savedAnswers = sessionStorage.getItem('followUpAnswers');
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    } else {
      // Initialize empty answers array
      setAnswers(Array(questions.length).fill(''));
    }
  }, []);

  const generateQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/claude/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contentDetails),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
        setAnswers(Array(data.questions.length).fill(''));
        
        // Save questions to session storage
        sessionStorage.setItem('followUpQuestions', JSON.stringify(data.questions));
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate follow-up questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
    
    // Save answers to session storage
    sessionStorage.setItem('followUpAnswers', JSON.stringify(newAnswers));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate first answer is provided
    if (!answers[0] || answers[0].trim() === '') {
      toast({
        title: 'Required Answer Missing',
        description: 'Please answer the first question before proceeding.',
        variant: 'destructive',
      });
      return;
    }
    
    // Save final answers to session storage
    sessionStorage.setItem('followUpAnswers', JSON.stringify(answers));
    
    // Update content details with follow-up answers
    const updatedDetails = {
      ...contentDetails,
      followUpAnswers: answers,
    };
    sessionStorage.setItem('contentDetails', JSON.stringify(updatedDetails));
    
    // Navigate to next step
    router.push('/create/research?step=3');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Follow-Up Questions</h1>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 mb-4">
            Please answer these follow-up questions to help us generate better research tailored to your needs.
          </p>
          
          {questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <label className="block text-gray-700">
                {question}
                {index === 0 && (
                  <span className="text-red-500 ml-1 font-bold text-lg"> *</span>
                )}
                {index === 0 && (
                  <span className="text-red-500 ml-1 text-sm">(Required)</span>
                )}
              </label>
              <textarea
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  index === 0 && !answers[0]
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                rows={3}
                required={index === 0}
                placeholder={index === 0 ? "This answer is required" : "Your answer (optional)"}
              />
            </div>
          ))}
          
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => router.push('/create/research')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </form>
      )}
    </div>
  );
} 