// Test script for 4-word segment subtitle generation
const { generateVideoWithSubtitles } = require('./src/services/videoSubtitleService');

// Sample word data for testing
const sampleWordData = [
  { start: 0.0, end: 0.5, word: "Hello", punctuated_word: "Hello" },
  { start: 0.5, end: 1.0, word: "world", punctuated_word: "world" },
  { start: 1.0, end: 1.5, word: "this", punctuated_word: "this" },
  { start: 1.5, end: 2.0, word: "is", punctuated_word: "is" },
  { start: 2.0, end: 2.5, word: "a", punctuated_word: "a" },
  { start: 2.5, end: 3.0, word: "test", punctuated_word: "test" },
  { start: 3.0, end: 3.5, word: "of", punctuated_word: "of" },
  { start: 3.5, end: 4.0, word: "subtitle", punctuated_word: "subtitle" },
  { start: 4.0, end: 4.5, word: "generation", punctuated_word: "generation" },
  { start: 4.5, end: 5.0, word: "with", punctuated_word: "with" },
  { start: 5.0, end: 5.5, word: "four", punctuated_word: "four" },
  { start: 5.5, end: 6.0, word: "word", punctuated_word: "word" },
  { start: 6.0, end: 6.5, word: "segments", punctuated_word: "segments" }
];

async function testSubtitleGeneration() {
  console.log('Testing 4-word segment subtitle generation...');
  
  try {
    // Test with a sample video URL (you can replace this with an actual video URL)
    const testVideoUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
    const testUid = 'test-user-123';
    const testTaskId = 'test-task-456';
    
    console.log('Sample word data:');
    console.log(JSON.stringify(sampleWordData, null, 2));
    
    console.log('\nExpected behavior:');
    console.log('- Words will be grouped into 4-word segments');
    console.log('- Each segment will show all 4 words with one highlighted at a time');
    console.log('- Highlighting will move from word to word within each segment');
    console.log('- Segment 1: "Hello world this is" (each word highlighted in sequence)');
    console.log('- Segment 2: "a test of subtitle" (each word highlighted in sequence)');
    console.log('- Segment 3: "generation with four word" (each word highlighted in sequence)');
    console.log('- Segment 4: "segments" (single word highlighted)');
    
    // Note: Uncomment the following lines to actually test with a real video
    /*
    const result = await generateVideoWithSubtitles({
      videoUrl: testVideoUrl,
      wordData: sampleWordData,
      uid: testUid,
      taskId: testTaskId
    });
    
    if (result.success) {
      console.log('\n✅ Subtitle generation test completed successfully!');
      console.log('Generated video URL:', result.videoUrl);
      console.log('Processing time:', result.processingTime);
    } else {
      console.log('\n❌ Subtitle generation test failed:', result.message);
    }
    */
    
    console.log('\n📝 Test setup completed. Uncomment the test execution code to run with actual video.');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

// Run the test
testSubtitleGeneration();