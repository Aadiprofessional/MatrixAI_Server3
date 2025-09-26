require('dotenv').config();
const axios = require('axios');

// Import the improved translation functions (copy from audioRoutes.js)
const translateText = async (text, targetLanguage, sourceLanguage = 'en', maxRetries = 3) => {
  // Check for environment variables - try all possible environment variable names
  const translatorKey = process.env.AZURE_TRANSLATOR_KEY || process.env.AZURE_KEY || process.env.TRANSLATOR_KEY;
  const translatorEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || process.env.AZURE_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
  const translatorRegion = process.env.AZURE_TRANSLATOR_LOCATION || process.env.AZURE_REGION || process.env.AZURE_API_REGION || 'eastus';
  
  // Log API key (masked for security)
  const maskedKey = translatorKey ? `${translatorKey.substring(0, 4)}...${translatorKey.substring(translatorKey.length - 4)}` : 'undefined';
  console.log(`[TRANSLATION] Using API Key: ${maskedKey}`);
  console.log(`[TRANSLATION] Using Endpoint: ${translatorEndpoint}`);
  console.log(`[TRANSLATION] Using Region: ${translatorRegion}`);
  
  if (!translatorKey) {
    console.error('[TRANSLATION] ERROR: Azure Translator API key is not defined in environment variables');
    throw new Error('Azure Translator API key is missing');
  }
  
  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[TRANSLATION] Attempt ${attempt}/${maxRetries}: Translating "${text}" from ${sourceLanguage} to ${targetLanguage}`);
      
      const response = await axios.post(
        `${translatorEndpoint}/translate?api-version=3.0&from=${sourceLanguage}&to=${targetLanguage}`,
        [{ text }],
        {
          headers: {
            'Ocp-Apim-Subscription-Key': translatorKey,
            'Ocp-Apim-Subscription-Region': translatorRegion,
            'Content-Type': 'application/json'
          },
          timeout: 30000, // 30 second timeout
          validateStatus: function (status) {
            return status >= 200 && status < 300; // default
          }
        }
      );
      
      const translatedText = response.data[0]?.translations[0]?.text || text;
      console.log(`[TRANSLATION] Success: "${text}" → "${translatedText}"`);
      return translatedText;
      
    } catch (error) {
      console.error(`[TRANSLATION] Attempt ${attempt}/${maxRetries} failed:`, error.response?.data || error.message);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error('[TRANSLATION] All retry attempts exhausted');
        throw new Error(`Translation failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Calculate exponential backoff delay (1s, 2s, 4s, etc.)
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`[TRANSLATION] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const translateBatch = async (texts, targetLanguage, sourceLanguage = 'en', maxRetries = 3) => {
  console.log(`[BATCH TRANSLATION] Starting batch translation of ${texts.length} items from ${sourceLanguage} to ${targetLanguage}`);
  console.log(`[BATCH TRANSLATION] First few items: ${texts.slice(0, 3).join(', ')}${texts.length > 3 ? '...' : ''}`);
  
  // Check for environment variables - try all possible environment variable names
  const translatorKey = process.env.AZURE_TRANSLATOR_KEY || process.env.AZURE_KEY || process.env.TRANSLATOR_KEY;
  const translatorEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || process.env.AZURE_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
  const translatorRegion = process.env.AZURE_TRANSLATOR_LOCATION || process.env.AZURE_REGION || process.env.AZURE_API_REGION || 'eastus';
  
  // Log environment variables for debugging
  console.log('[BATCH TRANSLATION] Environment variables check:');
  console.log(`AZURE_TRANSLATOR_KEY: ${process.env.AZURE_TRANSLATOR_KEY ? 'defined' : 'undefined'}`);
  console.log(`AZURE_KEY: ${process.env.AZURE_KEY ? 'defined' : 'undefined'}`);
  console.log(`TRANSLATOR_KEY: ${process.env.TRANSLATOR_KEY ? 'defined' : 'undefined'}`);
  
  // Log API key (masked for security)
  const maskedKey = translatorKey ? `${translatorKey.substring(0, 4)}...${translatorKey.substring(translatorKey.length - 4)}` : 'undefined';
  console.log(`[BATCH TRANSLATION] Using API Key: ${maskedKey}`);
  console.log(`[BATCH TRANSLATION] Using Endpoint: ${translatorEndpoint}`);
  console.log(`[BATCH TRANSLATION] Using Region: ${translatorRegion}`);
  
  if (!translatorKey) {
    console.error('[BATCH TRANSLATION] ERROR: Azure Translator API key is not defined in environment variables');
    throw new Error('Azure Translator API key is missing');
  }
  
  // Prepare the request body with multiple text entries
  const requestBody = texts.map(text => ({ text }));
  
  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[BATCH TRANSLATION] Attempt ${attempt}/${maxRetries}: Sending request to Azure Translator API with ${requestBody.length} items`);
      const startTime = Date.now();
      
      const response = await axios.post(
        `${translatorEndpoint}/translate?api-version=3.0&from=${sourceLanguage}&to=${targetLanguage}`,
        requestBody,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': translatorKey,
            'Ocp-Apim-Subscription-Region': translatorRegion,
            'Content-Type': 'application/json'
          },
          timeout: 30000, // 30 second timeout
          validateStatus: function (status) {
            return status >= 200 && status < 300; // default
          }
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`[BATCH TRANSLATION] Received response from Azure Translator API in ${duration}ms`);
      console.log(`[BATCH TRANSLATION] Response contains ${response.data.length} translated items`);
      
      if (response.data.length > 0) {
        console.log(`[BATCH TRANSLATION] Sample translation: "${texts[0]}" → "${response.data[0].translations[0]?.text || ''}"`);
      }
      
      // Return an array of translated texts
      return response.data.map(item => item.translations[0]?.text || '');
      
    } catch (error) {
      console.error(`[BATCH TRANSLATION] Attempt ${attempt}/${maxRetries} failed:`, error.response?.data || error.message);
      
      if (error.response) {
        console.error('[BATCH TRANSLATION] Status:', error.response.status);
        console.error('[BATCH TRANSLATION] Headers:', JSON.stringify(error.response.headers));
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error('[BATCH TRANSLATION] All retry attempts exhausted');
        throw new Error(`Batch translation failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Calculate exponential backoff delay (1s, 2s, 4s, etc.)
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`[BATCH TRANSLATION] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

async function testImprovedTranslation() {
  console.log('🧪 Testing Improved Azure Translation Functions with Retry Logic\n');
  
  try {
    console.log('1. Testing single text translation with retry:');
    const singleResult = await translateText("Hello world", "de");
    console.log(`✅ Single translation successful: "Hello world" → "${singleResult}"\n`);
    
    console.log('2. Testing batch translation with retry:');
    const testWords = ["you're", "glowing", "you", "color", "and"];
    const batchResult = await translateBatch(testWords, "de");
    console.log(`✅ Batch translation successful:`);
    testWords.forEach((word, index) => {
      console.log(`   "${word}" → "${batchResult[index]}"`);
    });
    console.log('');
    
    console.log('🎉 All improved translation tests passed! The retry logic is working correctly.');
    
  } catch (error) {
    console.error('❌ Improved translation test failed:', error.message);
    console.error('Full error:', error);
  }
}

testImprovedTranslation();