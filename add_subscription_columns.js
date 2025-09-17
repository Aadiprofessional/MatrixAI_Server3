require('dotenv').config();
const { getSupabaseClient } = require('./src/config/database');

/**
 * Add the new subscription columns to the users table
 */
async function addSubscriptionColumns() {
  console.log('Adding subscription columns to users table...');
  
  const supabase = getSupabaseClient();
  
  try {
    // Add plan_purchase_date column
    console.log('1. Adding plan_purchase_date column...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_purchase_date TIMESTAMPTZ;'
    });
    
    if (error1) {
      console.log('Note: plan_purchase_date column may already exist or RPC not available');
      console.log('Error:', error1.message);
    } else {
      console.log('✅ plan_purchase_date column added successfully');
    }
    
    // Add next_coin_refresh column
    console.log('2. Adding next_coin_refresh column...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS next_coin_refresh TIMESTAMPTZ;'
    });
    
    if (error2) {
      console.log('Note: next_coin_refresh column may already exist or RPC not available');
      console.log('Error:', error2.message);
    } else {
      console.log('✅ next_coin_refresh column added successfully');
    }
    
    // Add plan_expiry_date column
    console.log('3. Adding plan_expiry_date column...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMPTZ;'
    });
    
    if (error3) {
      console.log('Note: plan_expiry_date column may already exist or RPC not available');
      console.log('Error:', error3.message);
    } else {
      console.log('✅ plan_expiry_date column added successfully');
    }
    
    // Test if columns exist by querying the table structure
    console.log('\n4. Verifying columns exist...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('uid, plan_purchase_date, next_coin_refresh, plan_expiry_date')
      .limit(1);
    
    if (testError) {
      console.log('❌ Columns verification failed:', testError.message);
      console.log('\n📝 Manual SQL commands to run in Supabase SQL Editor:');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_purchase_date TIMESTAMPTZ;');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS next_coin_refresh TIMESTAMPTZ;');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMPTZ;');
    } else {
      console.log('✅ All columns verified successfully!');
      console.log('Sample data structure:', testData[0] || 'No users found');
    }
    
  } catch (error) {
    console.error('❌ Error adding subscription columns:', error);
    console.log('\n📝 Manual SQL commands to run in Supabase SQL Editor:');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_purchase_date TIMESTAMPTZ;');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS next_coin_refresh TIMESTAMPTZ;');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMPTZ;');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  addSubscriptionColumns().then(() => {
    console.log('\n✅ Column addition process completed');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Column addition process failed:', error);
    process.exit(1);
  });
}

module.exports = { addSubscriptionColumns };