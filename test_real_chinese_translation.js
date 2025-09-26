const axios = require('axios');

async function testRealChineseTranslation() {
  try {
    console.log('🧪 Testing translation with real Chinese audio file...');
    
    // Use a real Chinese audio file from the database
    const testData = {
      uid: "0a147ebe-af99-481b-bcaf-ae70c9aeb8d8",
      audioid: "171832ae-6bc1-4022-84af-97d36efaced2", // The Cantonese audio file
      language: "ar" // Translate to Arabic
    };
    
    console.log('📋 Test Parameters:');
    console.log('UID:', testData.uid);
    console.log('Audio ID:', testData.audioid);
    console.log('Target Language:', testData.language);
    console.log('Expected Source Language: zh (Chinese)');
    
    console.log('\n🚀 Sending translation request...');
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3002/api/audio/translateAudioText', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n✅ Translation completed in ${duration}ms (${(duration/1000).toFixed(2)} seconds)`);
    console.log('\n📊 Response Analysis:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    console.log('Language:', response.data.language);
    console.log('Words Translated:', response.data.wordsTranslated);
    
    if (response.data.translatedData && response.data.translatedData.words) {
      const words = response.data.translatedData.words;
      console.log(`\n🔤 Translation Quality Analysis (${words.length} words):`);
      
      let translatedCount = 0;
      let unchangedCount = 0;
      const sampleTranslations = [];
      const unchangedWords = [];
      
      words.forEach((wordObj, index) => {
        if (wordObj.word !== wordObj.original_word) {
          translatedCount++;
          if (sampleTranslations.length < 10) {
            sampleTranslations.push({
              original: wordObj.original_word,
              translated: wordObj.word,
              punctuated: wordObj.punctuated_word
            });
          }
        } else {
          unchangedCount++;
          if (unchangedWords.length < 10) {
            unchangedWords.push(wordObj.original_word);
          }
        }
      });
      
      console.log(`Words actually translated: ${translatedCount}`);
      console.log(`Words unchanged: ${unchangedCount}`);
      console.log(`Translation rate: ${((translatedCount / words.length) * 100).toFixed(1)}%`);
      
      if (sampleTranslations.length > 0) {
        console.log('\n✅ Sample successful translations:');
        sampleTranslations.forEach((sample, index) => {
          console.log(`${index + 1}. "${sample.original}" → "${sample.translated}"`);
        });
      }
      
      if (unchangedWords.length > 0) {
        console.log('\n❓ Sample unchanged words:');
        unchangedWords.forEach((word, index) => {
          console.log(`${index + 1}. "${word}"`);
        });
      }
      
      // Check transcription translation
      if (response.data.translatedData.transcription) {
        console.log('\n📝 Transcription Translation:');
        console.log('Translated transcription (first 300 chars):');
        console.log(response.data.translatedData.transcription.substring(0, 300) + '...');
      }
    }
    
  } catch (error) {
    console.error('❌ Translation test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testRealChineseTranslation();