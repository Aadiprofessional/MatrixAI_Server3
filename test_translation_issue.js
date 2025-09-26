require('dotenv').config();
const axios = require('axios');

async function testTranslationIssue() {
  console.log('=== Testing Translation Issue ===\n');
  
  const uid = '0a147ebe-af99-481b-bcaf-ae70c9aeb8d8';
  const audioid = '435b2313-f958-48ac-81c0-b87d73c55369';
  const language = 'ar'; // Arabic
  
  try {
    console.log('Testing translation with working coin deduction:');
    console.log(`UID: ${uid}`);
    console.log(`Audio ID: ${audioid}`);
    console.log(`Target Language: ${language} (Arabic)`);
    console.log('');
    
    const response = await axios.post('http://localhost:3002/api/audio/translateAudioText', {
      uid: uid,
      audioid: audioid,
      language: language
    }, {
      timeout: 60000, // 60 second timeout for translation
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Translation API Response:');
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${response.data.success}`);
    console.log(`Message: ${response.data.message}`);
    console.log('');
    
    if (response.data.translatedData) {
      const translatedData = response.data.translatedData;
      
      console.log('📊 Translation Results Analysis:');
      console.log(`Total words translated: ${translatedData.words?.length || 0}`);
      console.log(`Translated transcription length: ${translatedData.transcription?.length || 0} characters`);
      console.log('');
      
      // Check first 10 words to see the translation quality
      console.log('🔍 First 10 translated words:');
      if (translatedData.words && translatedData.words.length > 0) {
        translatedData.words.slice(0, 10).forEach((word, index) => {
          console.log(`${index + 1}. Original: "${word.original_word}" → Translated: "${word.word}"`);
          console.log(`   Original Punctuated: "${word.original_punctuated_word}" → Translated Punctuated: "${word.punctuated_word}"`);
          console.log('');
        });
      }
      
      // Check if translations are actually different from originals
      console.log('🧐 Translation Quality Check:');
      if (translatedData.words && translatedData.words.length > 0) {
        let actuallyTranslated = 0;
        let notTranslated = 0;
        
        translatedData.words.forEach(word => {
          if (word.word !== word.original_word) {
            actuallyTranslated++;
          } else {
            notTranslated++;
          }
        });
        
        console.log(`Words actually translated: ${actuallyTranslated}`);
        console.log(`Words not translated (same as original): ${notTranslated}`);
        console.log(`Translation rate: ${((actuallyTranslated / translatedData.words.length) * 100).toFixed(1)}%`);
        console.log('');
        
        // Show examples of words that weren't translated
        if (notTranslated > 0) {
          console.log('❌ Examples of words that were NOT translated:');
          let count = 0;
          translatedData.words.forEach(word => {
            if (word.word === word.original_word && count < 5) {
              console.log(`   "${word.original_word}" → "${word.word}" (unchanged)`);
              count++;
            }
          });
          console.log('');
        }
        
        // Show examples of words that were translated
        if (actuallyTranslated > 0) {
          console.log('✅ Examples of words that WERE translated:');
          let count = 0;
          translatedData.words.forEach(word => {
            if (word.word !== word.original_word && count < 5) {
              console.log(`   "${word.original_word}" → "${word.word}"`);
              count++;
            }
          });
          console.log('');
        }
      }
      
      // Check the full transcription translation
      console.log('📝 Full Transcription Translation:');
      console.log('Original transcription (first 200 chars):');
      console.log(`"${translatedData.original_transcription?.substring(0, 200) || 'N/A'}..."`);
      console.log('');
      console.log('Translated transcription (first 200 chars):');
      console.log(`"${translatedData.transcription?.substring(0, 200) || 'N/A'}..."`);
      console.log('');
      
      // Check if transcription was actually translated
      if (translatedData.transcription && translatedData.original_transcription) {
        const transcriptionTranslated = translatedData.transcription !== translatedData.original_transcription;
        console.log(`Transcription actually translated: ${transcriptionTranslated ? 'YES' : 'NO'}`);
      }
      
    } else {
      console.log('❌ No translation data returned');
    }
    
  } catch (error) {
    console.log('❌ Translation test failed:');
    
    if (error.response) {
      console.log(`HTTP Status: ${error.response.status}`);
      console.log(`Response Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
}

testTranslationIssue();