const axios = require('axios');

// Test invoice generation and email sending
const testInvoiceAPI = async () => {
  try {
    console.log('🧪 Testing Invoice API...');
    
    // Sample invoice data
    const invoiceData = {
      invoiceNumber: `INV-TEST-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customerName: 'anadi.mpvm',
      customerEmail: 'anadi.mpvm@gmail.com',
      planName: 'Yearly',
      planPeriod: '1 Year',
      coins: 1000,
      totalPrice: 99.99,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    // Generate HTML invoice (same format as in userRoutes.js)
    const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MatrixAI Subscription Invoice</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 20px; }
        .invoice-header { border-bottom: 2px solid #FCCC51; padding-bottom: 20px; margin-bottom: 20px; }
        .logo { width: 150px; height: auto; }
        .invoice-title { font-size: 24px; color: #333; margin: 10px 0; }
        .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; }
        .invoice-details-col { width: 48%; }
        .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .invoice-table th { background-color: #f8f8f8; text-align: left; padding: 10px; }
        .invoice-table td { padding: 10px; border-bottom: 1px solid #eee; }
        .total-row { font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <img src="https://ddtgdhehxhgarkonvpfq.supabase.co/storage/v1/object/public/user-uploads//matrix.png" alt="MatrixAI Logo" class="logo">
          <h1 class="invoice-title">INVOICE</h1>
        </div>
        
        <div class="invoice-details">
          <div class="invoice-details-col">
            <p><strong>Invoice To:</strong><br>
            ${invoiceData.customerName}<br>
            ${invoiceData.customerEmail}</p>
            
            <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}<br>
            <strong>Date:</strong> ${invoiceData.date}</p>
          </div>
          
          <div class="invoice-details-col" style="text-align: right;">
            <p><strong>MatrixAI Global</strong><br>
            support@matrixaiglobal.com<br>
            matrixaiglobal.com</p>
          </div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Plan</th>
              <th>Coins</th>
              <th>Valid Until</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>MatrixAI Subscription</td>
              <td>${invoiceData.planName}</td>
              <td>${invoiceData.coins}</td>
              <td>${invoiceData.validUntil}</td>
              <td>$${invoiceData.totalPrice.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">Total</td>
              <td>$${invoiceData.totalPrice.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>Thank you for your subscription to MatrixAI Global. If you have any questions, please contact support@matrixaiglobal.com</p>
        </div>
      </div>
    </body>
    </html>
    `;
    
    // Prepare email data
    const emailData = {
      from: 'noreply@matrixaiglobal.com',
      email: 'anadi.mpvm@gmail.com',
      subject: `MatrixAI Test Invoice #${invoiceData.invoiceNumber}`,
      message: invoiceHtml
    };
    
    console.log('📧 Sending test invoice email...');
    console.log('To:', emailData.email);
    console.log('Subject:', emailData.subject);
    
    // Send email using the email API
    const response = await axios.post('http://localhost:3000/api/email/send', emailData, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.data.success) {
      console.log('✅ Invoice email sent successfully!');
      console.log('Response:', response.data);
    } else {
      console.log('❌ Failed to send invoice email');
      console.log('Error:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error testing invoice API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

// Run the test
testInvoiceAPI();