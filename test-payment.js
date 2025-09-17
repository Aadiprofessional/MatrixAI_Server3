/**
 * Simple test script for Airwallex payment integration
 * This script tests the payment endpoints to ensure they're working correctly
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/payment';
const TEST_PAYMENT_DATA = {
  amount: 100, // $1.00
  currency: 'USD',
  return_url: 'https://example.com/return',
  merchant_order_id: `test_order_${Date.now()}`,
  order: {
    products: [
      {
        name: 'Test Product',
        desc: 'Test product description',
        sku: 'TEST_SKU_001',
        quantity: 1,
        unit_price: 100,
        type: 'physical'
      }
    ]
  }
};

/**
 * Test the payment endpoints
 */
async function testPaymentEndpoints() {
  console.log('🚀 Starting Airwallex Payment Integration Tests\n');
  
  try {
    // Test 1: Health Check
    console.log('📋 Test 1: Health Check');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);
    console.log('   Service checks:', JSON.stringify(healthResponse.data.checks, null, 2));
    console.log('');
    
    // Test 2: Create Payment Intent
    console.log('💳 Test 2: Create Payment Intent');
    console.log('   Request data:', JSON.stringify(TEST_PAYMENT_DATA, null, 2));
    
    const createResponse = await axios.post(`${BASE_URL}/airwallex/create-intent`, TEST_PAYMENT_DATA);
    console.log('✅ Payment intent created successfully');
    console.log('   Payment Intent ID:', createResponse.data.data.id);
    console.log('   Status:', createResponse.data.data.status);
    console.log('   Amount:', createResponse.data.data.amount, createResponse.data.data.currency);
    console.log('');
    
    const paymentIntentId = createResponse.data.data.id;
    
    // Test 3: Get Payment Status
    console.log('📊 Test 3: Get Payment Status');
    const statusResponse = await axios.get(`${BASE_URL}/airwallex/status/${paymentIntentId}`);
    console.log('✅ Payment status retrieved successfully');
    console.log('   Status:', statusResponse.data.data.status);
    console.log('   Created at:', statusResponse.data.data.created_at);
    console.log('');
    
    // Test 4: Get Payment Methods
    console.log('💰 Test 4: Get Payment Methods');
    const methodsResponse = await axios.get(`${BASE_URL}/airwallex/payment-methods`);
    console.log('✅ Payment methods retrieved successfully');
    console.log('   Available methods:', methodsResponse.data.data.length);
    console.log('');
    
    // Test 5: Error Handling - Invalid Payment Intent ID
    console.log('❌ Test 5: Error Handling - Invalid Payment Intent ID');
    try {
      await axios.get(`${BASE_URL}/airwallex/status/invalid_id`);
      console.log('❌ Expected error but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Error handling working correctly');
        console.log('   Error code:', error.response.data.code);
        console.log('   Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');
    
    // Test 6: Error Handling - Missing Required Fields
    console.log('❌ Test 6: Error Handling - Missing Required Fields');
    try {
      await axios.post(`${BASE_URL}/airwallex/create-intent`, {
        currency: 'USD'
        // Missing amount
      });
      console.log('❌ Expected error but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validation error handling working correctly');
        console.log('   Error code:', error.response.data.code);
        console.log('   Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received. Is the server running?');
      console.error('   Make sure to start the server with: npm start');
    } else {
      console.error('   Error details:', error.message);
    }
  }
}

/**
 * Test API documentation endpoint
 */
async function testApiDocumentation() {
  try {
    console.log('📚 Testing API Documentation Endpoint');
    const docsResponse = await axios.get(`${BASE_URL}/docs`);
    console.log('✅ API documentation endpoint working');
    console.log('   Available endpoints:', Object.keys(docsResponse.data.endpoints).length);
    console.log('');
  } catch (error) {
    console.log('❌ API documentation test failed:', error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('  AIRWALLEX PAYMENT INTEGRATION TEST SUITE');
  console.log('='.repeat(60));
  console.log('');
  
  // Check if server is running
  try {
    await axios.get('http://localhost:3000/health');
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm start\n');
    return;
  }
  
  await testApiDocumentation();
  await testPaymentEndpoints();
  
  console.log('='.repeat(60));
  console.log('  TEST SUITE COMPLETED');
  console.log('='.repeat(60));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPaymentEndpoints,
  testApiDocumentation,
  runTests
};