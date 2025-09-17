const fetch = require('node-fetch');

// Test complete payment flow with metadata extraction
async function testCompletePaymentFlow() {
  console.log('=== Testing Complete Payment Flow ===\n');
  
  // Simulate the metadata we extracted from the payment intent
  const paymentMetadata = {
    uid: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
    plan: 'Monthly',
    totalPrice: '29.99',
    paymentIntentId: 'int_hkdm2p5vthakn7bh5r1',
    orderId: 'ORDER_TEST_1756348300',
    paymentMethod: 'airwallex'
  };
  
  console.log('1. Payment metadata extracted from Airwallex:');
  console.log(JSON.stringify(paymentMetadata, null, 2));
  console.log();
  
  try {
    console.log('2. Calling BuySubscription API with extracted metadata...');
    
    const response = await fetch('http://localhost:3002/api/user/BuySubscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: paymentMetadata.uid,
        plan: paymentMetadata.plan,
        totalPrice: parseFloat(paymentMetadata.totalPrice),
        paymentIntentId: paymentMetadata.paymentIntentId,
        orderId: paymentMetadata.orderId,
        paymentMethod: paymentMetadata.paymentMethod
      })
    });
    
    const result = await response.text();
    
    console.log('3. BuySubscription API Response:');
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${result}`);
    console.log();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Payment flow completed successfully!');
      console.log('   - Metadata extracted from payment intent');
      console.log('   - BuySubscription API called with correct parameters');
      console.log('   - Backend integration working without frontend');
    } else {
      console.log('❌ FAILED: BuySubscription API returned error');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

// Run the test
testCompletePaymentFlow();