// Test script for video subtitle generation API
const axios = require('axios');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Adjust based on your server setup
const TEST_VIDEO_URL = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'; // Sample video URL

// Sample word data for testing
const SAMPLE_WORD_DATA = [
  {
    "end": 2.96,
    "word": "歡迎嚟到老小孩與你活學活用電腦。",
    "start": 2.46,
    "confidence": 0.673748,
    "punctuated_word": "歡迎嚟到老小孩與你活學活用電腦。"
  },
  {
    "end": 7.6,
    "word": "呢個頻道主要係想同大家分享一下電腦嘅資訊。",
    "start": 7.1,
    "confidence": 0.9920508,
    "punctuated_word": "呢個頻道主要係想同大家分享一下電腦嘅資訊。"
  },
  {
    "end": 12.146667,
    "word": "如果各位喜歡呢個頻道嘅話",
    "start": 11.98,
    "confidence": 0.9610382,
    "punctuated_word": "如果各位喜歡呢個頻道嘅話,"
  },
  {
    "end": 12.3133335,
    "word": "請免費訂閱",
    "start": 12.146667,
    "confidence": 0.9610382,
    "punctuated_word": "請免費訂閱,"
  }
];

async function testVideoSubtitleAPI() {
  console.log('🎬 Testing Video Subtitle Generation API...');
  console.log('=' .repeat(50));
  
  try {
    // Test data
    const testData = {
      video_url: TEST_VIDEO_URL,
      word_data: SAMPLE_WORD_DATA,
      uid: 'test_user_123'
    };
    
    console.log('📤 Sending request to generate video with subtitles...');
    console.log('Video URL:', testData.video_url);
    console.log('Word data entries:', testData.word_data.length);
    console.log('User ID:', testData.uid);
    console.log('');
    
    const startTime = Date.now();
    
    // Make API request
    const response = await axios.post(
      `${BASE_URL}/api/video/generateSubtitles`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 600000 // 10 minutes timeout
      }
    );
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('✅ API Response received!');
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('Total request time:', `${totalTime}ms`);
    
    if (response.data.success) {
      console.log('');
      console.log('🎉 Video subtitle generation completed successfully!');
      console.log('Task ID:', response.data.data.task_id);
      console.log('Generated video URL:', response.data.data.video_url);
      console.log('Processing time:', response.data.data.processing_time);
      
      // Test if the generated video is accessible
      console.log('');
      console.log('🔍 Testing video accessibility...');
      try {
        const videoResponse = await axios.head(`${BASE_URL}${response.data.data.video_url}`);
        console.log('✅ Generated video is accessible!');
        console.log('Video content type:', videoResponse.headers['content-type']);
        console.log('Video size:', videoResponse.headers['content-length'], 'bytes');
      } catch (videoError) {
        console.log('❌ Generated video is not accessible:', videoError.message);
      }
    } else {
      console.log('❌ Video subtitle generation failed:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Request setup error:', error.message);
    }
  }
}

// Test validation scenarios
async function testValidationScenarios() {
  console.log('');
  console.log('🧪 Testing validation scenarios...');
  console.log('=' .repeat(50));
  
  const testCases = [
    {
      name: 'Missing video_url',
      data: { word_data: SAMPLE_WORD_DATA, uid: 'test_user' },
      expectedStatus: 400
    },
    {
      name: 'Missing word_data',
      data: { video_url: TEST_VIDEO_URL, uid: 'test_user' },
      expectedStatus: 400
    },
    {
      name: 'Missing uid',
      data: { video_url: TEST_VIDEO_URL, word_data: SAMPLE_WORD_DATA },
      expectedStatus: 400
    },
    {
      name: 'Empty word_data array',
      data: { video_url: TEST_VIDEO_URL, word_data: [], uid: 'test_user' },
      expectedStatus: 400
    },
    {
      name: 'Invalid word_data format',
      data: { 
        video_url: TEST_VIDEO_URL, 
        word_data: [{ invalid: 'data' }], 
        uid: 'test_user' 
      },
      expectedStatus: 400
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      
      const response = await axios.post(
        `${BASE_URL}/api/video/generateSubtitles`,
        testCase.data,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      
      console.log(`❌ Expected status ${testCase.expectedStatus}, got ${response.status}`);
      
    } catch (error) {
      if (error.response && error.response.status === testCase.expectedStatus) {
        console.log(`✅ Correctly returned status ${error.response.status}`);
        console.log(`   Message: ${error.response.data.message}`);
      } else {
        console.log(`❌ Unexpected error:`, error.message);
      }
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Video Subtitle API Tests');
  console.log('Time:', new Date().toISOString());
  console.log('');
  
  // Test main functionality
  await testVideoSubtitleAPI();
  
  // Test validation scenarios
  await testValidationScenarios();
  
  console.log('');
  console.log('🏁 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testVideoSubtitleAPI,
  testValidationScenarios,
  runTests
};