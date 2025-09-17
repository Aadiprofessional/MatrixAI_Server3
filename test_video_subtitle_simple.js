// Simple test for video subtitle generation API with a more reliable video source
const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';

// Use a more reliable video URL or a shorter one
const TEST_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

// Simple word data for testing
const SIMPLE_WORD_DATA = [
  {
    "end": 3.0,
    "word": "Hello World",
    "start": 1.0,
    "confidence": 0.9,
    "punctuated_word": "Hello World!"
  },
  {
    "end": 6.0,
    "word": "This is a test",
    "start": 4.0,
    "confidence": 0.95,
    "punctuated_word": "This is a test."
  },
  {
    "end": 9.0,
    "word": "Video subtitle generation",
    "start": 7.0,
    "confidence": 0.88,
    "punctuated_word": "Video subtitle generation."
  }
];

async function testSimpleVideoSubtitle() {
  console.log('🎬 Testing Simple Video Subtitle Generation...');
  console.log('=' .repeat(50));
  
  try {
    const testData = {
      video_url: TEST_VIDEO_URL,
      word_data: SIMPLE_WORD_DATA,
      uid: 'test_user_simple'
    };
    
    console.log('📤 Sending request...');
    console.log('Video URL:', testData.video_url);
    console.log('Word data entries:', testData.word_data.length);
    
    const startTime = Date.now();
    
    const response = await axios.post(
      `${BASE_URL}/api/video/generateSubtitles`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000 // 5 minutes
      }
    );
    
    const endTime = Date.now();
    console.log('⏱️  Total time:', `${endTime - startTime}ms`);
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n🎉 Video generated successfully!');
      console.log('Video URL:', response.data.data.video_url);
      console.log('Task ID:', response.data.data.task_id);
    }
    
  } catch (error) {
    console.error('❌ Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

// Test with a very short video URL that should work
async function testWithShortVideo() {
  console.log('\n🎬 Testing with shorter video...');
  console.log('=' .repeat(50));
  
  // Use a very small test video
  const shortVideoUrl = 'https://file-examples.com/storage/fe68c1f7d8e8c93b8c8b456/2017/10/file_example_MP4_480_1_5MG.mp4';
  
  try {
    const testData = {
      video_url: shortVideoUrl,
      word_data: SIMPLE_WORD_DATA,
      uid: 'test_user_short'
    };
    
    console.log('📤 Testing with shorter video...');
    console.log('Video URL:', testData.video_url);
    
    const response = await axios.post(
      `${BASE_URL}/api/video/generateSubtitles`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 180000 // 3 minutes
      }
    );
    
    console.log('✅ Short video test successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Short video test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

// Test API endpoint availability
async function testAPIAvailability() {
  console.log('🔍 Testing API availability...');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');
    console.log('Health check:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Server is not accessible:', error.message);
    return false;
  }
}

async function runSimpleTests() {
  console.log('🚀 Starting Simple Video Subtitle Tests');
  console.log('Time:', new Date().toISOString());
  console.log('');
  
  // Check if server is running
  const serverAvailable = await testAPIAvailability();
  if (!serverAvailable) {
    console.log('❌ Cannot proceed - server is not available');
    return;
  }
  
  console.log('');
  
  // Test with different video sources
  await testWithShortVideo();
  
  console.log('');
  console.log('🏁 Simple tests completed!');
}

if (require.main === module) {
  runSimpleTests().catch(console.error);
}

module.exports = { testSimpleVideoSubtitle, testWithShortVideo, runSimpleTests };