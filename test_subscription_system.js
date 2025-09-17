require('dotenv').config();
const axios = require('axios');
const SubscriptionExpirationService = require('./src/services/subscriptionExpirationService');
const subscriptionCronService = require('./src/services/subscriptionCronService');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_UID = 'test-user-subscription-' + Date.now();

/**
 * Test the subscription expiration service directly
 */
async function testSubscriptionExpirationService() {
  console.log('\n=== Testing Subscription Expiration Service ===');
  
  const service = new SubscriptionExpirationService();
  
  try {
    // Test monitoring data
    console.log('\n1. Testing subscription monitoring...');
    const monitoringResult = await service.getSubscriptionMonitoring();
    if (monitoringResult.success) {
      console.log('✅ Monitoring data retrieved successfully');
      console.log(`Found ${monitoringResult.data.length} users with subscription data`);
      
      // Show first few users for verification
      if (monitoringResult.data.length > 0) {
        console.log('Sample users:');
        monitoringResult.data.slice(0, 3).forEach(user => {
          console.log(`  - ${user.email}: ${user.user_plan} (${user.status})`);
        });
      }
    } else {
      console.log('❌ Failed to get monitoring data:', monitoringResult.error);
    }
    
    // Test manual processing
    console.log('\n2. Testing manual subscription processing...');
    const processResult = await service.processAllExpirations();
    if (processResult.success) {
      console.log('✅ Subscription processing completed successfully');
      console.log(`Processing took ${processResult.duration}ms`);
      console.log('Results:', JSON.stringify(processResult.results, null, 2));
    } else {
      console.log('❌ Subscription processing failed:', processResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing subscription expiration service:', error);
  }
}

/**
 * Test the subscription cron service
 */
async function testSubscriptionCronService() {
  console.log('\n=== Testing Subscription Cron Service ===');
  
  try {
    // Test status
    console.log('\n1. Testing cron service status...');
    const status = subscriptionCronService.getStatus();
    console.log('✅ Cron service status:', status);
    
    // Test manual run
    console.log('\n2. Testing manual cron run...');
    const manualResult = await subscriptionCronService.runManually();
    if (manualResult.success) {
      console.log('✅ Manual cron run completed successfully');
      console.log(`Duration: ${manualResult.duration}ms`);
    } else {
      console.log('❌ Manual cron run failed:', manualResult.error);
    }
    
    // Test monitoring data through cron service
    console.log('\n3. Testing monitoring data through cron service...');
    const monitoringResult = await subscriptionCronService.getMonitoringData();
    if (monitoringResult.success) {
      console.log('✅ Monitoring data retrieved through cron service');
      console.log(`Found ${monitoringResult.data.length} users`);
    } else {
      console.log('❌ Failed to get monitoring data through cron service:', monitoringResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing subscription cron service:', error);
  }
}

/**
 * Test admin API endpoints
 */
async function testAdminAPIEndpoints() {
  console.log('\n=== Testing Admin API Endpoints ===');
  
  try {
    // Test subscription monitoring endpoint
    console.log('\n1. Testing /admin/getSubscriptionMonitoring...');
    const monitoringResponse = await axios.get(`${BASE_URL}/admin/getSubscriptionMonitoring`);
    if (monitoringResponse.data.success) {
      console.log('✅ Subscription monitoring endpoint working');
      console.log(`Found ${monitoringResponse.data.data.length} users`);
    } else {
      console.log('❌ Subscription monitoring endpoint failed:', monitoringResponse.data.error);
    }
    
    // Test cron status endpoint
    console.log('\n2. Testing /admin/getSubscriptionCronStatus...');
    const statusResponse = await axios.get(`${BASE_URL}/admin/getSubscriptionCronStatus`);
    if (statusResponse.data.success) {
      console.log('✅ Cron status endpoint working');
      console.log('Status:', statusResponse.data.status);
    } else {
      console.log('❌ Cron status endpoint failed:', statusResponse.data.error);
    }
    
    // Test manual processing endpoint
    console.log('\n3. Testing /admin/runSubscriptionProcessing...');
    const processResponse = await axios.post(`${BASE_URL}/admin/runSubscriptionProcessing`);
    if (processResponse.data.success) {
      console.log('✅ Manual processing endpoint working');
      console.log(`Duration: ${processResponse.data.duration}ms`);
      console.log('Message:', processResponse.data.message);
    } else {
      console.log('❌ Manual processing endpoint failed:', processResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing admin API endpoints:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Test subscription plans endpoint
 */
async function testSubscriptionPlans() {
  console.log('\n=== Testing Subscription Plans ===');
  
  try {
    // Test getting all plans
    console.log('\n1. Testing subscription plans retrieval...');
    const { getSupabaseClient } = require('./src/config/database');
    const supabase = getSupabaseClient();
    
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('plan_name');
    
    if (error) {
      console.log('❌ Failed to get subscription plans:', error);
    } else {
      console.log('✅ Subscription plans retrieved successfully');
      console.log('Available plans:');
      plans.forEach(plan => {
        console.log(`  - ${plan.plan_name}: ${plan.coins} coins, $${plan.price} ${plan.currency}, ${plan.plan_period} days`);
      });
      
      // Verify Tester plan
      const testerPlan = plans.find(p => p.plan_name === 'Tester');
      if (testerPlan) {
        if (testerPlan.price === 100 && testerPlan.coins === 900) {
          console.log('✅ Tester plan correctly configured (100 HKD, 900 coins)');
        } else {
          console.log(`❌ Tester plan incorrectly configured: ${testerPlan.price} HKD, ${testerPlan.coins} coins`);
        }
      } else {
        console.log('❌ Tester plan not found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing subscription plans:', error);
  }
}

/**
 * Test database schema changes
 */
async function testDatabaseSchema() {
  console.log('\n=== Testing Database Schema ===');
  
  try {
    const { getSupabaseClient } = require('./src/config/database');
    const supabase = getSupabaseClient();
    
    // Test if new columns exist by querying a user
    console.log('\n1. Testing new columns in users table...');
    const { data: users, error } = await supabase
      .from('users')
      .select('uid, email, plan_purchase_date, next_coin_refresh, plan_expiry_date')
      .limit(1);
    
    if (error) {
      console.log('❌ Failed to query users table with new columns:', error.message);
    } else {
      console.log('✅ New columns exist in users table');
      console.log('Sample user data structure:', users[0] || 'No users found');
    }
    
  } catch (error) {
    console.error('❌ Error testing database schema:', error);
  }
}

/**
 * Main test function
 */
async function runAllTests() {
  console.log('🚀 Starting Subscription System Tests');
  console.log('=====================================');
  
  try {
    await testDatabaseSchema();
    await testSubscriptionPlans();
    await testSubscriptionExpirationService();
    await testSubscriptionCronService();
    await testAdminAPIEndpoints();
    
    console.log('\n🎉 All subscription system tests completed!');
    console.log('=====================================');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(() => {
    console.log('\n✅ Test execution finished');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testSubscriptionExpirationService,
  testSubscriptionCronService,
  testAdminAPIEndpoints,
  testSubscriptionPlans,
  testDatabaseSchema,
  runAllTests
};