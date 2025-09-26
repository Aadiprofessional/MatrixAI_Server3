import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testAzureTranslator() {
    console.log('🧪 Testing Azure Translator API...');
    
    // Check environment variables
    const azureKey = process.env.AZURE_KEY;
    const azureRegion = process.env.AZURE_REGION || 'eastus';
    
    console.log('📋 Configuration:');
    console.log(`Azure Key: ${azureKey ? azureKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`Azure Region: ${azureRegion}`);
    
    if (!azureKey || azureKey === 'your_azure_text_translation_key') {
        console.error('❌ Azure API key is not properly configured!');
        return;
    }
    
    try {
        const testText = ['Hello', 'World', 'Test'];
        const endpoint = 'https://api.cognitive.microsofttranslator.com/translate';
        
        const requestBody = testText.map(text => ({ text }));
        
        console.log('🚀 Sending test request to Azure Translator...');
        console.log(`Endpoint: ${endpoint}`);
        console.log(`Request body:`, requestBody);
        
        const response = await axios.post(endpoint, requestBody, {
            params: {
                'api-version': '3.0',
                'from': 'en',
                'to': 'es'
            },
            headers: {
                'Ocp-Apim-Subscription-Key': azureKey,
                'Ocp-Apim-Subscription-Region': azureRegion,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Azure Translator API test successful!');
        console.log('Response status:', response.status);
        console.log('Translated results:');
        response.data.forEach((result, index) => {
            console.log(`  "${testText[index]}" → "${result.translations[0].text}"`);
        });
        
    } catch (error) {
        console.error('❌ Azure Translator API test failed!');
        console.error('Error status:', error.response?.status);
        console.error('Error message:', error.response?.data);
        console.error('Error headers:', error.response?.headers);
        
        if (error.response?.status === 401) {
            console.error('🔑 Authentication failed - check your API key and region');
        }
    }
}

testAzureTranslator();