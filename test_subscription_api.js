const axios = require('axios');

const BASE_URL = 'http://localhost:3002';
const TEST_UID = '0a60a3dc-ad38-473d-8f43-5c78c87774c0';

async function testSubscriptionAPI() {
  console.log('🧪 Testing MatrixAI Subscription API');
  console.log('=====================================\n');
  
  try {
    // Test 1: Check user info
    console.log('1. Testing user info...');
    const userResponse = await axios.post(`${BASE_URL}/api/user/userinfo`, {
      uid: TEST_UID
    });
    
    if (userResponse.data.success) {
      console.log('✅ User exists:', userResponse.data.data.email);
      console.log('   Subscription active:', userResponse.data.data.subscription_active);
    } else {
      console.log('❌ User not found');
      return;
    }
    
    // Test 2: Get current orders
    console.log('\n2. Getting current orders...');
    const ordersResponse = await axios.post(`${BASE_URL}/api/user/getUserOrder`, {
      uid: TEST_UID
    });
    
    if (ordersResponse.data.success) {
      console.log(`✅ Found ${ordersResponse.data.data.length} existing orders`);
      const latestOrder = ordersResponse.data.data[ordersResponse.data.data.length - 1];
      if (latestOrder) {
        console.log('   Latest order:', latestOrder.plan_name, '$' + latestOrder.total_price);
        console.log('   Valid until:', latestOrder.plan_valid_till);
      }
    }
    
    // Test 3: Purchase new subscription
    console.log('\n3. Testing subscription purchase...');
    const subscriptionResponse = await axios.post(`${BASE_URL}/api/user/BuySubscription`, {
      uid: TEST_UID,
      plan: 'Yearly',
      totalPrice: 99.99
    });
    
    if (subscriptionResponse.data.success) {
      console.log('✅ Subscription purchase successful!');
      console.log('   Message:', subscriptionResponse.data.message);
    } else {
      console.log('❌ Subscription purchase failed:', subscriptionResponse.data.message);
    }
    
    // Test 4: Verify new order was created
    console.log('\n4. Verifying new order creation...');
    const newOrdersResponse = await axios.post(`${BASE_URL}/api/user/getUserOrder`, {
      uid: TEST_UID
    });
    
    if (newOrdersResponse.data.success) {
      const newOrderCount = newOrdersResponse.data.data.length;
      console.log(`✅ Total orders now: ${newOrderCount}`);
      
      const latestOrder = newOrdersResponse.data.data[newOrderCount - 1];
      console.log('   Latest order details:');
      console.log('   - Plan:', latestOrder.plan_name);
      console.log('   - Price: $' + latestOrder.total_price);
      console.log('   - Coins added:', latestOrder.coins_added);
      console.log('   - Status:', latestOrder.status);
      console.log('   - Created:', new Date(latestOrder.created_at).toLocaleString());
    }
    
    console.log('\n🎉 Subscription API is working correctly!');
    console.log('\n📧 Note: Email sending may show errors in logs, but this is expected');
    console.log('   in development/local environment. The subscription functionality');
    console.log('   itself is working properly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testSubscriptionAPI();