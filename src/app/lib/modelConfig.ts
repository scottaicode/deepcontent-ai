/**
 * This file centralizes the configuration for AI model usage across the application.
 * It helps clarify which model is responsible for each type of task.
 */

interface ModelConfig {
  research: {
    initialResearch: string;
    deepResearch: string;
    trendingTopics: string;
  };
  content: {
    generation: string;
    editing: string;
  };
  timeEstimates: {
    perplexityResearch: {
      min: number; // minutes
      max: number; // minutes
    };
    claudeResearch: {
      min: number; // minutes
      max: number; // minutes
    };
    claudeContent: {
      min: number; // minutes
      max: number; // minutes
    };
  };
}

/**
 * Central configuration for AI model usage throughout the application
 */
export const MODEL_CONFIG: ModelConfig = {
  research: {
    initialResearch: "Perplexity", // Initial research is handled by Perplexity
    deepResearch: "Claude 3.7 Sonnet", // Deep analysis uses Claude 3.7 Sonnet
    trendingTopics: "RSS + Reddit API", // Trending topics come from RSS and Reddit APIs
  },
  content: {
    generation: "Claude 3.7 Sonnet", // Content creation uses Claude 3.7 Sonnet
    editing: "Claude 3.7 Sonnet", // Content editing uses Claude 3.7 Sonnet
  },
  timeEstimates: {
    perplexityResearch: {
      min: 2, // minutes
      max: 4, // minutes
    },
    claudeResearch: {
      min: 3, // minutes
      max: 6, // minutes
    },
    claudeContent: {
      min: 1, // minutes
      max: 3, // minutes
    },
  }
};

/**
 * Formats a time range for display in the UI
 */
export function getTimeEstimateText(modelType: 'perplexityResearch' | 'claudeResearch' | 'claudeContent'): string {
  const estimate = MODEL_CONFIG.timeEstimates[modelType];
  return `This typically takes ${estimate.min}-${estimate.max} minutes`;
}

/**
 * Returns the full process description for research or content generation
 */
export function getProcessDescription(processType: 'perplexityResearch' | 'claudeResearch' | 'claudeContent'): string {
  switch (processType) {
    case 'perplexityResearch':
      return `${getTimeEstimateText(processType)} for comprehensive research`;
    case 'claudeResearch':
      return `${getTimeEstimateText(processType)} for in-depth analysis`;
    case 'claudeContent':
      return `${getTimeEstimateText(processType)} for high-quality content creation`;
    default:
      return "This process may take several minutes to complete";
  }
} 