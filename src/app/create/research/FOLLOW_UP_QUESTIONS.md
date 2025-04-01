# Follow-Up Questions Implementation Notes

This documentation explains how the dynamic follow-up questions are implemented in the research page.

## Key Components

### 1. generateFollowUpQuestions Function

```typescript
const generateFollowUpQuestions = async () => {
  if (!contentDetails) return;
  
  setIsLoading(true);
  setError(''); // Clear any previous errors
  
  try {
    // Prepare request payload
    const payload = {
      ...contentDetails,
      isPersonalUseCase: detectPersonalUseCase(contentDetails.researchTopic)
    };
    
    const response = await fetch('/api/claude/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate follow-up questions');
    }
    
    const data = await response.json();
    
    if (data.questions && Array.isArray(data.questions)) {
      setFollowUpQuestions(data.questions);
      setResearchStep(2); // Use the correct state setter
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    setError(`Failed to generate questions: ${error.message}`);
    toast.error(error.message || 'Failed to generate follow-up questions');
  } finally {
    setIsLoading(false);
  }
};
```

### 2. handleStartResearch Function

```typescript
const handleStartResearch = async () => {
  // Validate required fields
  if (!safeContentDetails.researchTopic) {
    setError('Please enter a research topic');
    return;
  }
  
  if (!safeContentDetails.targetAudience) {
    setError('Please enter a target audience');
    return;
  }
  
  // Clear any previous errors
  setError(null);
  
  try {
    // Generate follow-up questions based on initial input
    generateFollowUpQuestions();
    
    // Move to step 2 (follow-up questions)
    setResearchStep(2);
  } catch (error) {
    console.error('Error starting research:', error);
    setError(`Failed to start research: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
```

## Critical Implementation Details

1. **API Integration**:
   - Questions are generated via API call to `/api/claude/questions`
   - The full content details object is sent to the API
   - API returns an array of questions in `data.questions`

2. **Error Handling**:
   - Proper async/await syntax with try/catch blocks
   - Error messages are extracted from API responses
   - Errors are displayed using both state (`setError`) and toast notifications
   - Loading states are managed with `setIsLoading(true)` and `setIsLoading(false)`

3. **State Management**:
   - `followUpQuestions` state holds the array of questions
   - `researchStep` controls which step is displayed in the UI
   - Error and loading states provide user feedback

4. **Important Notes**:
   - Do not add fallback functionality - the implementation should either work with API-generated questions or show an error
   - If this functionality breaks in the future, a working backup exists at: `/backups/20250315-021344/src/app/create/research/page.tsx`

## How to Restore Working Functionality

If this functionality breaks in the future, here's how to restore it:

1. Check the most recent backup in `/backups/20250315-021344/`
2. Compare the `generateFollowUpQuestions` function and its implementation
3. Verify the function is being properly called in `handleStartResearch`
4. Ensure the API endpoint at `/api/claude/questions` is working correctly
5. If all else fails, restore the working file from the backup with:
   ```
   cp /Users/scottmartin/Downloads/Vibe_Coding/deepcontent/template-2/backups/20250315-021344/src/app/create/research/page.tsx /Users/scottmartin/Downloads/Vibe_Coding/deepcontent/template-2/src/app/create/research/page.tsx
   ``` 