require('dotenv').config();
const axios = require('axios');

async function testCoinDeduction() {
  console.log('=== Testing Coin Deduction API ===\n');
  
  const uid = '0a147ebe-af99-481b-bcaf-ae70c9aeb8d8';
  
  try {
    console.log('1. Testing direct coin deduction API call:');
    console.log(`   UID: ${uid}`);
    console.log(`   Coin Amount: 3`);
    console.log(`   Transaction: Audio Translation`);
    
    const response = await axios.post('https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run/api/user/subtractCoins', {
      uid: uid,
      coinAmount: 3,
      transaction_name: 'Audio Translation',
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Coin deduction API response:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Coin deduction API failed:');
    
    if (error.response) {
      console.log('   HTTP Status:', error.response.status);
      console.log('   Response Data:', JSON.stringify(error.response.data, null, 2));
      console.log('   Response Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.log('   No response received from server');
      console.log('   Request details:', error.request);
    } else {
      console.log('   Request setup error:', error.message);
    }
    
    console.log('   Error code:', error.code);
    console.log('   Full error:', error.message);
  }
  
  console.log('\n2. Testing local server translation with bypass:');
  
  try {
    const localResponse = await axios.post('http://localhost:3002/api/audio/translateAudioText', {
      uid: uid,
      audioid: '435b2313-f958-48ac-81c0-b87d73c55369',
      language: 'ar'
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Local translation API response:');
    console.log('   Status:', localResponse.status);
    console.log('   Success:', localResponse.data.success);
    console.log('   Message:', localResponse.data.message);
    
    if (localResponse.data.translatedData) {
      console.log('   Translation successful!');
      console.log('   Sample translated words:', localResponse.data.translatedData.words?.slice(0, 3));
    }
    
  } catch (error) {
    console.log('❌ Local translation API failed:');
    
    if (error.response) {
      console.log('   HTTP Status:', error.response.status);
      console.log('   Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('   Error:', error.message);
    }
  }
}

testCoinDeduction();