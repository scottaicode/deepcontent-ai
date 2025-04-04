/**
 * WARNING: This module should not be used in production
 * It exists only to maintain type compatibility and to throw errors
 * if the application attempts to use sample/mock data
 */

export function getSampleResearch(): never {
  throw new Error('getSampleResearch should never be called in production - research must come from the API');
}

export function getGenericContentResearch(): never {
  throw new Error('getGenericContentResearch should never be called in production - research must come from the API');
} 