const axios = require('axios');

// Test BuySubscription API with real user
async function testBuySubscriptionWithRealUser() {
  try {
    console.log('🧪 Testing BuySubscription with real user...');
    
    // First, get a real user from the database by signing up
    const signupResponse = await axios.post('http://localhost:3000/api/user/signup', {
      email: 'invoice-test@example.com',
      password: 'testpass123',
      confirmPassword: 'testpass123',
      name: 'Invoice Test User'
    });
    
    console.log('✅ User created/updated:', signupResponse.data.data.email);
    const userId = signupResponse.data.data.uid;
    
    // Now test BuySubscription API
    const subscriptionResponse = await axios.post('http://localhost:3000/api/user/BuySubscription', {
      uid: userId,
      plan: 'Yearly',
      totalPrice: 99.99,
      coins: 1000,
      plan_period: 365 * 24 * 60 * 60, // 1 year in seconds
      couponId: null
    });
    
    console.log('✅ Subscription purchase successful!');
    console.log('Response:', subscriptionResponse.data);
    console.log('\n📧 Check server logs to see if invoice email was sent!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testBuySubscriptionWithRealUser();