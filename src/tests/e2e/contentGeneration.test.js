/**
 * End-to-End Tests for Research-Driven Content Generation Flow
 * 
 * These tests verify that the core architectural principle of research-driven
 * content generation is preserved. They ensure each step in the flow is functioning
 * correctly and that no shortcuts bypass the research phase.
 */

import { test, expect } from '@playwright/test';

test.describe('Research-Driven Content Generation Flow', () => {
  // Setup - visit the content creation page
  test.beforeEach(async ({ page }) => {
    await page.goto('/create/content');
  });

  test('Complete end-to-end flow preserves research-driven approach', async ({ page }) => {
    // Step 1: Fill in content details
    await page.fill('[data-testid="content-subject-input"]', 'Sustainable fashion');
    await page.selectOption('[data-testid="subject-type-select"]', 'Product');
    await page.selectOption('[data-testid="target-audience-select"]', 'Environmentally conscious consumers');
    await page.selectOption('[data-testid="content-type-select"]', 'Social Media Post');
    await page.selectOption('[data-testid="platform-select"]', 'Instagram');
    
    // Step 2: Initiate research phase
    await page.click('[data-testid="start-research-button"]');
    
    // Step 3: Verify research phase is completed before content generation
    await expect(page.locator('[data-testid="research-results"]')).toBeVisible();
    
    // Extract research data to verify it's later passed to content generation
    const researchText = await page.locator('[data-testid="research-content"]').textContent();
    expect(researchText).not.toBeNull();
    expect(researchText.length).toBeGreaterThan(100);
    
    // Step 4: Proceed to content generation
    await page.click('[data-testid="continue-to-generation-button"]');
    
    // Step 5: Select content settings
    await page.selectOption('[data-testid="content-style-select"]', 'professional');
    await page.click('[data-testid="generate-content-button"]');
    
    // Step 6: Verify the content was generated
    await expect(page.locator('[data-testid="generated-content"]')).toBeVisible();
    
    // Step 7: Verify network requests to confirm research data was passed to content generation
    // This verifies the core architectural principle that content generation is based on research
    const requests = page.request.post('/api/claude/content');
    const requestBody = JSON.parse(requests.postData());
    
    // Verify research data was included in the request to Claude API
    expect(requestBody).toHaveProperty('researchData');
    expect(requestBody.researchData.length).toBeGreaterThan(0);
    
    // Step 8: Verify content generation followed research-based approach
    const generatedContent = await page.locator('[data-testid="generated-content"]').textContent();
    
    // Content should reflect some aspects from the research
    expect(generatedContent).not.toBeNull();
    
    // The specific verification will depend on the content, but we should check if 
    // some keywords or concepts from the research appear in the generated content
    const researchKeywords = extractKeywords(researchText);
    let foundKeywords = 0;
    
    researchKeywords.forEach(keyword => {
      if (generatedContent.includes(keyword)) {
        foundKeywords++;
      }
    });
    
    // At least some keywords from research should appear in content
    expect(foundKeywords).toBeGreaterThan(0);
  });
  
  test('Bypassing research phase should not be possible', async ({ page }) => {
    // Attempt to directly access content generation without research
    await page.goto('/create/content/generate');
    
    // Should redirect back to research page or show error
    await expect(page.locator('[data-testid="research-required-warning"]')).toBeVisible();
    
    // Should not see content generation form
    await expect(page.locator('[data-testid="generate-content-button"]')).not.toBeVisible();
  });
  
  test('Research data must be included in content generation API requests', async ({ page, request }) => {
    // Setup a request listener
    const apiRequestPromise = page.waitForRequest(request => {
      return request.url().includes('/api/claude/content') && request.method() === 'POST';
    });
    
    // Complete research phase
    await page.goto('/create/content');
    await page.fill('[data-testid="content-subject-input"]', 'Digital Marketing');
    await page.selectOption('[data-testid="subject-type-select"]', 'Service');
    await page.selectOption('[data-testid="content-type-select"]', 'Blog Post');
    await page.click('[data-testid="start-research-button"]');
    
    // Wait for research to complete
    await expect(page.locator('[data-testid="research-results"]')).toBeVisible();
    await page.click('[data-testid="continue-to-generation-button"]');
    
    // Generate content
    await page.click('[data-testid="generate-content-button"]');
    
    // Capture the API request
    const apiRequest = await apiRequestPromise;
    const requestBody = JSON.parse(await apiRequest.postData());
    
    // Verify research data is included
    expect(requestBody).toHaveProperty('researchData');
    expect(requestBody.researchData.length).toBeGreaterThan(0);
  });
});

// Helper function to extract keywords from research text
function extractKeywords(text) {
  // Simple implementation - extract capitalized words and phrases
  const keywords = [];
  const matches = text.match(/\b[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)*\b/g) || [];
  
  matches.forEach(match => {
    if (match.length > 3 && !keywords.includes(match)) {
      keywords.push(match);
    }
  });
  
  // Add important research sections as keywords
  const sections = [
    'best practices',
    'algorithm',
    'content format',
    'engagement',
    'posting times',
    'trends'
  ];
  
  sections.forEach(section => {
    // Find sentences containing these important sections
    const regex = new RegExp(`[^.!?]*${section}[^.!?]*[.!?]`, 'gi');
    const sectionMatches = text.match(regex) || [];
    
    sectionMatches.forEach(match => {
      const words = match.split(' ')
        .filter(word => word.length > 4)
        .map(word => word.replace(/[^\w]/g, ''));
      
      words.forEach(word => {
        if (!keywords.includes(word)) {
          keywords.push(word);
        }
      });
    });
  });
  
  return keywords;
} 