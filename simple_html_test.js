const axios = require('axios');

console.log('🧪 Testing HTML to DOCX API...');

const testHtml = `<h1>Test Document</h1><p>This is a simple test.</p>`;

axios.post('http://localhost:3000/api/document/htmlToDocx', {
  htmlContent: testHtml
}, {
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('✅ Success! Status:', response.status);
  console.log('📋 Response:', JSON.stringify(response.data, null, 2));
})
.catch(error => {
  console.log('❌ Error:', error.response?.status || 'Network Error');
  console.log('📋 Error Details:', error.response?.data || error.message);
});