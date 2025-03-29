"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface FollowUpQuestionsProps {
  content: string;
  research?: string;
  transcript?: string;
  contentDetails: {
    contentType?: string;
    platform?: string;
    targetAudience?: string;
    researchTopic?: string;
  };
}

interface AnswerState {
  text: string;
  isEditing: boolean;
  isGenerating: boolean;
}

const FollowUpQuestions: React.FC<FollowUpQuestionsProps> = ({
  content,
  research,
  transcript,
  contentDetails
}) => {
  const { t, language } = useTranslation();
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<(AnswerState | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  // Generate follow-up questions
  const generateQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/claude/follow-up-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          research,
          transcript,
          contentType: contentDetails.contentType || 'generic',
          platform: contentDetails.platform || 'generic',
          audience: contentDetails.targetAudience || 'general audience',
          topic: contentDetails.researchTopic || '',
          language
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      const newQuestions = data.questions || [];
      setQuestions(newQuestions);
      
      // Initialize answers array with null values for each question
      setAnswers(new Array(newQuestions.length).fill(null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate a single question
  const regenerateQuestion = async (index: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/claude/follow-up-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          research,
          transcript,
          contentType: contentDetails.contentType || 'generic',
          platform: contentDetails.platform || 'generic',
          audience: contentDetails.targetAudience || 'general audience',
          topic: contentDetails.researchTopic || '',
          language
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      // Replace only the question at the specified index
      if (data.questions && data.questions.length > 0) {
        const newQuestions = [...questions];
        newQuestions[index] = data.questions[0]; // Use the first question from the response
        setQuestions(newQuestions);
        
        // Remove the answer for this question if it exists
        if (answers[index]) {
          const newAnswers = [...answers];
          newAnswers[index] = null;
          setAnswers(newAnswers);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Generate AI answer for a question
  const generateAnswer = async (index: number) => {
    // Update answers state to show generating indicator
    const newAnswers = [...answers];
    newAnswers[index] = { text: '', isEditing: false, isGenerating: true };
    setAnswers(newAnswers);
    
    try {
      const response = await fetch('/api/claude/answer-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questions[index],
          content,
          research,
          transcript,
          contentType: contentDetails.contentType || 'generic',
          platform: contentDetails.platform || 'generic',
          audience: contentDetails.targetAudience || 'general audience',
          topic: contentDetails.researchTopic || '',
          language
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        newAnswers[index] = null;
        setAnswers(newAnswers);
        return;
      }
      
      // Update the answer in the state
      newAnswers[index] = { 
        text: data.answer, 
        isEditing: true, 
        isGenerating: false 
      };
      setAnswers(newAnswers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      // Reset the answer state for this question
      newAnswers[index] = null;
      setAnswers(newAnswers);
    }
  };

  // Regenerate AI answer for a question
  const regenerateAnswer = async (index: number) => {
    // Call the generate answer function again
    await generateAnswer(index);
  };

  // Save the AI answer
  const saveAnswer = (index: number) => {
    if (answers[index]) {
      const newAnswers = [...answers];
      newAnswers[index] = {
        ...newAnswers[index]!,
        isEditing: false
      };
      setAnswers(newAnswers);
    }
  };

  // Edit the AI answer
  const editAnswer = (index: number) => {
    if (answers[index]) {
      const newAnswers = [...answers];
      newAnswers[index] = {
        ...newAnswers[index]!,
        isEditing: true
      };
      setAnswers(newAnswers);
    }
  };

  // Cancel editing or remove AI answer
  const cancelAnswer = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = null;
    setAnswers(newAnswers);
  };

  // Update answer text
  const updateAnswerText = (index: number, text: string) => {
    if (answers[index]) {
      const newAnswers = [...answers];
      newAnswers[index] = {
        ...newAnswers[index]!,
        text
      };
      setAnswers(newAnswers);
    }
  };

  // Start editing a question
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditText(questions[index]);
  };

  // Save edited question
  const saveEdit = () => {
    if (editingIndex !== null && editText.trim()) {
      const newQuestions = [...questions];
      newQuestions[editingIndex] = editText.trim();
      setQuestions(newQuestions);
      
      // Remove the answer for this question if it exists
      if (answers[editingIndex]) {
        const newAnswers = [...answers];
        newAnswers[editingIndex] = null;
        setAnswers(newAnswers);
      }
      
      setEditingIndex(null);
      setEditText('');
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  // If there are no questions yet, show the generate button
  if (questions.length === 0) {
    return (
      <div className="mt-8 p-4 bg-white rounded-lg shadow-md border border-gray-200">
        <h3 className="text-xl font-semibold mb-4">
          {t('contentPage.followUpQuestions.title', { defaultValue: 'Follow-Up Questions' })}
        </h3>
        <p className="text-gray-600 mb-4">
          {t('contentPage.followUpQuestions.description', { defaultValue: 'Generate follow-up questions to deepen the topic and expand the conversation.' })}
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <button
          onClick={generateQuestions}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('contentPage.followUpQuestions.generating', { defaultValue: 'Generating...' })}
            </span>
          ) : (
            t('contentPage.followUpQuestions.button', { defaultValue: 'Generate Follow-Up Questions' })
          )}
        </button>
      </div>
    );
  }

  // Display the generated questions with options to regenerate or edit
  return (
    <div className="mt-8 p-4 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">
          {t('contentPage.followUpQuestions.title', { defaultValue: 'Follow-Up Questions' })}
      </h3>
        <button
          onClick={generateQuestions}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition duration-200 disabled:opacity-50"
        >
          {loading ? (
            t('contentPage.followUpQuestions.regenerating', { defaultValue: 'Regenerating...' })
          ) : (
            t('contentPage.followUpQuestions.regenerateButton', { defaultValue: 'Regenerate All' })
          )}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={index} className="border border-gray-200 rounded-md bg-gray-50 overflow-hidden">
            {/* Question Section */}
            <div className="p-3 border-b border-gray-200 bg-gray-100">
              {editingIndex === index ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md mb-2"
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      {t('contentPage.followUpQuestions.cancelButton', { defaultValue: 'Cancel' })}
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                    >
                      {t('contentPage.followUpQuestions.saveButton', { defaultValue: 'Save' })}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {question}
                    {index === 0 && (
                      <span className="text-red-600 ml-1 text-lg font-bold" style={{fontSize: "1.1em"}}> *</span>
                    )}
                    {index === 0 && (
                      <span className="text-red-500 ml-1 text-sm"> (Required)</span>
                    )}
                  </label>
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      onClick={() => startEditing(index)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      {t('contentPage.followUpQuestions.editButton', { defaultValue: 'Edit' })}
                    </button>
                    <button
                      onClick={() => regenerateQuestion(index)}
                      disabled={loading}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50"
                    >
                      {t('contentPage.followUpQuestions.regenerateOneButton', { defaultValue: 'Regenerate' })}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Answer Section */}
            <div className="p-3">
              {answers[index] === null ? (
                <div className="flex justify-center">
                  <button
                    onClick={() => generateAnswer(index)}
                    className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition duration-200"
                  >
                    {t('contentPage.followUpQuestions.generateAnswerButton', { defaultValue: 'Generate AI Answer' })}
                  </button>
                </div>
              ) : answers[index]?.isGenerating ? (
                <div className="flex justify-center items-center p-4">
                  <svg className="animate-spin mr-2 h-4 w-4 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-purple-700">
                    {t('contentPage.followUpQuestions.generatingAnswer', { defaultValue: 'Generating answer...' })}
                  </span>
                </div>
              ) : answers[index]?.isEditing ? (
                <div>
                  {/* Label hidden in edit mode too */}
                  {false && (
                    <p className="text-sm text-gray-500 mb-2">
                      {t('contentPage.followUpQuestions.aiAnswerLabel', { defaultValue: 'AI-generated answer:' })}
                    </p>
                  )}
            <textarea
                    value={answers[index]?.text || ''}
                    onChange={(e) => updateAnswerText(index, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md mb-2"
                    rows={4}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => cancelAnswer(index)}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      {t('contentPage.followUpQuestions.discardButton', { defaultValue: 'Discard' })}
                    </button>
                    <button
                      onClick={() => regenerateAnswer(index)}
                      className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
                    >
                      {t('contentPage.followUpQuestions.regenerateAnswerButton', { defaultValue: 'Regenerate' })}
                    </button>
                    <button
                      onClick={() => saveAnswer(index)}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                    >
                      {t('contentPage.followUpQuestions.saveAnswerButton', { defaultValue: 'Save Answer' })}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    {/* Label hidden by default */}
                    {false && (
                      <p className="text-sm text-gray-500">
                        {t('contentPage.followUpQuestions.aiAnswerLabel', { defaultValue: 'AI-generated answer:' })}
                      </p>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => editAnswer(index)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        {t('contentPage.followUpQuestions.editButton', { defaultValue: 'Edit' })}
                      </button>
                      <button
                        onClick={() => regenerateAnswer(index)}
                        className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100"
                      >
                        {t('contentPage.followUpQuestions.regenerateOneButton', { defaultValue: 'Regenerate' })}
                      </button>
                      <button
                        onClick={() => cancelAnswer(index)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                      >
                        {t('contentPage.followUpQuestions.removeButton', { defaultValue: 'Remove' })}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-md border border-gray-200">
                    <p className="text-gray-800">{answers[index]?.text}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FollowUpQuestions; 