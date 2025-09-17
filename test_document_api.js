const axios = require('axios');

const testDocumentExtraction = async () => {
  try {
    console.log('Testing Document Text Extraction API...');
    
    const testUrl = 'https://ddtgdhehxhgarkonvpfq.supabase.co/storage/v1/object/public/user-uploads/users/Electric%20Welding%20Permit%20-%20present.docx';
    
    const response = await axios.post('http://localhost:3000/api/document/extractText', {
      documentUrl: testUrl
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.data) {
      console.log('Document URL:', response.data.data.documentUrl);
      console.log('File Type:', response.data.data.fileType);
      console.log('Character Count:', response.data.data.characterCount);
      console.log('\n--- Extracted Text ---');
      console.log(response.data.data.extractedText);
      console.log('--- End of Extracted Text ---\n');
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
};

// Run the test
testDocumentExtraction();