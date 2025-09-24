const axios = require('axios');

// Test the PDF content extraction API
async function testPDFAPI() {
  try {
    console.log('Testing PDF Content Extraction API...');
    
    // Test with a sample PDF URL (you can replace this with any valid PDF URL)
    const testPDFUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    const response = await axios.post('http://localhost:3000/api/pdf/extractContent', {
      pdfUrl: testPDFUrl
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout
    });

    console.log('✅ API Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log(`\n📄 Total Pages: ${response.data.data.totalPages}`);
      console.log(`📝 Text Length: ${response.data.data.textLength} characters`);
      console.log(`\n📋 Extracted Text (first 500 chars):`);
      console.log(response.data.data.text.substring(0, 500) + '...');
      
      if (response.data.data.metadata && Object.keys(response.data.data.metadata).length > 0) {
        console.log('\n📊 PDF Metadata:');
        console.log(JSON.stringify(response.data.data.metadata, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error testing PDF API:', error.response?.data || error.message);
  }
}

// Test the legacy convertToImages endpoint for backward compatibility
async function testLegacyAPI() {
  try {
    console.log('\nTesting Legacy PDF API (convertToImages)...');
    
    const testPDFUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    const response = await axios.post('http://localhost:3000/api/pdf/convertToImages', {
      pdfUrl: testPDFUrl
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    console.log('✅ Legacy API Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log(`\n📄 Total Pages: ${response.data.data.totalPages}`);
      console.log(`📝 Text Length: ${response.data.data.textLength} characters`);
      console.log(`\n📋 Note: ${response.data.data.note}`);
    }

  } catch (error) {
    console.error('❌ Error testing legacy PDF API:', error.response?.data || error.message);
  }
}

// Test health endpoint
async function testHealthEndpoint() {
  try {
    console.log('\nTesting PDF Health Endpoint...');
    const response = await axios.get('http://localhost:3000/api/pdf/health');
    console.log('✅ Health Check:', response.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testHealthEndpoint();
  await testPDFAPI();
  await testLegacyAPI();
}

runTests();