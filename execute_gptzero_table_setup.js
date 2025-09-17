const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const setupGPTZeroDetectionTable = async () => {
  try {
    console.log('🚀 Setting up GPTZero detection table...');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create_gptzero_detection_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('⚠️  WARNING: This will DROP the existing user_detection table and recreate it!');
    console.log('📊 Executing SQL commands...');
    
    // Split SQL commands by semicolon and execute each one
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Found ${commands.length} SQL commands to execute`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command) {
        console.log(`⏳ Executing command ${i + 1}/${commands.length}...`);
        
        try {
          // For complex commands, we'll use the raw SQL execution
          const { error } = await supabase.rpc('exec_sql', { sql_query: command });
          
          if (error) {
            console.error(`❌ Error executing command ${i + 1}:`, error);
            
            // Try alternative execution method for some commands
            if (command.toLowerCase().includes('create table')) {
              console.log('🔄 Trying alternative table creation method...');
              // Log the command for manual execution
              console.log('📋 Please execute this command manually in Supabase dashboard:');
              console.log(command);
            }
          } else {
            console.log(`✅ Command ${i + 1} executed successfully`);
          }
        } catch (execError) {
          console.error(`❌ Execution error for command ${i + 1}:`, execError.message);
          console.log('📋 Command that failed:');
          console.log(command);
        }
      }
    }
    
    // Test if table exists and has correct structure
    console.log('🧪 Testing new table structure...');
    
    try {
      const { data, error: testError } = await supabase
        .from('user_detection')
        .select('detection_id, uid, predicted_class, confidence_score, scan_id')
        .limit(1);
      
      if (testError) {
        console.error('❌ Table test failed:', testError);
        console.log('\n📋 Manual setup required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to the SQL editor');
        console.log('3. Execute the SQL commands from create_gptzero_detection_table.sql');
        console.log('\n📄 SQL file location:', sqlPath);
      } else {
        console.log('✅ GPTZero detection table setup completed successfully!');
        console.log('🎯 Table structure verified and ready for GPTZero API integration');
        
        // Show table info
        const { data: tableInfo, error: infoError } = await supabase
          .rpc('get_table_info', { table_name: 'user_detection' })
          .catch(() => ({ data: null, error: 'Could not fetch table info' }));
        
        if (!infoError && tableInfo) {
          console.log('📊 Table information:', tableInfo);
        }
      }
    } catch (testError) {
      console.error('❌ Error testing table:', testError.message);
    }
    
  } catch (error) {
    console.error('💥 Error setting up GPTZero detection table:', error);
    console.log('\n🔧 Manual setup instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL editor');
    console.log('3. Copy and execute the entire content of create_gptzero_detection_table.sql');
    console.log('4. Verify the table was created successfully');
  }
};

// Show usage information
const showUsage = () => {
  console.log('\n📖 Usage Information:');
  console.log('This script will:');
  console.log('• DROP the existing user_detection table (⚠️  DATA LOSS WARNING!)');
  console.log('• CREATE a new user_detection table optimized for GPTZero API');
  console.log('• Add proper indexes for performance');
  console.log('• Set up triggers for automatic timestamp updates');
  console.log('\n🔐 Required Environment Variables:');
  console.log('• SUPABASE_URL');
  console.log('• SUPABASE_SERVICE_ROLE_KEY');
  console.log('\n⚠️  IMPORTANT: Backup your data before running this script!');
};

// Main execution
if (require.main === module) {
  showUsage();
  console.log('\n🚀 Starting setup in 3 seconds...');
  setTimeout(() => {
    setupGPTZeroDetectionTable();
  }, 3000);
}

module.exports = { setupGPTZeroDetectionTable };