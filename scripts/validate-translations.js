#!/usr/bin/env node

/**
 * Translation Validation Script
 * 
 * This script compares the en.json and es.json files to ensure:
 * 1. Both files have identical key structures
 * 2. No duplicate keys exist in either file
 * 3. No flattened keys have the same name (could cause conflicts)
 * 
 * Usage: node validate-translations.js
 */

const fs = require('fs');
const path = require('path');

// Paths to the translation files
const EN_PATH = path.join(__dirname, '../src/locales/en.json');
const ES_PATH = path.join(__dirname, '../src/locales/es.json');

// Load the translation files
const enTranslations = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const esTranslations = JSON.parse(fs.readFileSync(ES_PATH, 'utf8'));

// Track found issues
let issuesFound = 0;

/**
 * Extract all keys from an object using dot notation
 */
function extractKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(extractKeys(obj[key], newKey));
    } else {
      keys.push(newKey);
    }
  }
  return keys;
}

/**
 * Find all duplicate keys in a flattened array
 */
function findDuplicates(array) {
  const seen = {};
  const duplicates = [];
  
  for (const item of array) {
    if (seen[item]) {
      if (!duplicates.includes(item)) {
        duplicates.push(item);
      }
    } else {
      seen[item] = true;
    }
  }
  
  return duplicates;
}

/**
 * Check for inconsistent naming patterns
 */
function checkNamingPatterns(keys) {
  const patterns = {
    'placeholder vs placeholderUrl': {
      pattern1: /\.urlPlaceholder$/,
      pattern2: /\.placeholderUrl$/,
      found1: [],
      found2: []
    },
    'analyze vs analyzeButton': {
      pattern1: /\.analyze$/,
      pattern2: /\.analyzeButton$/,
      found1: [],
      found2: []
    },
    'title vs header': {
      pattern1: /\.title$/,
      pattern2: /\.header$/,
      found1: [],
      found2: []
    },
    'description vs info vs details': {
      pattern1: /\.description$/,
      pattern2: /\.info$/,
      pattern3: /\.details$/,
      found1: [],
      found2: [],
      found3: []
    }
  };
  
  for (const key of keys) {
    // Check each pattern
    for (const patternName in patterns) {
      const patternObj = patterns[patternName];
      
      for (const patternKey in patternObj) {
        if (patternKey.startsWith('pattern')) {
          const foundKey = patternKey.replace('pattern', 'found');
          if (patternObj[patternKey].test(key)) {
            patternObj[foundKey].push(key);
          }
        }
      }
    }
  }
  
  // Report inconsistencies
  for (const patternName in patterns) {
    const patternObj = patterns[patternName];
    let foundSimilarPatterns = false;
    
    // Create pairs of found arrays to check (pattern1 vs pattern2, pattern2 vs pattern3, etc.)
    for (let i = 1; i <= 3; i++) {
      for (let j = i + 1; j <= 3; j++) {
        const foundKey1 = `found${i}`;
        const foundKey2 = `found${j}`;
        
        if (patternObj[foundKey1] && patternObj[foundKey1].length > 0 && 
            patternObj[foundKey2] && patternObj[foundKey2].length > 0) {
          foundSimilarPatterns = true;
          break;
        }
      }
      if (foundSimilarPatterns) break;
    }
    
    if (foundSimilarPatterns) {
      console.log(`\n🔍 Inconsistent naming pattern detected: ${patternName}`);
      issuesFound++;
      
      for (let i = 1; i <= 3; i++) {
        const foundKey = `found${i}`;
        if (patternObj[foundKey] && patternObj[foundKey].length > 0) {
          console.log(`  Pattern ${i}: ${patternObj[foundKey].length} keys - e.g., "${patternObj[foundKey][0]}"`);
        }
      }
    }
  }
}

/**
 * Get a value from an object using a dot-notation path
 */
function getValueByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

/**
 * Check if a key exists in an object using dot notation
 */
function hasKey(obj, path) {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return false;
    }
    current = current[part];
  }
  
  return current !== undefined;
}

// Step 1: Extract all keys
console.log('🔍 Analyzing translation files...');
const enKeys = extractKeys(enTranslations);
const esKeys = extractKeys(esTranslations);

// Step 2: Find missing keys in each language
const missingInEs = enKeys.filter(key => !hasKey(esTranslations, key));
const missingInEn = esKeys.filter(key => !hasKey(enTranslations, key));

if (missingInEs.length > 0) {
  console.log('\n❌ Keys missing in Spanish translation:');
  missingInEs.forEach(key => console.log(`  - ${key}`));
  issuesFound += missingInEs.length;
}

if (missingInEn.length > 0) {
  console.log('\n❌ Keys missing in English translation:');
  missingInEn.forEach(key => console.log(`  - ${key}`));
  issuesFound += missingInEn.length;
}

// Step 3: Check for duplicate keys
const enDuplicates = findDuplicates(enKeys);
const esDuplicates = findDuplicates(esKeys);

if (enDuplicates.length > 0) {
  console.log('\n⚠️ Duplicate keys in English translation:');
  enDuplicates.forEach(key => console.log(`  - ${key}`));
  issuesFound += enDuplicates.length;
}

if (esDuplicates.length > 0) {
  console.log('\n⚠️ Duplicate keys in Spanish translation:');
  esDuplicates.forEach(key => console.log(`  - ${key}`));
  issuesFound += esDuplicates.length;
}

// Step 4: Check for inconsistent naming patterns
console.log('\n🔍 Checking for inconsistent naming patterns...');
checkNamingPatterns([...enKeys, ...esKeys]);

// Step 5: Check for empty translations
const emptyEnTranslations = enKeys.filter(key => {
  const value = getValueByPath(enTranslations, key);
  return value === '' || value === null;
});

const emptyEsTranslations = esKeys.filter(key => {
  const value = getValueByPath(esTranslations, key);
  return value === '' || value === null;
});

if (emptyEnTranslations.length > 0) {
  console.log('\n⚠️ Empty values in English translation:');
  emptyEnTranslations.forEach(key => console.log(`  - ${key}`));
  issuesFound += emptyEnTranslations.length;
}

if (emptyEsTranslations.length > 0) {
  console.log('\n⚠️ Empty values in Spanish translation:');
  emptyEsTranslations.forEach(key => console.log(`  - ${key}`));
  issuesFound += emptyEsTranslations.length;
}

// Final report
if (issuesFound === 0) {
  console.log('\n✅ No issues found! Translations are in sync.');
} else {
  console.log(`\n❌ Found ${issuesFound} issues in translation files. Please fix them to ensure consistent translations.`);
  process.exit(1);
} 