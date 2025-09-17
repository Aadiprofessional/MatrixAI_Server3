const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Test endpoint to simulate successful payment and trigger BuySubscription
app.post('/test/simulate-payment-success', async (req, res) => {
  try {
    console.log('Simulating successful payment with metadata...');
    
    // Mock subscription details (same as in our test payment intent)
    const subscriptionDetails = {
      uid: 'test-user-123',
      plan: 'addon',
      totalPrice: 138,
      paymentIntentId: 'int_hkdm2p5vthakmytxgaz',
      orderId: 'test_order_123',
      paymentMethod: 'airwallex'
    };
    
    console.log('Calling BuySubscription API with:', subscriptionDetails);
    
    // Call the BuySubscription API
    const buySubscriptionResponse = await fetch('http://localhost:3000/api/user/BuySubscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionDetails)
    });
    
    if (buySubscriptionResponse.ok) {
      const subscriptionData = await buySubscriptionResponse.json();
      console.log('✅ BuySubscription API called successfully!');
      console.log('Response:', subscriptionData);
      
      res.json({
        success: true,
        message: 'Payment simulation successful',
        subscriptionResult: subscriptionData
      });
    } else {
      const errorText = await buySubscriptionResponse.text();
      console.log('❌ BuySubscription API failed:', errorText);
      
      res.status(500).json({
        success: false,
        message: 'BuySubscription API failed',
        error: errorText
      });
    }
  } catch (error) {
    console.error('Error in payment simulation:', error);
    res.status(500).json({
      success: false,
      message: 'Payment simulation failed',
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Use POST /test/simulate-payment-success to test the payment flow');
});