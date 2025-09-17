const axios = require('axios');

// Test BuySubscription API with anadi.mpvm@gmail.com
async function testInvoiceToAnadi() {
  try {
    console.log('🧪 Testing BuySubscription invoice to anadi.mpvm@gmail.com...');
    
    // First, create/update user with anadi's email
    const signupResponse = await axios.post('http://localhost:3000/api/user/signup', {
      email: 'anadi.mpvm@gmail.com',
      password: 'testpass123',
      confirmPassword: 'testpass123',
      name: 'Anadi Test User'
    });
    
    console.log('✅ User created/updated:', signupResponse.data.data.email);
    const userId = signupResponse.data.data.uid;
    
    // Now test BuySubscription API which should send invoice to anadi.mpvm@gmail.com
    const subscriptionResponse = await axios.post('http://localhost:3000/api/user/BuySubscription', {
      uid: userId,
      plan: 'Monthly',
      totalPrice: 49.99,
      coins: 500,
      plan_period: 30 * 24 * 60 * 60, // 30 days in seconds
      couponId: null
    });
    
    console.log('✅ Subscription purchase successful!');
    console.log('Response:', subscriptionResponse.data);
    console.log('\n📧 Invoice email should have been sent to anadi.mpvm@gmail.com!');
    console.log('\n🔍 Check your email inbox for the MatrixAI invoice.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testInvoiceToAnadi();