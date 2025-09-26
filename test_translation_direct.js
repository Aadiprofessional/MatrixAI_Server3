require('dotenv').config();
const axios = require('axios');

// Test the translation functions directly
const azureEndpoint = 'https://api.cognitive.microsofttranslator.com';
const azureKey = process.env.AZURE_KEY;
const region = 'eastus';

const translateText = async (text, targetLanguage, sourceLanguage = 'en') => {
  console.log(`[TRANSLATE TEXT] Translating "${text}" from ${sourceLanguage} to ${targetLanguage}`);
  
  try {
    const response = await axios.post(
      `${azureEndpoint}/translate?api-version=3.0&from=${sourceLanguage}&to=${targetLanguage}`,
      [{ text }],
      {
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const translatedText = response.data[0].translations[0].text;
    console.log(`[TRANSLATE TEXT] Result: "${translatedText}"`);
    return translatedText;
  } catch (error) {
    console.error('[TRANSLATE TEXT] Error:', error.response?.data || error.message);
    throw error;
  }
};

const translateBatch = async (texts, targetLanguage, sourceLanguage = 'en') => {
  console.log(`[BATCH TRANSLATION] Starting batch translation of ${texts.length} items from ${sourceLanguage} to ${targetLanguage}`);
  console.log(`[BATCH TRANSLATION] Items: ${texts.join(', ')}`);
  
  try {
    const requestBody = texts.map(text => ({ text }));
    
    const response = await axios.post(
      `${azureEndpoint}/translate?api-version=3.0&from=${sourceLanguage}&to=${targetLanguage}`,
      requestBody,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const translatedTexts = response.data.map(item => item.translations[0]?.text || '');
    console.log(`[BATCH TRANSLATION] Results: ${translatedTexts.join(', ')}`);
    return translatedTexts;
  } catch (error) {
    console.error('[BATCH TRANSLATION] Error:', error.response?.data || error.message);
    throw error;
  }
};

async function testTranslation() {
  console.log('=== Testing Direct Translation Functions ===\n');
  
  // Test sample words from the user's data
  const sampleWords = ["you're", "glowing", "you", "color", "and", "fracture", "the", "light"];
  const samplePunctuatedWords = ["You're", "glowing,", "you", "color", "and", "fracture", "the", "light"];
  
  try {
    console.log('1. Testing single text translation:');
    const singleResult = await translateText("Hello world", "ar");
    console.log(`✅ Single translation successful: "Hello world" → "${singleResult}"\n`);
    
    console.log('2. Testing batch translation of regular words:');
    const batchResult = await translateBatch(sampleWords, "ar");
    console.log(`✅ Batch translation successful:`);
    sampleWords.forEach((word, index) => {
      console.log(`   "${word}" → "${batchResult[index]}"`);
    });
    console.log('');
    
    console.log('3. Testing batch translation of punctuated words:');
    const punctuatedResult = await translateBatch(samplePunctuatedWords, "ar");
    console.log(`✅ Punctuated batch translation successful:`);
    samplePunctuatedWords.forEach((word, index) => {
      console.log(`   "${word}" → "${punctuatedResult[index]}"`);
    });
    console.log('');
    
    console.log('4. Testing full sentence translation:');
    const fullSentence = "You're glowing, you color and fracture the light. You can't help but shine, and I know that you carry the world on your back.";
    const fullResult = await translateText(fullSentence, "ar");
    console.log(`✅ Full sentence translation successful:`);
    console.log(`   "${fullSentence}"`);
    console.log(`   → "${fullResult}"\n`);
    
    console.log('🎉 All translation tests passed! Azure translation is working correctly.');
    
  } catch (error) {
    console.error('❌ Translation test failed:', error.message);
  }
}

testTranslation();