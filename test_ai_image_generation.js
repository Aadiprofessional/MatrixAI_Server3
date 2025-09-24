const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Change this to your server URL
const TEST_UID = '0a147ebe-af99-481b-bcaf-ae70c9aeb8d8'; // Replace with a valid test user ID

// Test cases
const testCases = [
  {
    name: 'Simple Bar Chart',
    description: 'Create a bar chart showing sales data for 5 different products with values 100, 150, 200, 120, 180'
  },
  {
    name: 'Line Graph',
    description: 'Generate a line graph showing temperature changes over 12 months from 10°C to 25°C'
  },
  {
    name: 'Pie Chart',
    description: 'Create a colorful pie chart showing market share: Company A 35%, Company B 25%, Company C 20%, Company D 20%'
  },
  {
    name: 'Scatter Plot',
    description: 'Generate a scatter plot with 50 random points showing correlation between height and weight'
  },
  {
    name: 'Histogram',
    description: 'Create a histogram showing distribution of student grades with normal distribution curve'
  }
];

// Function to test AI image generation
async function testAIImageGeneration(testCase) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📝 Description: ${testCase.description}`);
    
    const startTime = Date.now();
    
    const response = await axios.post(`${BASE_URL}/api/ai-image/generateImageFromDescription`, {
      uid: TEST_UID,
      description: testCase.description,
      coinCost: 50
    }, {
      timeout: 60000 // 60 second timeout
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    if (response.data.success) {
      console.log(`✅ Success! Generated in ${duration}s`);
      console.log(`🖼️  Image URL: ${response.data.imageUrl}`);
      console.log(`🆔 Image ID: ${response.data.imageId}`);
      console.log(`💰 Coins Deducted: ${response.data.coinsDeducted}`);
      return { success: true, ...response.data, duration };
    } else {
      console.log(`❌ Failed: ${response.data.message}`);
      return { success: false, error: response.data.message };
    }
    
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📄 Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
}

// Function to test getting user's AI images
async function testGetUserAIImages() {
  try {
    console.log(`\n📋 Testing: Get User AI Images`);
    
    const response = await axios.get(`${BASE_URL}/api/ai-image/getUserAIImages`, {
      params: { uid: TEST_UID }
    });
    
    if (response.data.success) {
      console.log(`✅ Success! Found ${response.data.images.length} images`);
      response.data.images.forEach((image, index) => {
        console.log(`  ${index + 1}. ${image.description.substring(0, 50)}...`);
        console.log(`     URL: ${image.image_url}`);
        console.log(`     Created: ${image.created_at}`);
      });
      return { success: true, count: response.data.images.length };
    } else {
      console.log(`❌ Failed: ${response.data.message}`);
      return { success: false, error: response.data.message };
    }
    
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📄 Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting AI Image Generation API Tests');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`👤 Test User ID: ${TEST_UID}`);
  console.log('=' * 60);
  
  const results = [];
  
  // Test each case
  for (const testCase of testCases) {
    const result = await testAIImageGeneration(testCase);
    results.push({ testCase: testCase.name, ...result });
    
    // Wait a bit between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test getting user images
  const getUserImagesResult = await testGetUserAIImages();
  results.push({ testCase: 'Get User AI Images', ...getUserImagesResult });
  
  // Summary
  console.log('\n' + '=' * 60);
  console.log('📊 TEST SUMMARY');
  console.log('=' * 60);
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful > 0) {
    const avgDuration = results
      .filter(r => r.success && r.duration)
      .reduce((sum, r) => sum + r.duration, 0) / 
      results.filter(r => r.success && r.duration).length;
    
    console.log(`⏱️  Average Duration: ${avgDuration.toFixed(2)}s`);
  }
  
  console.log('\n🔍 Detailed Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration.toFixed(2)}s)` : '';
    console.log(`  ${index + 1}. ${status} ${result.testCase}${duration}`);
    if (!result.success && result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });
  
  console.log('\n🎉 Testing completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testAIImageGeneration,
  testGetUserAIImages,
  runTests
};