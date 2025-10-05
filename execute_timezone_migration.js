const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const executeTimezoneMigration = async () => {
  try {
    console.log('🚀 Starting timezone columns migration...');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('❌ Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔧 Testing database connection...');
    
    // Test connection by checking if we can access any table
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('uid')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  Could not connect to users table:', testError.message);
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Since we can't use exec_sql, we'll need to provide manual instructions
    console.log('\n📋 MANUAL MIGRATION REQUIRED');
    console.log('🔧 Supabase does not allow direct SQL execution from the client');
    console.log('📝 Please execute the following SQL commands manually in your Supabase dashboard:');
    console.log('🌐 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    
    // Read and display the SQL file content
    const sqlPath = path.join(__dirname, 'add_timezone_columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('\n' + '='.repeat(80));
    console.log('📄 SQL COMMANDS TO EXECUTE:');
    console.log('='.repeat(80));
    console.log(sqlContent);
    console.log('='.repeat(80));
    
    // Test if tables exist and check their current schema
    console.log('\n🧪 Checking current table status...');
    
    const tablesToCheck = [
      { name: 'user_transaction', description: 'User coin transactions' },
      { name: 'image_generate', description: 'AI image generation metadata' },
      { name: 'audio_metadata', description: 'Audio transcription metadata' },
      { name: 'video_metadata', description: 'Video processing metadata' }
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`⚠️  Table '${table.name}' (${table.description}) does not exist`);
          } else {
            console.log(`❓ Table '${table.name}' status unknown:`, error.message);
          }
        } else {
          console.log(`✅ Table '${table.name}' (${table.description}) exists`);
          
          // Check if timezone column already exists
          try {
            const { data: tzData, error: tzError } = await supabase
              .from(table.name)
              .select('timezone')
              .limit(1);
            
            if (tzError) {
              if (tzError.message.includes('column') && tzError.message.includes('does not exist')) {
                console.log(`   ❌ Missing 'timezone' column - MIGRATION NEEDED`);
              } else {
                console.log(`   ❓ Could not check timezone column:`, tzError.message);
              }
            } else {
              console.log(`   ✅ 'timezone' column already exists`);
            }
          } catch (tzCheckError) {
            console.log(`   ❓ Could not check timezone column:`, tzCheckError.message);
          }
        }
      } catch (tableError) {
        console.log(`❓ Could not check table '${table.name}':`, tableError.message);
      }
    }
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. 🌐 Open your Supabase dashboard SQL editor');
    console.log('2. 📋 Copy and paste the SQL commands shown above');
    console.log('3. ▶️  Execute the SQL commands');
    console.log('4. 🧪 Test your APIs to ensure timezone functionality works');
    
    console.log('\n💡 ALTERNATIVE: You can also run individual commands like:');
    console.log('   ALTER TABLE user_transaction ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT \'UTC\';');
    console.log('   ALTER TABLE image_generate ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT \'UTC\';');
    console.log('   ALTER TABLE audio_metadata ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT \'UTC\';');
    console.log('   ALTER TABLE video_metadata ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT \'UTC\';');
    
    console.log('\n🚀 Once you\'ve executed the SQL commands, your timezone-aware APIs should work correctly!');
    
  } catch (error) {
    console.error('💥 Error during timezone migration check:', error.message);
    console.error('📋 Full error:', error);
    process.exit(1);
  }
};

// Run the migration check
if (require.main === module) {
  executeTimezoneMigration()
    .then(() => {
      console.log('🏁 Migration check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration check failed:', error);
      process.exit(1);
    });
}

module.exports = { executeTimezoneMigration };