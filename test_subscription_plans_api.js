const http = require('http');

const testAPI = async () => {
  console.log('Testing getSubscriptionPlans API...');
  console.log('='.repeat(60));
  
  // Test 1: Without uid (should exclude addon plans for non-logged-in users)
  console.log('\n1. Testing without uid (should exclude addon plans for non-logged-in users):');
  try {
    const response1 = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/user/getSubscriptionPlans',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({}));
    
    console.log('✅ Response:', JSON.stringify(response1, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 2: With non-existent uid (should exclude addon)
  console.log('\n2. Testing with non-existent uid (should exclude addon):');
  try {
    const response2 = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/user/getSubscriptionPlans',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ uid: 'non-existent-uid' }));
    
    console.log('✅ Response:', JSON.stringify(response2, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 3: With real user uid without active subscription (should exclude addon)
  console.log('\n3. Testing with real user uid without active subscription (should exclude addon):');
  try {
    const response3 = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/user/getSubscriptionPlans',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ uid: 'test-user-uid' }));
    
    console.log('✅ Response:', JSON.stringify(response3, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 4: With user who has active subscription (should return only addon)
  console.log('\n4. Testing with user who has active subscription (should return only addon):');
  try {
    const response4 = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/user/getSubscriptionPlans',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ uid: 'active-subscription-uid-here' }));
    
    console.log('✅ Response:', JSON.stringify(response4, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
};

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          // If not JSON, return raw data
          resolve({ rawData: data, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

testAPI();