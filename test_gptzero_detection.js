const axios = require('axios');

const testDetectionAPI = async () => {
  try {
    console.log('🧪 Testing GPTZero Detection API with New Table Structure...');
    
    const testData = {
      uid: '123e4567-e89b-12d3-a456-426614174000', // Replace with a valid test UID
      text: 'Located in East Africa, Uganda is a landlocked nation known for its stunning natural beauty, diverse wildlife, and rich cultural heritage.',
      title: 'Test GPTZero Detection - New Schema',
      tags: ['test', 'gptzero', 'new-schema'],
      language: 'en'
    };
    
    console.log('📤 Sending request to create detection...');
    const createResponse = await axios.post('http://localhost:3000/api/detection/createDetection', testData);
    
    console.log('✅ Create Detection Response Status:', createResponse.status);
    console.log('📊 Detection Created:', JSON.stringify(createResponse.data, null, 2));
    
    const detectionId = createResponse.data.detection?.id;
    
    if (detectionId) {
      console.log('\n🔍 Testing getDetection endpoint...');
      const getResponse = await axios.get(`http://localhost:3000/api/detection/getDetection?uid=${testData.uid}&detectionId=${detectionId}`);
      
      console.log('✅ Get Detection Response Status:', getResponse.status);
      console.log('📊 Retrieved Detection:', JSON.stringify(getResponse.data, null, 2));
      
      console.log('\n📋 Testing getUserDetections endpoint...');
      const listResponse = await axios.get(`http://localhost:3000/api/detection/getUserDetections?uid=${testData.uid}&page=1&itemsPerPage=5`);
      
      console.log('✅ Get User Detections Response Status:', listResponse.status);
      console.log('📊 User Detections List:', JSON.stringify(listResponse.data, null, 2));
      
      // Verify new fields are present
      const detection = getResponse.data.detection;
      console.log('\n🔍 Verifying New GPTZero Fields:');
      console.log('- scan_id:', detection.scan_id);
      console.log('- version:', detection.version);
      console.log('- neat_version:', detection.neat_version);
      console.log('- predicted_class:', detection.predicted_class);
      console.log('- confidence_score:', detection.confidence_score);
      console.log('- confidence_category:', detection.confidence_category);
      console.log('- completely_generated_prob:', detection.completely_generated_prob);
      console.log('- average_generated_prob:', detection.average_generated_prob);
      console.log('- overall_burstiness:', detection.overall_burstiness);
      console.log('- result_message:', detection.result_message);
      console.log('- document_classification:', detection.document_classification);
      console.log('- class_probabilities:', detection.class_probabilities);
      console.log('- sentences count:', detection.sentences?.length || 0);
      console.log('- paragraphs count:', detection.paragraphs?.length || 0);
      console.log('- has full_response:', !!detection.full_response);
      
      console.log('\n✅ All tests completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.log('\n💡 This might be due to the new table structure not being created yet.');
      console.log('   Run the database setup script first: node execute_gptzero_table_setup.js');
    }
  }
};

console.log('🚀 Starting GPTZero Detection API Test...');
console.log('⚠️  Make sure the server is running and the new table structure is created!');
console.log('   If you get errors, run: node execute_gptzero_table_setup.js\n');

testDetectionAPI();