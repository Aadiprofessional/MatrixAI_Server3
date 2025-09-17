const { getSupabaseClient } = require('./src/config/database.js');

async function queryPlans() {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Querying subscription_plans table...');
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*');
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Current subscription plans:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Script error:', err);
  }
}

queryPlans();