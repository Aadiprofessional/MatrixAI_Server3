const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, error: err };
  }
}

async function checkTableStructure() {
  try {
    console.log('🔍 Checking user_content table structure...');
    
    // Check if updated_at column exists
    const checkColumnSQL = `
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_content' 
      AND column_name IN ('created_at', 'updated_at')
      ORDER BY ordinal_position;
    `;
    
    const result = await executeSQL(checkColumnSQL);
    
    if (result.success && result.data) {
      console.log('📋 Current timestamp columns in user_content table:');
      result.data.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      });
      
      const hasUpdatedAt = result.data.some(col => col.column_name === 'updated_at');
      return hasUpdatedAt;
    } else {
      console.error('❌ Failed to check table structure:', result.error);
      return false;
    }
  } catch (error) {
    console.error('💥 Error checking table structure:', error);
    return false;
  }
}

async function fixUserContentTable() {
  try {
    console.log('🔧 Starting user_content table fix...');
    
    // Check if updated_at column already exists
    const hasUpdatedAt = await checkTableStructure();
    
    if (hasUpdatedAt) {
      console.log('✅ updated_at column already exists in user_content table!');
      console.log('🎉 No fix needed - your table is already correct.');
      return;
    }
    
    console.log('❌ updated_at column is missing. Applying fix...');
    
    // Read the SQL fix file
    const sqlFilePath = path.join(__dirname, 'fix_user_content_updated_at.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL fix file not found:', sqlFilePath);
      console.log('\n🔧 Manual SQL to run in Supabase SQL Editor:');
      console.log('\n' + '='.repeat(60));
      console.log('ALTER TABLE user_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
      console.log('UPDATE user_content SET updated_at = created_at WHERE updated_at IS NULL;');
      console.log('CREATE INDEX IF NOT EXISTS idx_user_content_updated_at ON user_content(updated_at);');
      console.log('='.repeat(60));
      return;
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        const result = await executeSQL(statement + ';');
        
        if (!result.success) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, result.error);
          console.error('Statement:', statement);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const hasUpdatedAtAfterFix = await checkTableStructure();
    
    if (hasUpdatedAtAfterFix) {
      console.log('\n🎉 SUCCESS! user_content table has been fixed.');
      console.log('✅ updated_at column is now available.');
      console.log('✅ Trigger created for automatic timestamp updates.');
      console.log('✅ Index created for better query performance.');
      console.log('\n📝 Next steps:');
      console.log('1. Restart your server if it\'s running');
      console.log('2. Test the content writer API again');
      console.log('3. The "column user_content.updated_at does not exist" error should be resolved');
    } else {
      console.log('\n❌ Fix verification failed. Please run the SQL manually in Supabase.');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error during fix:', error);
    console.log('\n🔧 Manual SQL to run in Supabase SQL Editor:');
    console.log('\n' + '='.repeat(60));
    console.log('ALTER TABLE user_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
    console.log('UPDATE user_content SET updated_at = created_at WHERE updated_at IS NULL;');
    console.log('CREATE INDEX IF NOT EXISTS idx_user_content_updated_at ON user_content(updated_at);');
    console.log('='.repeat(60));
  }
}

// Run the fix
console.log('🚀 Starting user_content table updated_at column fix...');
console.log('📊 Database:', SUPABASE_URL);
console.log('');

fixUserContentTable()
  .then(() => {
    console.log('\n✨ Fix process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix process failed:', error);
    process.exit(1);
  });