const axios = require('axios');

// Test CORS fix for admin endpoints
async function testCORSFix() {
  const baseURL = 'https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run';
  const origin = 'https://matrix-4hv.pages.dev';
  
  console.log('Testing CORS fix for admin endpoints...\n');
  
  // Test endpoints that were failing
  const endpoints = [
    '/api/admin/fetchUserInfoAdmin',
    '/api/admin/getAllOrders'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      
      // First test OPTIONS request (preflight)
      const optionsResponse = await axios.options(`${baseURL}${endpoint}`, {
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      console.log(`✅ OPTIONS ${endpoint}:`);
      console.log(`   Status: ${optionsResponse.status}`);
      console.log(`   Access-Control-Allow-Credentials: ${optionsResponse.headers['access-control-allow-credentials']}`);
      console.log(`   Access-Control-Allow-Origin: ${optionsResponse.headers['access-control-allow-origin']}`);
      
      // Check if credentials header is properly set (should be 'true', not 'true, true, true')
      const credentialsHeader = optionsResponse.headers['access-control-allow-credentials'];
      if (credentialsHeader === 'true') {
        console.log(`   ✅ Credentials header is correct: ${credentialsHeader}`);
      } else {
        console.log(`   ❌ Credentials header is incorrect: ${credentialsHeader}`);
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${endpoint}:`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Headers:`, error.response.headers);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Test health endpoint as a baseline
  try {
    console.log('Testing /health endpoint as baseline...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log(`✅ Health check: ${healthResponse.status} - ${healthResponse.data.status}`);
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }
}

// Run the test
testCORSFix().catch(console.error);