const axios = require('axios');

// MEGA TRANSLATION PERFORMANCE TEST SUITE
// Tests the ultra-optimized translation API with massive datasets

const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on different port
const TEST_ENDPOINT = `${BASE_URL}/translateAudioText`;

// Generate test data of various sizes
const generateTestData = (wordCount) => {
  const words = [
    'hello', 'world', 'this', 'is', 'a', 'test', 'of', 'the', 'translation', 'system',
    'performance', 'optimization', 'parallel', 'processing', 'batch', 'translation',
    'azure', 'api', 'efficiency', 'speed', 'throughput', 'concurrency', 'cache',
    'deduplication', 'intelligent', 'mega', 'ultra', 'fast', 'optimized', 'enhanced'
  ];
  
  const testWords = [];
  for (let i = 0; i < wordCount; i++) {
    testWords.push(words[i % words.length]);
  }
  
  return testWords;
};

// Performance test function
const runPerformanceTest = async (testName, wordCount, targetLanguage = 'es') => {
  console.log(`\n🚀 STARTING ${testName.toUpperCase()}`);
  console.log(`📊 Testing ${wordCount.toLocaleString()} words translation to ${targetLanguage}`);
  console.log('=' * 60);
  
  const testData = generateTestData(wordCount);
  const startTime = Date.now();
  
  try {
    const response = await axios.post(TEST_ENDPOINT, {
      uid: 'test-user-mega-performance',
      words: testData,
      targetLanguage: targetLanguage,
      sourceLanguage: 'en'
    }, {
      timeout: 300000, // 5 minute timeout for large tests
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const wordsPerSecond = Math.round(wordCount / (duration / 1000));
    
    console.log(`✅ ${testName} COMPLETED SUCCESSFULLY!`);
    console.log(`⏱️  Total Time: ${duration}ms (${(duration/1000).toFixed(2)} seconds)`);
    console.log(`🚄 Performance: ${wordsPerSecond.toLocaleString()} words/second`);
    console.log(`📈 Throughput: ${(wordCount / (duration / 1000 / 60)).toFixed(0)} words/minute`);
    
    if (response.data.success) {
      console.log(`💰 Coins deducted: ${response.data.coinsDeducted || 'N/A'}`);
      console.log(`📝 Translated words: ${response.data.translatedWords?.length || 'N/A'}`);
    }
    
    return {
      success: true,
      duration,
      wordsPerSecond,
      wordCount
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`❌ ${testName} FAILED!`);
    console.log(`⏱️  Failed after: ${duration}ms (${(duration/1000).toFixed(2)} seconds)`);
    console.log(`🚨 Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📄 Response status: ${error.response.status}`);
      console.log(`📄 Response data:`, error.response.data);
    }
    
    return {
      success: false,
      duration,
      error: error.message,
      wordCount
    };
  }
};

// Main test suite
const runMegaPerformanceTests = async () => {
  console.log('🎯 MEGA TRANSLATION PERFORMANCE TEST SUITE');
  console.log('🔥 Testing ultra-optimized parallel translation system');
  console.log('⚡ Validating performance improvements for massive datasets');
  console.log('\n' + '=' * 80);
  
  const testCases = [
    { name: 'Small Batch Test', words: 100 },
    { name: 'Medium Batch Test', words: 1000 },
    { name: 'Large Batch Test', words: 5000 },
    { name: 'Mega Batch Test', words: 10000 },
    { name: 'Ultra Mega Test', words: 25000 },
    { name: 'Extreme Scale Test', words: 50000 },
    { name: 'Maximum Capacity Test', words: 100000 }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await runPerformanceTest(testCase.name, testCase.words);
    results.push(result);
    
    // Wait between tests to avoid overwhelming the system
    if (testCase.words >= 10000) {
      console.log('⏳ Waiting 5 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Performance summary
  console.log('\n' + '=' * 80);
  console.log('📊 MEGA PERFORMANCE TEST SUMMARY');
  console.log('=' * 80);
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failedTests.length}/${results.length}`);
  
  if (successfulTests.length > 0) {
    const avgPerformance = successfulTests.reduce((sum, r) => sum + r.wordsPerSecond, 0) / successfulTests.length;
    const maxPerformance = Math.max(...successfulTests.map(r => r.wordsPerSecond));
    const totalWordsProcessed = successfulTests.reduce((sum, r) => sum + r.wordCount, 0);
    
    console.log(`\n🚄 PERFORMANCE METRICS:`);
    console.log(`   Average: ${Math.round(avgPerformance).toLocaleString()} words/second`);
    console.log(`   Peak: ${maxPerformance.toLocaleString()} words/second`);
    console.log(`   Total words processed: ${totalWordsProcessed.toLocaleString()}`);
    
    // Performance benchmarks
    console.log(`\n🎯 PERFORMANCE BENCHMARKS:`);
    if (avgPerformance >= 5000) {
      console.log(`   🏆 EXCELLENT: ${Math.round(avgPerformance).toLocaleString()} words/sec (Target: 5000+)`);
    } else if (avgPerformance >= 2000) {
      console.log(`   🥈 GOOD: ${Math.round(avgPerformance).toLocaleString()} words/sec (Target: 2000+)`);
    } else if (avgPerformance >= 1000) {
      console.log(`   🥉 ACCEPTABLE: ${Math.round(avgPerformance).toLocaleString()} words/sec (Target: 1000+)`);
    } else {
      console.log(`   ⚠️  NEEDS IMPROVEMENT: ${Math.round(avgPerformance).toLocaleString()} words/sec (Target: 1000+)`);
    }
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    failedTests.forEach(test => {
      console.log(`   - ${test.wordCount.toLocaleString()} words: ${test.error}`);
    });
  }
  
  console.log('\n🎉 MEGA PERFORMANCE TEST SUITE COMPLETED!');
  console.log('=' * 80);
};

// Deduplication test
const runDeduplicationTest = async () => {
  console.log('\n🔄 DEDUPLICATION EFFICIENCY TEST');
  console.log('=' * 50);
  
  // Create test data with many duplicates
  const baseWords = ['hello', 'world', 'test', 'translation', 'performance'];
  const duplicatedWords = [];
  
  // Create 1000 words with high duplication (each word repeated 200 times)
  for (let i = 0; i < 200; i++) {
    duplicatedWords.push(...baseWords);
  }
  
  console.log(`📊 Testing ${duplicatedWords.length} words with high duplication`);
  console.log(`🔍 Unique words: ${baseWords.length}`);
  console.log(`📈 Duplication ratio: ${((duplicatedWords.length - baseWords.length) / duplicatedWords.length * 100).toFixed(1)}%`);
  
  await runPerformanceTest('Deduplication Efficiency Test', duplicatedWords.length);
};

// Cache efficiency test
const runCacheEfficiencyTest = async () => {
  console.log('\n💾 CACHE EFFICIENCY TEST');
  console.log('=' * 50);
  
  const testWords = generateTestData(1000);
  
  console.log('🔄 First run (cold cache):');
  await runPerformanceTest('Cache Test - Cold', 1000);
  
  console.log('\n🔥 Second run (warm cache):');
  await runPerformanceTest('Cache Test - Warm', 1000);
  
  console.log('\n🚀 Third run (hot cache):');
  await runPerformanceTest('Cache Test - Hot', 1000);
};

// Run all tests
const main = async () => {
  try {
    await runMegaPerformanceTests();
    await runDeduplicationTest();
    await runCacheEfficiencyTest();
  } catch (error) {
    console.error('🚨 Test suite failed:', error);
  }
};

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  runMegaPerformanceTests,
  runDeduplicationTest,
  runCacheEfficiencyTest,
  runPerformanceTest
};