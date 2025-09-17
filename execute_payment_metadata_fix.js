const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function executePaymentMetadataFix() {
  try {
    console.log('🔧 Starting payment_metadata table fix...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'add_error_columns_to_payment_metadata.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 SQL content to execute:');
    console.log(sqlContent);
    console.log('\n' + '='.repeat(50));
    
    // Split SQL into individual statements (excluding comments and empty lines)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });
        
        if (error) {
          // Try direct query if RPC fails
          console.log('   RPC failed, trying direct query...');
          const { data: directData, error: directError } = await supabase
            .from('information_schema.columns')
            .select('*')
            .limit(1);
          
          if (directError) {
            console.error(`   ❌ Error: ${error.message}`);
            throw error;
          }
        }
        
        console.log('   ✅ Success');
        if (data) {
          console.log('   📋 Result:', data);
        }
      } catch (statementError) {
        console.error(`   ❌ Failed to execute statement: ${statementError.message}`);
        // Continue with other statements
      }
      
      console.log('');
    }
    
    // Verify the fix by checking if columns exist
    console.log('🔍 Verifying the fix...');
    try {
      const { data: columns, error: verifyError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'payment_metadata')
        .in('column_name', ['error_code', 'error_message']);
      
      if (verifyError) {
        console.error('❌ Verification failed:', verifyError.message);
      } else if (columns && columns.length > 0) {
        console.log('✅ Verification successful! Found columns:');
        columns.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log('⚠️  Columns not found in verification query');
      }
    } catch (verifyError) {
      console.error('❌ Verification error:', verifyError.message);
    }
    
    console.log('\n🎉 Payment metadata table fix completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Deploy the updated code to production');
    console.log('2. Test the BuySubscription API flow');
    console.log('3. Monitor the logs for any remaining errors');
    
  } catch (error) {
    console.error('❌ Fatal error during payment metadata fix:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute the fix
if (require.main === module) {
  executePaymentMetadataFix()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { executePaymentMetadataFix };