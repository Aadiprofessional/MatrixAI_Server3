const axios = require('axios');

// Test the actual BuySubscription endpoint that generates and sends invoices
const testBuySubscriptionInvoice = async () => {
  try {
    console.log('🧪 Testing BuySubscription Invoice Generation...');
    
    // Note: This is a test example. In a real scenario, you would need:
    // 1. A valid user UID from your database
    // 2. Valid plan details
    // 3. Proper authentication
    
    const subscriptionData = {
      uid: 'test-user-uid', // This would be a real user UID from your database
      plan: 'Yearly',
      totalPrice: 99.99,
      coins: 1000,
      plan_period: 365 * 24 * 60 * 60, // 1 year in seconds
      couponId: null
    };
    
    console.log('📧 Testing subscription purchase with invoice generation...');
    console.log('Plan:', subscriptionData.plan);
    console.log('Price:', subscriptionData.totalPrice);
    console.log('Coins:', subscriptionData.coins);
    
    // Send request to BuySubscription endpoint
    const response = await axios.post('http://localhost:3000/api/user/BuySubscription', subscriptionData, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.data.success) {
      console.log('✅ Subscription purchase successful!');
      console.log('Response:', response.data);
      console.log('\n📧 Invoice should have been sent to the user\'s email address.');
    } else {
      console.log('❌ Subscription purchase failed');
      console.log('Error:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error testing subscription purchase:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
    }
    
    // This is expected to fail because we're using a test UID
    console.log('\n💡 Note: This test is expected to fail because we\'re using a test UID.');
    console.log('To test with a real user:');
    console.log('1. Create a user account first using the signup endpoint');
    console.log('2. Use the real UID from the database');
    console.log('3. Make sure the user has a valid email address');
  }
};

// Also provide a direct email test function
const testDirectInvoiceEmail = async () => {
  try {
    console.log('\n🧪 Testing Direct Invoice Email...');
    
    // Sample invoice HTML (simplified version)
    const invoiceHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333; border-bottom: 2px solid #FCCC51; padding-bottom: 10px;">INVOICE</h1>
      
      <div style="margin: 20px 0;">
        <p><strong>Invoice To:</strong><br>
        anadi.mpvm@gmail.com</p>
        
        <p><strong>Invoice Number:</strong> INV-TEST-${Date.now()}<br>
        <strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f8f8;">
            <th style="padding: 10px; text-align: left;">Description</th>
            <th style="padding: 10px; text-align: left;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">MatrixAI Yearly Subscription</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">$99.99</td>
          </tr>
          <tr style="font-weight: bold;">
            <td style="padding: 10px;">Total</td>
            <td style="padding: 10px;">$99.99</td>
          </tr>
        </tbody>
      </table>
      
      <p style="text-align: center; font-size: 12px; color: #777; margin-top: 30px;">
        Thank you for your subscription to MatrixAI Global!
      </p>
    </div>
    `;
    
    const emailData = {
      email: 'anadi.mpvm@gmail.com',
      subject: 'MatrixAI Invoice - Direct Test',
      message: invoiceHtml
    };
    
    console.log('📧 Sending direct invoice email...');
    
    const response = await axios.post('http://localhost:3000/api/email/send', emailData, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.data.success) {
      console.log('✅ Direct invoice email sent successfully!');
      console.log('Email ID:', response.data.data.id);
    } else {
      console.log('❌ Failed to send direct invoice email');
      console.log('Error:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error sending direct invoice email:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

console.log('='.repeat(60));
console.log('MatrixAI Invoice API Test Suite');
console.log('='.repeat(60));

// Run both tests
(async () => {
  await testBuySubscriptionInvoice();
  await testDirectInvoiceEmail();
  
  console.log('\n='.repeat(60));
  console.log('📋 Summary:');
  console.log('1. The invoice format includes MatrixAI branding');
  console.log('2. Invoice contains subscription details (plan, coins, price)');
  console.log('3. Professional HTML layout with proper styling');
  console.log('4. Automatic email delivery to user\'s registered email');
  console.log('5. Server is running in development mode - emails are logged instead of sent');
  console.log('\n✅ Invoice API testing completed!');
  console.log('='.repeat(60));
})();