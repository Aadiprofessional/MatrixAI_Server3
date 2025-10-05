import axios from 'axios';

async function testOptimizedTranslation() {
    console.log('🚀 Testing Optimized Audio Translation Performance');
    console.log('='.repeat(60));
    
    const testData = {
        uid: '0a147ebe-af99-481b-bcaf-ae70c9aeb8d8',
        audioid: '5902776e-91c6-45b4-9ce3-c4a064cc7dd3', // Real Chinese audio ID
        language: 'ar' // Target language: Arabic
    };
    
    console.log('📋 Test Parameters:');
    console.log(`UID: ${testData.uid}`);
    console.log(`Audio ID: ${testData.audioid}`);
    console.log(`Target Language: ${testData.language}`);
    console.log(`Expected Source Language: zh (Chinese)`);
    console.log('');
    
    // Test both local and production servers
    const servers = [
        {
            name: 'Local Server',
            url: 'http://localhost:3000/api/audio/translateAudioText'
        },
        {
            name: 'Production Server',
            url: 'https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run/api/audio/translateAudioText'
        }
    ];
    
    for (const server of servers) {
        console.log(`🧪 Testing ${server.name}...`);
        console.log(`URL: ${server.url}`);
        
        try {
            const startTime = Date.now();
            console.log(`⏱️  Start time: ${new Date(startTime).toISOString()}`);
            
            const response = await axios.post(server.url, testData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 minute timeout
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log(`✅ ${server.name} - Translation completed!`);
            console.log(`⏱️  Total Duration: ${duration}ms (${(duration/1000).toFixed(2)} seconds)`);
            console.log('');
            
            // Performance Analysis
            console.log('📊 Performance Analysis:');
            console.log(`Success: ${response.data.success}`);
            console.log(`Message: ${response.data.message}`);
            console.log(`Language: ${response.data.language}`);
            console.log(`Words Translated: ${response.data.wordsTranslated || 'N/A'}`);
            
            // Performance benchmarks
            if (duration < 5000) {
                console.log('🎯 EXCELLENT: Under 5 seconds (Target achieved!)');
            } else if (duration < 10000) {
                console.log('✅ GOOD: Under 10 seconds (Significant improvement)');
            } else if (duration < 30000) {
                console.log('⚠️  MODERATE: Under 30 seconds (Some improvement)');
            } else {
                console.log('❌ SLOW: Over 30 seconds (Needs more optimization)');
            }
            
            // Calculate improvement from original 6 minutes (360 seconds)
            const originalTime = 360000; // 6 minutes in ms
            const improvement = ((originalTime - duration) / originalTime * 100).toFixed(1);
            console.log(`📈 Performance Improvement: ${improvement}% faster than original`);
            
            console.log('');
            console.log('🔍 Response Sample:');
            if (response.data.translatedData && response.data.translatedData.words) {
                const sampleWords = response.data.translatedData.words.slice(0, 3);
                sampleWords.forEach((word, index) => {
                    console.log(`  Word ${index + 1}: "${word.original_word}" → "${word.word}"`);
                });
                console.log(`  ... and ${response.data.translatedData.words.length - 3} more words`);
            }
            
        } catch (error) {
            console.error(`❌ ${server.name} - Error:`, error.response?.data || error.message);
            
            if (error.code === 'ECONNREFUSED') {
                console.log('💡 Note: Local server might not be running. Start it with: npm start');
            }
        }
        
        console.log('-'.repeat(60));
    }
    
    console.log('');
    console.log('🎯 Optimization Summary:');
    console.log('✅ Implemented parallel processing with 5 concurrent batches');
    console.log('✅ Increased batch size from 25 to 100 words per request');
    console.log('✅ Eliminated duplicate translations through deduplication');
    console.log('✅ Removed artificial 200ms delays between batches');
    console.log('✅ Added parallel transcription translation');
    console.log('');
    console.log('Expected improvements:');
    console.log('• 95%+ reduction in API calls through deduplication');
    console.log('• 4x faster batch processing (25→100 words per batch)');
    console.log('• 5x parallel processing speedup');
    console.log('• Elimination of sequential delays');
    console.log('• Target: 6 minutes → 3-4 seconds (99%+ improvement)');
}

// Run the test
testOptimizedTranslation().catch(console.error);