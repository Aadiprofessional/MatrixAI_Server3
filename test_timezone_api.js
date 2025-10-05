/**
 * Test script to demonstrate timezone-aware API calls
 * This shows how to send timezone and current time in request body
 */

const fetch = require('node-fetch');
require('dotenv').config();

// Your API base URL (update this to your actual server URL)
const API_BASE_URL = process.env.API_BASE_URL || 'https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run';

// Test user ID (replace with your actual test user ID)
const TEST_UID = '0a147ebe-af99-481b-bcaf-ae70c9aeb8d8';

/**
 * Test 1: Create Image with India timezone
 */
async function testCreateImageWithIndiaTimezone() {
  console.log('\n🇮🇳 Testing Create Image with India timezone...');
  
  const requestBody = {
    uid: TEST_UID,
    promptText: 'Beautiful sunset over mountains, professional photography',
    imageCount: 1,
    // Add timezone for India
    timezone: 'Asia/Kolkata',
    // Add current time in India (you can get this from frontend)
    currentTime: new Date().toISOString() // This will be converted to India time
  };
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/image/createImage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log('✅ Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test 2: Create Image with Hong Kong timezone
 */
async function testCreateImageWithHongKongTimezone() {
  console.log('\n🇭🇰 Testing Create Image with Hong Kong timezone...');
  
  const requestBody = {
    uid: TEST_UID,
    promptText: 'City skyline at night, Hong Kong style',
    imageCount: 1,
    // Add timezone for Hong Kong
    timezone: 'Asia/Hong_Kong',
    // Add current time
    currentTime: new Date().toISOString()
  };
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/image/createImage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log('✅ Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test 3: Get All Images with timezone
 */
async function testGetAllImagesWithTimezone() {
  console.log('\n📸 Testing Get All Images with timezone...');
  
  const requestBody = {
    uid: TEST_UID,
    page: 1,
    limit: 10,
    // Add timezone
    timezone: 'Asia/Kolkata',
    currentTime: new Date().toISOString()
  };
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/image/getAllImages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log('✅ Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Frontend JavaScript example for your website
 */
function generateFrontendExample() {
  console.log('\n📱 Frontend JavaScript Example:');
  console.log('='.repeat(60));
  
  const frontendCode = `
// Get user's timezone automatically
function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Get current time
function getCurrentTime() {
  return new Date().toISOString();
}

// Create image with timezone
async function createImageWithTimezone(uid, promptText, imageCount = 1) {
  const requestBody = {
    uid: uid,
    promptText: promptText,
    imageCount: imageCount,
    timezone: getUserTimezone(), // Automatically detected: Asia/Kolkata, Asia/Hong_Kong, etc.
    currentTime: getCurrentTime() // Current time in ISO format
  };
  
  console.log('Sending request with timezone:', requestBody.timezone);
  console.log('Sending request with time:', requestBody.currentTime);
  
  const response = await fetch('/api/image/createImage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  return await response.json();
}

// Example usage:
createImageWithTimezone('${TEST_UID}', 'Beautiful landscape', 1);
`;
  
  console.log(frontendCode);
  console.log('='.repeat(60));
}

/**
 * Show current time in different timezones
 */
function showCurrentTimeInTimezones() {
  console.log('\n🕐 Current time in different timezones:');
  console.log('='.repeat(50));
  
  const now = new Date();
  const timezones = [
    { name: 'India', tz: 'Asia/Kolkata' },
    { name: 'Hong Kong', tz: 'Asia/Hong_Kong' },
    { name: 'Singapore', tz: 'Asia/Singapore' },
    { name: 'UTC', tz: 'UTC' },
    { name: 'New York', tz: 'America/New_York' },
    { name: 'London', tz: 'Europe/London' }
  ];
  
  timezones.forEach(({ name, tz }) => {
    const timeInTz = now.toLocaleString('en-US', { 
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    console.log(`${name.padEnd(12)}: ${timeInTz} (${tz})`);
  });
  
  console.log('='.repeat(50));
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting timezone API tests...');
  
  // Show current times
  showCurrentTimeInTimezones();
  
  // Show frontend example
  generateFrontendExample();
  
  // Run API tests (uncomment to test with real API)
  // await testCreateImageWithIndiaTimezone();
  // await testCreateImageWithHongKongTimezone();
  // await testGetAllImagesWithTimezone();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📋 To use in your frontend:');
  console.log('1. Add timezone: "Asia/Kolkata" to your request body');
  console.log('2. Add currentTime: new Date().toISOString() to your request body');
  console.log('3. The server will automatically use the correct timezone for timestamps');
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testCreateImageWithIndiaTimezone,
  testCreateImageWithHongKongTimezone,
  testGetAllImagesWithTimezone,
  showCurrentTimeInTimezones
};