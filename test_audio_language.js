require('dotenv').config();
const { getSupabaseClient } = require("./src/config/database.js");

async function testAudioLanguage() {
  try {
    const supabase = getSupabaseClient();
    
    // Test with the same audio ID used in the translation test
    const audioId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    
    console.log(`🔍 Checking language data for audio ID: ${audioId}`);
    
    const { data: audioData, error } = await supabase
      .from('audio_metadata')
      .select('*')
      .eq('audioid', audioId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching audio data:', error);
      return;
    }
    
    if (!audioData) {
      console.log('❌ No audio data found for this ID');
      return;
    }
    
    console.log('\n📊 Audio Data Analysis:');
    console.log('Language field:', audioData.language);
    console.log('Transcription preview:', audioData.transcription?.substring(0, 200) + '...');
    
    // Check first few words to see what language they actually are
    if (audioData.words_data && Array.isArray(audioData.words_data)) {
      console.log('\n🔤 First 10 words analysis:');
      audioData.words_data.slice(0, 10).forEach((word, index) => {
        console.log(`${index + 1}. "${word.word}" (punctuated: "${word.punctuated_word || word.word}")`);
      });
      
      // Analyze language patterns
      const allWords = audioData.words_data.map(w => w.word).join(' ');
      const chineseCharPattern = /[\u4e00-\u9fff]/;
      const englishPattern = /[a-zA-Z]/;
      
      const hasChineseChars = chineseCharPattern.test(allWords);
      const hasEnglishChars = englishPattern.test(allWords);
      
      console.log('\n🌐 Language Detection:');
      console.log('Contains Chinese characters:', hasChineseChars);
      console.log('Contains English characters:', hasEnglishChars);
      console.log('Stored language in DB:', audioData.language);
      
      if (hasChineseChars && audioData.language === 'en') {
        console.log('⚠️  ISSUE FOUND: Content has Chinese characters but language is set to English!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAudioLanguage();