const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const setupDocumentTable = async () => {
  try {
    console.log('Setting up document extractions table...');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create_document_extractions_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL commands...');
    
    // Split SQL commands by semicolon and execute each one
    const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command) {
        console.log(`Executing command ${i + 1}/${commands.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: command });
        
        if (error) {
          console.error(`Error executing command ${i + 1}:`, error);
          // Try direct query execution as fallback
          const { error: directError } = await supabase
            .from('document_extractions')
            .select('*')
            .limit(0);
          
          if (directError && directError.code === '42P01') {
            // Table doesn't exist, create it manually
            console.log('Creating table manually...');
            // This is a simplified version - in production, use proper migration tools
            console.log('Please run the SQL commands manually in your Supabase dashboard.');
            console.log('SQL file location:', sqlPath);
          }
        } else {
          console.log(`Command ${i + 1} executed successfully`);
        }
      }
    }
    
    // Test if table exists by trying to query it
    console.log('Testing table creation...');
    const { data, error: testError } = await supabase
      .from('document_extractions')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('Table test failed:', testError);
      console.log('\nPlease manually execute the following SQL in your Supabase dashboard:');
      console.log('\n' + sqlContent);
    } else {
      console.log('✅ Document extractions table setup completed successfully!');
      console.log('Table is ready to use.');
    }
    
  } catch (error) {
    console.error('Error setting up document table:', error);
    console.log('\nManual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL editor');
    console.log('3. Execute the SQL commands from create_document_extractions_table.sql');
  }
};

// Run the setup
setupDocumentTable();

module.exports = { setupDocumentTable };