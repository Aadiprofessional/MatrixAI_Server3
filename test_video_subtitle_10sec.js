// Test script for video subtitle generation API with 10-second word data
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// Test word data for approximately 10 seconds
const testWordData = [
  {
    "end": 1.2,
    "word": "Welcome",
    "start": 0.5,
    "confidence": 0.95,
    "punctuated_word": "Welcome"
  },
  {
    "end": 1.8,
    "word": "to",
    "start": 1.3,
    "confidence": 0.98,
    "punctuated_word": "to"
  },
  {
    "end": 2.5,
    "word": "our",
    "start": 1.9,
    "confidence": 0.92,
    "punctuated_word": "our"
  },
  {
    "end": 3.2,
    "word": "amazing",
    "start": 2.6,
    "confidence": 0.89,
    "punctuated_word": "amazing"
  },
  {
    "end": 4.0,
    "word": "video",
    "start": 3.3,
    "confidence": 0.94,
    "punctuated_word": "video"
  },
  {
    "end": 5.1,
    "word": "subtitle",
    "start": 4.1,
    "confidence": 0.91,
    "punctuated_word": "subtitle"
  },
  {
    "end": 6.0,
    "word": "generation",
    "start": 5.2,
    "confidence": 0.88,
    "punctuated_word": "generation"
  },
  {
    "end": 6.8,
    "word": "system",
    "start": 6.1,
    "confidence": 0.93,
    "punctuated_word": "system."
  },
  {
    "end": 7.5,
    "word": "This",
    "start": 6.9,
    "confidence": 0.96,
    "punctuated_word": "This"
  },
  {
    "end": 8.2,
    "word": "is",
    "start": 7.6,
    "confidence": 0.99,
    "punctuated_word": "is"
  },
  {
    "end": 8.8,
    "word": "a",
    "start": 8.3,
    "confidence": 0.97,
    "punctuated_word": "a"
  },
  {
    "end": 9.5,
    "word": "test",
    "start": 8.9,
    "confidence": 0.94,
    "punctuated_word": "test"
  },
  {
    "end": 10.0,
    "word": "video",
    "start": 9.6,
    "confidence": 0.92,
    "punctuated_word": "video."
  }
];

async function testVideoSubtitleAPI() {
  try {
    console.log('Testing Video Subtitle Generation API...');
    console.log('===========================================');
    
    const testData = {
      video_url: 'https://ddtgdhehxhgarkonvpfq.supabase.co/storage/v1/object/public/user-uploads/mainvideo.mp4',
      word_data: testWordData,
      uid: '0a147ebe-af99-481b-bcaf-ae70c9aeb8d8'
    };
    
    console.log('Sending request with:');
    console.log('- Video URL:', testData.video_url);
    console.log('- Word count:', testData.word_data.length);
    console.log('- Duration:', testData.word_data[testData.word_data.length - 1].end, 'seconds');
    console.log('- UID:', testData.uid);
    console.log('');
    
    const startTime = Date.now();
    
    const response = await axios.post(`${API_BASE_URL}/api/video/generateSubtitles`, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Processing time:', Math.round(processingTime / 1000), 'seconds');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.videoUrl) {
      console.log('');
      console.log('🎥 Generated video URL:');
      console.log(response.data.videoUrl);
      console.log('');
      console.log('You can access the video directly at the above URL!');
    }
    
  } catch (error) {
    console.error('❌ FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else if (error.request) {
      console.error('Network error - no response received');
      console.error('Make sure the server is running on port 3000');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testVideoSubtitleAPI();