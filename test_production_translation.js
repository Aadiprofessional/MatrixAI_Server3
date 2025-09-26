import axios from 'axios';

async function testProductionTranslation() {
    console.log('🧪 Testing production translation API...');
    
    const testData = {
        uid: '0a147ebe-af99-481b-bcaf-ae70c9aeb8d8',
        audioid: '171832ae-6bc1-4022-84af-97d36efaced2', // Real Chinese audio ID
        language: 'ar' // Target language: Arabic
    };
    
    console.log('📋 Test Parameters:');
    console.log(`UID: ${testData.uid}`);
    console.log(`Audio ID: ${testData.audioid}`);
    console.log(`Target Language: ${testData.language}`);
    console.log('Expected Source Language: zh (Chinese)');
    
    try {
        console.log('🚀 Sending translation request to production server...');
        const startTime = Date.now();
        
        const response = await axios.post('https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run/api/audio/translateAudioText', testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2 minute timeout
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ Translation completed in ${duration}ms (${(duration/1000).toFixed(2)} seconds)`);
        console.log('');
        console.log('📊 Response Analysis:');
        console.log(`Success: ${response.data.success}`);
        console.log(`Message: ${response.data.message}`);
        console.log(`Language: ${response.data.language}`);
        console.log(`Words Translated: ${response.data.wordsTranslated || 'N/A'}`);
        
        if (response.data.success) {
            console.log('');
            console.log('🎉 Production translation is now working correctly!');
        } else {
            console.log('');
            console.log('❌ Translation failed on production server');
        }
        
    } catch (error) {
        console.error('❌ Production translation test failed!');
        console.error('Error status:', error.response?.status);
        console.error('Error message:', error.response?.data);
        
        if (error.code === 'ECONNABORTED') {
            console.error('⏰ Request timed out - translation may be taking too long');
        }
    }
}

testProductionTranslation();