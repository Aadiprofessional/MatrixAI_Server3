require('dotenv').config();
const { getSupabaseClient } = require("./src/config/database.js");

async function findChineseAudio() {
  try {
    const supabase = getSupabaseClient();
    
    console.log('🔍 Searching for audio files with Chinese content...');
    
    // Get all audio files
    const { data: audioFiles, error } = await supabase
      .from('audio_metadata')
      .select('audioid, uid, language, audio_name, transcription, words_data')
      .limit(20);
    
    if (error) {
      console.error('❌ Error fetching audio files:', error);
      return;
    }
    
    if (!audioFiles || audioFiles.length === 0) {
      console.log('❌ No audio files found in the database');
      return;
    }
    
    console.log(`\n📊 Analyzing ${audioFiles.length} audio files for language content...`);
    
    const chineseCharPattern = /[\u4e00-\u9fff]/;
    const chineseAudioFiles = [];
    
    audioFiles.forEach((audio, index) => {
      const transcription = audio.transcription || '';
      const hasChineseChars = chineseCharPattern.test(transcription);
      
      if (hasChineseChars) {
        chineseAudioFiles.push(audio);
        console.log(`\n✅ Found Chinese content in audio ${index + 1}:`);
        console.log(`   Audio ID: ${audio.audioid}`);
        console.log(`   UID: ${audio.uid}`);
        console.log(`   Stored Language: ${audio.language}`);
        console.log(`   Name: ${audio.audio_name}`);
        console.log(`   Transcription preview: ${transcription.substring(0, 200)}...`);
        
        if (audio.language === 'en' || audio.language === 'en-US') {
          console.log(`   ⚠️  LANGUAGE MISMATCH: Chinese content but language set to ${audio.language}!`);
        }
      }
    });
    
    if (chineseAudioFiles.length === 0) {
      console.log('\n❌ No audio files with Chinese content found.');
      console.log('📝 This suggests the translation issue might be different than expected.');
      console.log('💡 Let\'s check if there are any mixed-language files or other issues...');
      
      // Check for any non-English language settings
      const nonEnglishFiles = audioFiles.filter(audio => 
        audio.language && 
        !audio.language.startsWith('en')
      );
      
      if (nonEnglishFiles.length > 0) {
        console.log(`\n🌐 Found ${nonEnglishFiles.length} files with non-English language settings:`);
        nonEnglishFiles.forEach((audio, index) => {
          console.log(`${index + 1}. Language: ${audio.language}, Audio ID: ${audio.audioid}`);
          console.log(`   Transcription: ${audio.transcription?.substring(0, 100)}...`);
        });
      }
    } else {
      console.log(`\n🎯 Found ${chineseAudioFiles.length} audio files with Chinese content.`);
      console.log('📝 We can use these to test the translation fix.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findChineseAudio();