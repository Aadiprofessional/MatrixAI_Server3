-- New Subscription System Implementation
-- This script implements the complete new subscription logic with automatic expiration handling

-- Step 1: Add new columns to users table for enhanced subscription management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan_purchase_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_coin_refresh TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMP WITH TIME ZONE;

-- Step 2: Update the Tester plan to new pricing (100 HKD for 900 coins)
UPDATE subscription_plans 
SET 
  price = 100,
  coins = 900
WHERE plan_name = 'Tester';

-- Step 3: Create function to handle monthly plan expiration
CREATE OR REPLACE FUNCTION handle_monthly_plan_expiration()
RETURNS void AS $$
BEGIN
  -- Log the operation
  RAISE NOTICE 'Checking for expired monthly plans at %', NOW();
  
  -- Update expired monthly plans
  UPDATE users 
  SET 
    user_coins = 0,
    subscription_active = false,
    user_plan = null,
    plan_valid_till = null,
    coins_expiry = null,
    plan_expiry_date = null,
    next_coin_refresh = null
  WHERE 
    user_plan IN ('Monthly', 'Tester')
    AND plan_expiry_date <= NOW()
    AND subscription_active = true;
    
  -- Log how many users were affected
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Expired % monthly/tester plans', affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to handle yearly plan coin refresh (every 30 days)
CREATE OR REPLACE FUNCTION handle_yearly_coin_refresh()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  plan_coins INTEGER;
  affected_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Checking for yearly plan coin refresh at %', NOW();
  
  FOR user_record IN 
    SELECT uid, user_plan 
    FROM users 
    WHERE user_plan = 'Yearly' 
    AND next_coin_refresh <= NOW()
    AND plan_expiry_date > NOW()
    AND subscription_active = true
  LOOP
    -- Get coins for the yearly plan
    SELECT coins INTO plan_coins 
    FROM subscription_plans 
    WHERE plan_name = 'Yearly';
    
    -- Reset coins to 0 first, then add new coins
    UPDATE users 
    SET 
      user_coins = plan_coins,
      coins_expiry = NOW() + INTERVAL '30 days',
      next_coin_refresh = NOW() + INTERVAL '30 days',
      last_coin_addition = NOW()
    WHERE uid = user_record.uid;
    
    affected_count := affected_count + 1;
    RAISE NOTICE 'Refreshed coins for user: %', user_record.uid;
  END LOOP;
  
  RAISE NOTICE 'Refreshed coins for % yearly plan users', affected_count;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to handle yearly plan final expiration (after 365 days)
CREATE OR REPLACE FUNCTION handle_yearly_plan_final_expiration()
RETURNS void AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  RAISE NOTICE 'Checking for expired yearly plans at %', NOW();
  
  -- Clear all data for expired yearly plans
  UPDATE users 
  SET 
    user_coins = 0,
    subscription_active = false,
    user_plan = null,
    plan_valid_till = null,
    coins_expiry = null,
    last_coin_addition = null,
    next_coin_refresh = null,
    plan_expiry_date = null,
    plan_purchase_date = null
  WHERE 
    user_plan = 'Yearly' 
    AND plan_expiry_date <= NOW()
    AND subscription_active = true;
    
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Expired % yearly plans and cleared user data', affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to handle addon plan expiration (expires with main plan)
CREATE OR REPLACE FUNCTION handle_addon_plan_expiration()
RETURNS void AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  RAISE NOTICE 'Checking for addon plan expiration at %', NOW();
  
  -- Addon plans expire when the main plan's coins expire
  -- This handles cases where addon was purchased but main plan expired
  UPDATE users 
  SET 
    user_coins = 0
  WHERE 
    coins_expiry <= NOW()
    AND subscription_active = false;
    
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Cleared coins for % users with expired addon plans', affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create master function to run all expiration checks
CREATE OR REPLACE FUNCTION process_subscription_expirations()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'Starting subscription expiration processing at %', NOW();
  
  -- Process in order: addon expiration, monthly expiration, yearly refresh, yearly final expiration
  PERFORM handle_addon_plan_expiration();
  PERFORM handle_monthly_plan_expiration();
  PERFORM handle_yearly_coin_refresh();
  PERFORM handle_yearly_plan_final_expiration();
  
  RAISE NOTICE 'Completed subscription expiration processing at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_plan_expiry ON users(plan_expiry_date) WHERE subscription_active = true;
CREATE INDEX IF NOT EXISTS idx_users_coin_refresh ON users(next_coin_refresh) WHERE user_plan = 'Yearly';
CREATE INDEX IF NOT EXISTS idx_users_coins_expiry ON users(coins_expiry) WHERE subscription_active = true;
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(user_plan, subscription_active);

-- Step 9: Enable pg_cron extension (if not already enabled)
-- Note: This requires superuser privileges and may need to be run separately
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 10: Schedule cron jobs to run the expiration functions
-- Run every hour to check for expirations
-- Note: These may need to be run separately with appropriate permissions
/*
SELECT cron.schedule(
  'subscription-expiration-check',
  '0 * * * *',  -- Every hour
  'SELECT process_subscription_expirations();'
);
*/

-- Step 11: Create a manual trigger function for testing
CREATE OR REPLACE FUNCTION test_subscription_expiration()
RETURNS TABLE(
  operation TEXT,
  affected_users INTEGER,
  details TEXT
) AS $$
DECLARE
  monthly_count INTEGER;
  yearly_refresh_count INTEGER;
  yearly_expire_count INTEGER;
  addon_count INTEGER;
BEGIN
  -- Count users before operations
  SELECT COUNT(*) INTO monthly_count 
  FROM users 
  WHERE user_plan IN ('Monthly', 'Tester') 
  AND plan_expiry_date <= NOW() 
  AND subscription_active = true;
  
  SELECT COUNT(*) INTO yearly_refresh_count 
  FROM users 
  WHERE user_plan = 'Yearly' 
  AND next_coin_refresh <= NOW() 
  AND plan_expiry_date > NOW() 
  AND subscription_active = true;
  
  SELECT COUNT(*) INTO yearly_expire_count 
  FROM users 
  WHERE user_plan = 'Yearly' 
  AND plan_expiry_date <= NOW() 
  AND subscription_active = true;
  
  SELECT COUNT(*) INTO addon_count 
  FROM users 
  WHERE coins_expiry <= NOW() 
  AND subscription_active = false;
  
  -- Run the expiration process
  PERFORM process_subscription_expirations();
  
  -- Return results
  RETURN QUERY VALUES 
    ('Monthly/Tester Expiration', monthly_count, 'Plans expired and data cleared'),
    ('Yearly Coin Refresh', yearly_refresh_count, 'Coins refreshed for active yearly plans'),
    ('Yearly Final Expiration', yearly_expire_count, 'Yearly plans expired and data cleared'),
    ('Addon Cleanup', addon_count, 'Addon coins cleared for inactive users');
END;
$$ LANGUAGE plpgsql;

-- Step 12: Add comments for documentation
COMMENT ON COLUMN users.plan_purchase_date IS 'Timestamp when the current subscription plan was purchased';
COMMENT ON COLUMN users.next_coin_refresh IS 'For yearly plans: when the next coin refresh should occur (every 30 days)';
COMMENT ON COLUMN users.plan_expiry_date IS 'When the entire subscription plan expires (30 days for monthly, 365 days for yearly)';

COMMENT ON FUNCTION handle_monthly_plan_expiration() IS 'Expires monthly and tester plans after 30 days, clearing all subscription data';
COMMENT ON FUNCTION handle_yearly_coin_refresh() IS 'Refreshes coins every 30 days for active yearly plans';
COMMENT ON FUNCTION handle_yearly_plan_final_expiration() IS 'Expires yearly plans after 365 days, clearing all user data';
COMMENT ON FUNCTION process_subscription_expirations() IS 'Master function that runs all subscription expiration checks';
COMMENT ON FUNCTION test_subscription_expiration() IS 'Test function to manually trigger expiration checks and see results';

-- Step 13: Create a view for monitoring subscription status
CREATE OR REPLACE VIEW subscription_monitoring AS
SELECT 
  uid,
  email,
  user_plan,
  subscription_active,
  user_coins,
  plan_purchase_date,
  plan_expiry_date,
  next_coin_refresh,
  coins_expiry,
  CASE 
    WHEN plan_expiry_date <= NOW() THEN 'EXPIRED'
    WHEN next_coin_refresh <= NOW() AND user_plan = 'Yearly' THEN 'NEEDS_COIN_REFRESH'
    WHEN coins_expiry <= NOW() THEN 'COINS_EXPIRED'
    ELSE 'ACTIVE'
  END as status,
  CASE 
    WHEN plan_expiry_date IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (plan_expiry_date - NOW())) / 86400
    ELSE NULL
  END as days_until_expiry
FROM users 
WHERE subscription_active = true OR plan_expiry_date IS NOT NULL
ORDER BY plan_expiry_date ASC;

COMMENT ON VIEW subscription_monitoring IS 'View for monitoring subscription status and upcoming expirations';

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '=== NEW SUBSCRIPTION SYSTEM SETUP COMPLETE ===';
  RAISE NOTICE 'Database schema updated with new columns';
  RAISE NOTICE 'Tester plan updated to 100 HKD for 900 coins';
  RAISE NOTICE 'Expiration functions created and ready';
  RAISE NOTICE 'Indexes created for performance';
  RAISE NOTICE 'Monitoring view created';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update the BuySubscription API to use new logic';
  RAISE NOTICE '2. Set up cron jobs for automatic expiration processing';
  RAISE NOTICE '3. Test the subscription lifecycle';
  RAISE NOTICE '';
  RAISE NOTICE 'To test expiration manually, run: SELECT * FROM test_subscription_expiration();';
  RAISE NOTICE 'To monitor subscriptions, query: SELECT * FROM subscription_monitoring;';
END;
$$;