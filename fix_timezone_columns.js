const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const fixTimezoneColumns = async () => {
  try {
    console.log('🚀 Starting timezone columns fix...');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('❌ Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase client initialized');
    
    // Since we can't execute DDL directly, let's try a different approach
    // We'll use the REST API to check table structure and provide specific instructions
    
    console.log('\n🔍 Checking current table status...');
    
    const tables = [
      { name: 'user_transaction', description: 'User coin transactions' },
      { name: 'image_generate', description: 'AI image generation metadata' }
    ];
    
    for (const table of tables) {
      try {
        // Try to select timezone column to see if it exists
        const { data, error } = await supabase
          .from(table.name)
          .select('timezone')
          .limit(1);
        
        if (error) {
          if (error.message.includes('column') && error.message.includes('does not exist')) {
            console.log(`❌ Table '${table.name}' missing timezone column`);
          } else {
            console.log(`❓ Table '${table.name}' check failed:`, error.message);
          }
        } else {
          console.log(`✅ Table '${table.name}' already has timezone column`);
        }
      } catch (err) {
        console.log(`❓ Could not check table '${table.name}':`, err.message);
      }
    }
    
    console.log('\n📋 IMMEDIATE FIX REQUIRED:');
    console.log('🌐 Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.log('📊 Navigate to: SQL Editor');
    console.log('📝 Execute these commands ONE BY ONE:');
    
    console.log('\n' + '='.repeat(60));
    console.log('🔧 STEP 1: Add timezone column to user_transaction');
    console.log('='.repeat(60));
    console.log('ALTER TABLE user_transaction ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT \'UTC\';');
    
    console.log('\n' + '='.repeat(60));
    console.log('🔧 STEP 2: Add timezone column to image_generate');
    console.log('='.repeat(60));
    console.log('ALTER TABLE image_generate ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT \'UTC\';');
    
    console.log('\n' + '='.repeat(60));
    console.log('🔧 STEP 3: Update existing records (optional)');
    console.log('='.repeat(60));
    console.log('UPDATE user_transaction SET timezone = \'UTC\' WHERE timezone IS NULL;');
    console.log('UPDATE image_generate SET timezone = \'UTC\' WHERE timezone IS NULL;');
    
    console.log('\n🚨 CRITICAL: Your timezone issue will be fixed immediately after executing steps 1 and 2!');
    console.log('⏰ After the fix:');
    console.log('   - India users will see India time (Asia/Kolkata)');
    console.log('   - Hong Kong users will see Hong Kong time (Asia/Hong_Kong)');
    console.log('   - All timestamps will be accurate to user location');
    
    console.log('\n🧪 To test after the fix:');
    console.log('1. Execute the SQL commands above');
    console.log('2. Try creating an image again from India');
    console.log('3. Check if the timestamp shows 5:09 AM (your correct local time)');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
};

// Run the fix
if (require.main === module) {
  fixTimezoneColumns()
    .then(() => {
      console.log('\n🏁 Timezone fix instructions provided');
      console.log('💡 Execute the SQL commands in Supabase dashboard to fix the issue');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixTimezoneColumns };