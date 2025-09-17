const axios = require('axios');

// Test local server health endpoint
const testLocalHealth = async () => {
  console.log('Testing local server health endpoint...');
  
  try {
    const response = await axios.get('http://localhost:3000/api/payment/health');
    console.log('✅ Local health check successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Local health check failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
};

// Test create payment intent with your credentials
const testCreatePaymentIntent = async () => {
  console.log('\nTesting create payment intent...');
  
  const paymentData = {
    amount: 100,
    currency: 'USD',
    merchant_order_id: 'test-order-' + Date.now()
  };
  
  try {
    const response = await axios.post('http://localhost:3000/api/payment/airwallex/create-intent', paymentData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Payment intent creation successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Payment intent creation failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
};

// Test get payment methods
const testGetPaymentMethods = async () => {
  console.log('\nTesting get payment methods...');
  
  try {
    const response = await axios.get('http://localhost:3000/api/payment/airwallex/payment-methods');
    console.log('✅ Get payment methods successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Get payment methods failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
};

// Run tests
const runTests = async () => {
  await testLocalHealth();
  const paymentIntent = await testCreatePaymentIntent();
  await testGetPaymentMethods();
  
  // If payment intent was created successfully, test status check
  if (paymentIntent && paymentIntent.data && paymentIntent.data.id) {
    console.log('\nTesting payment status check...');
    try {
      const statusResponse = await axios.get(`http://localhost:3000/api/payment/airwallex/status/${paymentIntent.data.id}`);
      console.log('✅ Payment status check successful!');
      console.log('Status:', statusResponse.status);
      console.log('Response:', JSON.stringify(statusResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Payment status check failed:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
  }
};

runTests();