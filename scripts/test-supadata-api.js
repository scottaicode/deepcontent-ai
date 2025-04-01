/**
 * Test script for Supadata YouTube Transcript API
 * 
 * This script tests the Supadata API directly using Node.js's fetch API
 * to verify if the API key is working correctly.
 * 
 * Run with: node scripts/test-supadata-api.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// The YouTube video ID to test with (Rick Astley - Never Gonna Give You Up)
const TEST_VIDEO_ID = 'dQw4w9WgXcQ';

// Get the API key from environment variables
const apiKey = process.env.SUPADATA_API_KEY;

if (!apiKey) {
  console.error('❌ Error: SUPADATA_API_KEY not found in environment variables.');
  console.error('Please ensure you have set the API key in .env.local');
  process.exit(1);
}

// Log partial API key for verification
console.log(`🔑 Using API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`);

/**
 * Test the Supadata API with x-api-key header
 */
async function testWithXApiKey() {
  console.log(`\n📝 Testing with x-api-key header...`);
  console.log(`🎥 Video ID: ${TEST_VIDEO_ID}`);

  try {
    const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${TEST_VIDEO_ID}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    console.log(`📊 Response status: ${status}`);

    // Get response headers
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log(`📋 Response headers:`, headers);

    // Get response body
    const text = await response.text();
    console.log(`📄 Response text: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);

    if (response.ok) {
      console.log(`✅ Success! The API key works with x-api-key header.`);
      try {
        const data = JSON.parse(text);
        console.log(`📊 Response contains ${data.content ? data.content.length : 0} transcript segments.`);
      } catch (e) {
        console.log(`⚠️ Could not parse response as JSON.`);
      }
    } else {
      console.log(`❌ Failed with status ${status}.`);
    }

    return { ok: response.ok, status, text, headers };
  } catch (error) {
    console.error(`❌ Error during request:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Test the Supadata API with Authorization header
 */
async function testWithAuthorizationHeader() {
  console.log(`\n📝 Testing with Authorization Bearer header...`);
  console.log(`🎥 Video ID: ${TEST_VIDEO_ID}`);

  try {
    const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${TEST_VIDEO_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    console.log(`📊 Response status: ${status}`);

    // Get response headers
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log(`📋 Response headers:`, headers);

    // Get response body
    const text = await response.text();
    console.log(`📄 Response text: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);

    if (response.ok) {
      console.log(`✅ Success! The API key works with Authorization Bearer header.`);
      try {
        const data = JSON.parse(text);
        console.log(`📊 Response contains ${data.content ? data.content.length : 0} transcript segments.`);
      } catch (e) {
        console.log(`⚠️ Could not parse response as JSON.`);
      }
    } else {
      console.log(`❌ Failed with status ${status}.`);
    }

    return { ok: response.ok, status, text, headers };
  } catch (error) {
    console.error(`❌ Error during request:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Test the Supadata API with URL parameter (some APIs accept key as query param)
 */
async function testWithUrlParameter() {
  console.log(`\n📝 Testing with API key as URL parameter...`);
  console.log(`🎥 Video ID: ${TEST_VIDEO_ID}`);

  try {
    const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${TEST_VIDEO_ID}&apiKey=${apiKey}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    console.log(`📊 Response status: ${status}`);

    // Get response headers
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log(`📋 Response headers:`, headers);

    // Get response body
    const text = await response.text();
    console.log(`📄 Response text: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);

    if (response.ok) {
      console.log(`✅ Success! The API key works as URL parameter.`);
      try {
        const data = JSON.parse(text);
        console.log(`📊 Response contains ${data.content ? data.content.length : 0} transcript segments.`);
      } catch (e) {
        console.log(`⚠️ Could not parse response as JSON.`);
      }
    } else {
      console.log(`❌ Failed with status ${status}.`);
    }

    return { ok: response.ok, status, text, headers };
  } catch (error) {
    console.error(`❌ Error during request:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Main function to run all tests
 */
async function runTests() {
  console.log(`🧪 Starting Supadata API Key Tests`);
  console.log(`⌛ Test time: ${new Date().toISOString()}`);
  console.log(`🌐 Testing against: https://api.supadata.ai/v1/youtube/transcript`);

  // Run all tests
  const xApiKeyResult = await testWithXApiKey();
  const authHeaderResult = await testWithAuthorizationHeader();
  const urlParamResult = await testWithUrlParameter();

  // Summary
  console.log(`\n📋 Summary:`);
  console.log(`x-api-key header: ${xApiKeyResult.ok ? '✅ Success' : `❌ Failed (${xApiKeyResult.status || 'Error'})`}`);
  console.log(`Authorization header: ${authHeaderResult.ok ? '✅ Success' : `❌ Failed (${authHeaderResult.status || 'Error'})`}`);
  console.log(`URL parameter: ${urlParamResult.ok ? '✅ Success' : `❌ Failed (${urlParamResult.status || 'Error'})`}`);

  // Check documentation link
  console.log(`\n📚 For more information, see the Supadata documentation:`);
  console.log(`https://supadata.ai/youtube-transcript-api`);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Unexpected error during tests:', error);
  process.exit(1); });
