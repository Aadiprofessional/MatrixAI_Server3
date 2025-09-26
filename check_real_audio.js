require('dotenv').config();
const { getSupabaseClient } = require("./src/config/database.js");

async function checkRealAudio() {
  try {
    const supabase = getSupabaseClient();
    
    console.log('🔍 Checking what audio files exist in the database...');
    
    const { data: audioFiles, error } = await supabase
      .from('audio_metadata')
      .select('audioid, uid, language, audio_name, transcription')
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching audio files:', error);
      return;
    }
    
    if (!audioFiles || audioFiles.length === 0) {
      console.log('❌ No audio files found in the database');
      return;
    }
    
    console.log(`\n📊 Found ${audioFiles.length} audio files:`);
    audioFiles.forEach((audio, index) => {
      console.log(`\n${index + 1}. Audio ID: ${audio.audioid}`);
      console.log(`   UID: ${audio.uid}`);
      console.log(`   Language: ${audio.language}`);
      console.log(`   Name: ${audio.audio_name}`);
      console.log(`   Transcription preview: ${audio.transcription?.substring(0, 100)}...`);
    });
    
    // Use the first audio file for detailed analysis
    if (audioFiles.length > 0) {
      const firstAudio = audioFiles[0];
      console.log(`\n🔍 Detailed analysis of first audio file (${firstAudio.audioid}):`);
      
      const { data: detailedAudio, error: detailError } = await supabase
        .from('audio_metadata')
        .select('*')
        .eq('audioid', firstAudio.audioid)
        .single();
      
      if (detailError) {
        console.error('❌ Error fetching detailed audio data:', detailError);
        return;
      }
      
      console.log('Language field:', detailedAudio.language);
      console.log('Full transcription:', detailedAudio.transcription);
      
      // Check first few words to see what language they actually are
      if (detailedAudio.words_data && Array.isArray(detailedAudio.words_data)) {
        console.log('\n🔤 First 10 words analysis:');
        detailedAudio.words_data.slice(0, 10).forEach((word, index) => {
          console.log(`${index + 1}. "${word.word}" (punctuated: "${word.punctuated_word || word.word}")`);
        });
        
        // Analyze language patterns
        const allWords = detailedAudio.words_data.map(w => w.word).join(' ');
        const chineseCharPattern = /[\u4e00-\u9fff]/;
        const englishPattern = /[a-zA-Z]/;
        
        const hasChineseChars = chineseCharPattern.test(allWords);
        const hasEnglishChars = englishPattern.test(allWords);
        
        console.log('\n🌐 Language Detection:');
        console.log('Contains Chinese characters:', hasChineseChars);
        console.log('Contains English characters:', hasEnglishChars);
        console.log('Stored language in DB:', detailedAudio.language);
        
        if (hasChineseChars && detailedAudio.language === 'en') {
          console.log('⚠️  ISSUE FOUND: Content has Chinese characters but language is set to English!');
          console.log('📝 This explains why translation is not working properly.');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRealAudio();