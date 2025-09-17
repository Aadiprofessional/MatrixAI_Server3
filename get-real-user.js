const { getSupabaseClient } = require('./src/config/database.js');

async function getRealUser() {
  try {
    console.log('Fetching a real user from the database...');
    
    const supabase = getSupabaseClient();
    
    // Get a real user from the database
    const { data: users, error } = await supabase
      .from('users')
      .select('uid, email, name')
      .limit(1);
    
    if (error) {
      console.error('Error fetching users:', error);
      return null;
    }
    
    if (users && users.length > 0) {
      console.log('Found user:', users[0]);
      return users[0].uid;
    } else {
      console.log('No users found in database');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

getRealUser().then(uid => {
  if (uid) {
    console.log('\nReal user UID to use for testing:', uid);
  } else {
    console.log('\nNo real user found. You may need to create a user first.');
  }
  process.exit(0);
});