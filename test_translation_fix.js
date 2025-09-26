require('dotenv').config();
const axios = require('axios');

// Test the translation functionality
async function testTranslation() {
  const testData = {
    uid: '0a147ebe-af99-481b-bcaf-ae70c9aeb8d8',
    audioid: '435b2313-f958-48ac-81c0-b87d73c55369',
    language: 'ar' // Arabic translation
  };

  try {
    console.log('Testing translation with data:', testData);
    
    // Test with local server
    const response = await axios.post('http://localhost:3002/api/audio/translateAudioText', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Translation response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ Translation successful');
      console.log('Translated words count:', response.data.wordsTranslated);
      
      // Check if the words are actually translated (not just copied)
      if (response.data.translatedData && response.data.translatedData.words) {
        const sampleWords = response.data.translatedData.words.slice(0, 5);
        console.log('Sample translated words:');
        sampleWords.forEach((word, index) => {
          console.log(`${index + 1}. Original: "${word.original_word}" → Translated: "${word.word}"`);
        });
        
        // Check if translation actually happened
        const actuallyTranslated = sampleWords.some(word => word.word !== word.original_word);
        if (actuallyTranslated) {
          console.log('✅ Words were actually translated');
        } else {
          console.log('❌ Words were NOT translated - they are the same as original');
        }
      }
    } else {
      console.log('❌ Translation failed:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Error testing translation:', error.response?.data || error.message);
  }
}

// Also test Azure translation directly
async function testAzureTranslationDirect() {
  console.log('\n--- Testing Azure Translation API directly ---');
  
  const testText = "Hello world";
  const targetLanguage = "ar";
  
  try {
    // Check environment variables
    const translatorKey = process.env.AZURE_TRANSLATOR_KEY || process.env.AZURE_KEY || process.env.TRANSLATOR_KEY;
    const translatorEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || process.env.AZURE_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
    const translatorRegion = process.env.AZURE_TRANSLATOR_LOCATION || process.env.AZURE_REGION || 'eastus';
    
    console.log('Azure config:');
    console.log('- Key:', translatorKey ? `${translatorKey.substring(0, 4)}...${translatorKey.substring(translatorKey.length - 4)}` : 'undefined');
    console.log('- Endpoint:', translatorEndpoint);
    console.log('- Region:', translatorRegion);
    
    if (!translatorKey) {
      console.log('❌ Azure Translator API key is missing');
      return;
    }
    
    const response = await axios.post(
      `${translatorEndpoint}/translate?api-version=3.0&from=en&to=${targetLanguage}`,
      [{ text: testText }],
      {
        headers: {
          'Ocp-Apim-Subscription-Key': translatorKey,
          'Ocp-Apim-Subscription-Region': translatorRegion,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Direct Azure translation response:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data[0] && response.data[0].translations) {
      const translatedText = response.data[0].translations[0].text;
      console.log(`✅ Direct translation successful: "${testText}" → "${translatedText}"`);
    } else {
      console.log('❌ Unexpected response format from Azure');
    }
    
  } catch (error) {
    console.error('❌ Direct Azure translation error:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Starting translation tests...\n');
  
  // Test Azure directly first
  await testAzureTranslationDirect();
  
  // Then test the API endpoint
  await testTranslation();
}

runTests();