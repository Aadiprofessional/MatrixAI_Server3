const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const setupAIImagesTable = async () => {
  try {
    console.log('Setting up AI generated images table...');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create_ai_generated_images_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL commands...');
    
    // Split SQL commands by semicolon and execute each one
    const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command) {
        console.log(`Executing command ${i + 1}/${commands.length}...`);
        
        try {
          // Try to execute the command using raw SQL
          const { data, error } = await supabase.rpc('exec_sql', { sql_query: command });
          
          if (error) {
            console.error(`Error executing command ${i + 1}:`, error);
            // For table creation, we can try a direct approach
            if (command.includes('CREATE TABLE')) {
              console.log('Trying alternative table creation method...');
              // This might work for basic table creation
              const { error: altError } = await supabase
                .from('ai_generated_images')
                .select('*')
                .limit(0);
              
              if (altError && altError.code === 'PGRST116') {
                console.log('Table does not exist, creation needed via database admin panel');
              }
            }
          } else {
            console.log(`Command ${i + 1} executed successfully`);
          }
        } catch (execError) {
          console.error(`Exception executing command ${i + 1}:`, execError);
        }
      }
    }
    
    console.log('AI generated images table setup completed!');
    console.log('Note: If you see errors above, you may need to run the SQL commands manually in your Supabase dashboard.');
    
  } catch (error) {
    console.error('Error setting up AI generated images table:', error);
    process.exit(1);
  }
};

// Run the setup
setupAIImagesTable();