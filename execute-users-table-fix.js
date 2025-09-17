const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

async function executeSQL(sqlStatement) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        sql_query: sqlStatement
      })
    });

    const result = await response.text();
    return { success: response.ok, result, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function addCreatedAtColumn() {
  try {
    console.log('🔧 Adding created_at column to users table...');
    
    // First, let's try to add the created_at column
    const addColumnSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `;
    
    console.log('⚡ Executing: ALTER TABLE users ADD COLUMN created_at...');
    const result = await executeSQL(addColumnSQL);
    
    if (result.success) {
      console.log('✅ Successfully added created_at column');
    } else {
      console.log('❌ Failed to add column via RPC, trying direct approach...');
      
      // Try using the Supabase client directly
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Check current table structure
      console.log('🔍 Checking current users table structure...');
      const { data: users, error: selectError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (selectError) {
        console.error('❌ Error accessing users table:', selectError);
        return;
      }
      
      if (users && users.length > 0) {
        const columns = Object.keys(users[0]);
        console.log('📋 Current columns:', columns);
        
        if (columns.includes('created_at')) {
          console.log('✅ created_at column already exists!');
        } else {
          console.log('❌ created_at column is missing');
          console.log('\n🔧 Manual SQL to run in Supabase SQL Editor:');
          console.log('\n' + '='.repeat(50));
          console.log('ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
          console.log('\nUPDATE users SET created_at = NOW() WHERE created_at IS NULL;');
          console.log('='.repeat(50));
          console.log('\n📝 Instructions:');
          console.log('1. Go to your Supabase dashboard');
          console.log('2. Navigate to SQL Editor');
          console.log('3. Run the SQL commands above');
          console.log('4. Then test the signup API again');
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the function
addCreatedAtColumn();