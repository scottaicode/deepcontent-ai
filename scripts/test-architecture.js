#!/usr/bin/env node

/**
 * DeepContent Architecture Testing Script
 * 
 * This script verifies that the codebase adheres to the research-driven
 * architecture principles. It's designed to be run as part of CI/CD
 * or git hooks to prevent architecture violations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files that must include research-driven validation
const CONTENT_GENERATION_PATHS = [
  'src/app/api/claude/content/route.ts'
];

// Patterns that indicate research-driven architecture
const RESEARCH_PATTERNS = [
  'researchData',
  'verifyResearchQuality',
  'Research data required'
];

// Patterns that might indicate hardcoded templates (excluding legitimate files)
const HARDCODED_TEMPLATE_PATTERNS = [
  'const template =',
  'let template =',
  'var template =',
  'template: `',
  'function generateTemplate'
];

// Files that are exempt from the template check
const EXEMPT_FILES = [
  'contentGenerationTemplate.js',
  'test',
  'spec',
  'mock',
  'sample',
  'example'
];

console.log('🔍 Testing DeepContent Research-Driven Architecture Compliance');

let errors = 0;
let warnings = 0;

// 1. Check content generation files for research validation
console.log('\n📊 Checking content generation routes for research validation...');
CONTENT_GENERATION_PATHS.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ WARNING: Could not find ${filePath}`);
    warnings++;
    return;
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  let foundPatterns = 0;
  
  RESEARCH_PATTERNS.forEach(pattern => {
    if (fileContent.includes(pattern)) {
      foundPatterns++;
      console.log(`✅ Found "${pattern}" in ${filePath}`);
    }
  });
  
  if (foundPatterns < 2) {
    console.log(`❌ ERROR: ${filePath} might not enforce research-driven architecture.`);
    console.log(`   At least 2 research validation patterns required, found ${foundPatterns}.`);
    errors++;
  } else {
    console.log(`✅ ${filePath} appears to follow research-driven architecture.`);
  }
});

// 2. Check for hardcoded templates outside of exempted files
console.log('\n📝 Checking for hardcoded templates...');
function checkDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      checkDirectory(filePath);
    } else if (stats.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
      // Skip exempt files
      if (EXEMPT_FILES.some(exempt => filePath.includes(exempt))) {
        return;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      HARDCODED_TEMPLATE_PATTERNS.forEach(pattern => {
        if (fileContent.includes(pattern)) {
          console.log(`⚠️ WARNING: Possible hardcoded template in ${filePath}`);
          console.log(`   Found pattern: "${pattern}"`);
          warnings++;
        }
      });
    }
  });
}

try {
  checkDirectory('src');
} catch (error) {
  console.error('Error checking for hardcoded templates:', error);
}

// 3. Print summary
console.log('\n📋 Architecture Test Summary');
console.log(`🔴 Errors: ${errors}`);
console.log(`🟠 Warnings: ${warnings}`);

if (errors > 0) {
  console.log('\n❌ FAILED: Architecture tests detected violations of the research-driven approach.');
  console.log('Please review ARCHITECTURE.md and ensure all content generation is research-driven.');
  process.exit(1);
} else {
  console.log('\n✅ PASSED: Architecture tests completed successfully.');
  if (warnings > 0) {
    console.log(`Note: ${warnings} warnings were found that should be reviewed.`);
  }
  process.exit(0);
} 