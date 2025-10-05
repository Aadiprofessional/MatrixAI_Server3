// Test file for Image Prompt APIs
// Run this file with: node test_image_prompt_api.js

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Change this to your server URL
const API_BASE = `${BASE_URL}/api/image-prompt`;

// Test data
const testImagePrompt = {
  image_url: 'https://example.com/sample-image.jpg',
  prompt: 'A beautiful landscape with mountains and a lake',
  user_id: '123e4567-e89b-12d3-a456-426614174000' // Optional UUID
};

// Test functions
async function testSaveImagePrompt() {
  console.log('\n🧪 Testing POST /api/image-prompt/saveImagePrompt');
  try {
    const response = await axios.post(`${API_BASE}/saveImagePrompt`, testImagePrompt);
    console.log('✅ Success:', response.data);
    return response.data.data.id; // Return the created ID for further tests
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

async function testGetAllImagePrompts() {
  console.log('\n🧪 Testing GET /api/image-prompt/getAllImagePrompts');
  try {
    const response = await axios.get(`${API_BASE}/getAllImagePrompts?limit=10&offset=0`);
    console.log('✅ Success:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

async function testGetImagePromptById(id) {
  console.log(`\n🧪 Testing GET /api/image-prompt/getImagePrompt/${id}`);
  try {
    const response = await axios.get(`${API_BASE}/getImagePrompt/${id}`);
    console.log('✅ Success:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

async function testUpdateImagePrompt(id) {
  console.log(`\n🧪 Testing PUT /api/image-prompt/updateImagePrompt/${id}`);
  try {
    const updateData = {
      prompt: 'Updated prompt: A stunning sunset over the ocean with golden reflections'
    };
    const response = await axios.put(`${API_BASE}/updateImagePrompt/${id}`, updateData);
    console.log('✅ Success:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

async function testDeleteImagePrompt(id) {
  console.log(`\n🧪 Testing DELETE /api/image-prompt/deleteImagePrompt/${id}`);
  try {
    const response = await axios.delete(`${API_BASE}/deleteImagePrompt/${id}`);
    console.log('✅ Success:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Image Prompt API Tests...');
  console.log(`📍 Base URL: ${API_BASE}`);
  
  // Test 1: Save a new image prompt
  const createdId = await testSaveImagePrompt();
  if (!createdId) {
    console.log('❌ Cannot continue tests without a valid ID');
    return;
  }
  
  // Test 2: Get all image prompts
  await testGetAllImagePrompts();
  
  // Test 3: Get specific image prompt by ID
  await testGetImagePromptById(createdId);
  
  // Test 4: Update the image prompt
  await testUpdateImagePrompt(createdId);
  
  // Test 5: Get the updated image prompt
  await testGetImagePromptById(createdId);
  
  // Test 6: Delete the image prompt
  await testDeleteImagePrompt(createdId);
  
  // Test 7: Try to get the deleted image prompt (should fail)
  await testGetImagePromptById(createdId);
  
  console.log('\n🎉 All tests completed!');
}

// Error handling for invalid URLs
async function testInvalidRequests() {
  console.log('\n🧪 Testing invalid requests...');
  
  // Test invalid image URL
  try {
    await axios.post(`${API_BASE}/saveImagePrompt`, {
      image_url: 'invalid-url',
      prompt: 'Test prompt'
    });
  } catch (error) {
    console.log('✅ Correctly rejected invalid URL:', error.response?.data?.error);
  }
  
  // Test missing required fields
  try {
    await axios.post(`${API_BASE}/saveImagePrompt`, {
      image_url: 'https://example.com/image.jpg'
      // Missing prompt
    });
  } catch (error) {
    console.log('✅ Correctly rejected missing prompt:', error.response?.data?.error);
  }
  
  // Test non-existent ID
  try {
    await axios.get(`${API_BASE}/getImagePrompt/00000000-0000-0000-0000-000000000000`);
  } catch (error) {
    console.log('✅ Correctly handled non-existent ID:', error.response?.data?.error);
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => testInvalidRequests())
    .catch(error => {
      console.error('💥 Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  testSaveImagePrompt,
  testGetAllImagePrompts,
  testGetImagePromptById,
  testUpdateImagePrompt,
  testDeleteImagePrompt
};