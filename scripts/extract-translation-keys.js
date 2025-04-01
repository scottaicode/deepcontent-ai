#!/usr/bin/env node

/**
 * Translation Key Extractor
 * 
 * This script scans your codebase to find all translation keys used in your components,
 * then checks if they exist in your translation files.
 * 
 * Usage: node extract-translation-keys.js [directory]
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Default directory to scan
const DEFAULT_DIR = path.join(__dirname, '../src');
const SEARCH_PATTERNS = [
  // Find t('key') or t("key") patterns
  /\bt\(['"]([^'"]+)['"]/g,
  // Find languageT('key') patterns
  /\blanguageT\(['"]([^'"]+)['"]/g,
  // Find useTranslation hook with "key" patterns
  /\.t\(['"]([^'"]+)['"]/g,
  // Find getComponentText('key') patterns
  /getComponentText\(['"]([^'"]+)['"]/g,
  // Find getTrans('key') patterns
  /getTrans\(['"]([^'"]+)['"]/g
];

// Paths to the translation files
const EN_PATH = path.join(__dirname, '../src/locales/en.json');
const ES_PATH = path.join(__dirname, '../src/locales/es.json');

// Load the translation files
const enTranslations = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const esTranslations = JSON.parse(fs.readFileSync(ES_PATH, 'utf8'));

// Get the directory to scan from command line args or use default
const scanDir = process.argv[2] || DEFAULT_DIR;

/**
 * Check if a translation key exists in the given translations object
 */
function keyExists(translations, key) {
  const parts = key.split('.');
  let current = translations;
  
  for (const part of parts) {
    if (!current || typeof current !== 'object') return false;
    current = current[part];
  }
  
  return current !== undefined;
}

/**
 * Extract translation keys from a file
 */
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();
  
  // Apply each pattern
  for (const pattern of SEARCH_PATTERNS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Check if the key has dynamic parts like {placeholder}
      const key = match[1];
      keys.add(key);
    }
  }
  
  return Array.from(keys);
}

/**
 * Main function to scan the codebase
 */
async function main() {
  console.log(`🔍 Scanning ${scanDir} for translation keys...`);
  
  // Find all TypeScript/JavaScript/JSX/TSX files
  const files = glob.sync(path.join(scanDir, '**/*.{ts,tsx,js,jsx}'));
  console.log(`Found ${files.length} files to scan.`);
  
  // Extract keys from all files
  const allKeys = new Set();
  const keysByFile = {};
  
  files.forEach(file => {
    const relativeFile = path.relative(process.cwd(), file);
    const keys = extractKeysFromFile(file);
    
    if (keys.length > 0) {
      keysByFile[relativeFile] = keys;
      keys.forEach(key => allKeys.add(key));
    }
  });
  
  console.log(`\nExtracted ${allKeys.size} unique translation keys from ${Object.keys(keysByFile).length} files.`);
  
  // Check which keys don't exist in translations
  const missingInEn = [];
  const missingInEs = [];
  
  allKeys.forEach(key => {
    if (!keyExists(enTranslations, key)) {
      missingInEn.push(key);
    }
    if (!keyExists(esTranslations, key)) {
      missingInEs.push(key);
    }
  });
  
  // Display results
  if (missingInEn.length > 0) {
    console.log(`\n❌ Found ${missingInEn.length} keys missing in English translations:`);
    missingInEn.forEach(key => console.log(`  - ${key}`));
  }
  
  if (missingInEs.length > 0) {
    console.log(`\n❌ Found ${missingInEs.length} keys missing in Spanish translations:`);
    missingInEs.forEach(key => console.log(`  - ${key}`));
  }
  
  if (missingInEn.length === 0 && missingInEs.length === 0) {
    console.log('\n✅ All extracted keys exist in both translation files!');
  }
  
  // List keys by component
  console.log('\n📝 Keys by component:');
  Object.keys(keysByFile).sort().forEach(file => {
    const keys = keysByFile[file];
    console.log(`\n${file} (${keys.length} keys):`);
    keys.forEach(key => {
      const inEn = keyExists(enTranslations, key);
      const inEs = keyExists(esTranslations, key);
      const status = inEn && inEs ? '✅' : inEn ? '🟠' : '❌';
      console.log(`  ${status} ${key}`);
    });
  });
  
  // Exit with error code if missing keys
  if (missingInEn.length > 0 || missingInEs.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
}); 