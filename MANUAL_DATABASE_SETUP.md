# Manual Database Setup Instructions

Since the Supabase RPC functions are not available for programmatic schema changes, you need to manually execute the following SQL commands in the Supabase SQL Editor.

## Required SQL Commands

### 1. Add New Columns to Users Table

Run these commands in the Supabase SQL Editor:

```sql
-- Add subscription tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_purchase_date TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS next_coin_refresh TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMPTZ;
```

### 2. Create Performance Indexes

```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_plan_expiry_date ON users(plan_expiry_date);
CREATE INDEX IF NOT EXISTS idx_users_next_coin_refresh ON users(next_coin_refresh);
CREATE INDEX IF NOT EXISTS idx_users_subscription_active ON users(subscription_active);
CREATE INDEX IF NOT EXISTS idx_users_user_plan ON users(user_plan);
```

### 3. Create Subscription Monitoring View

```sql
-- Create a view for subscription monitoring
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
        WHEN plan_expiry_date IS NULL THEN 'NO_PLAN'
        WHEN plan_expiry_date <= NOW() THEN 'EXPIRED'
        WHEN next_coin_refresh IS NOT NULL AND next_coin_refresh <= NOW() AND user_plan = 'Yearly' THEN 'NEEDS_COIN_REFRESH'
        WHEN coins_expiry IS NOT NULL AND coins_expiry <= NOW() THEN 'COINS_EXPIRED'
        ELSE 'ACTIVE'
    END as status,
    CASE 
        WHEN plan_expiry_date IS NOT NULL THEN 
            EXTRACT(DAY FROM (plan_expiry_date - NOW()))
        ELSE NULL
    END as days_until_expiry
FROM users
WHERE subscription_active = true OR plan_expiry_date IS NOT NULL
ORDER BY plan_expiry_date ASC NULLS LAST;
```

### 4. Optional: Create Database Functions (Advanced)

If you want to set up automatic processing via database functions:

```sql
-- Function to handle monthly plan expiration
CREATE OR REPLACE FUNCTION handle_monthly_plan_expiration()
RETURNS TABLE(affected_count INTEGER) AS $$
BEGIN
    UPDATE users 
    SET 
        user_coins = 0,
        subscription_active = false,
        user_plan = NULL,
        plan_valid_till = NULL,
        coins_expiry = NULL,
        plan_expiry_date = NULL,
        next_coin_refresh = NULL,
        plan_purchase_date = NULL
    WHERE user_plan IN ('Monthly', 'Tester')
        AND plan_expiry_date <= NOW()
        AND subscription_active = true;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN QUERY SELECT affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to handle yearly plan coin refresh
CREATE OR REPLACE FUNCTION handle_yearly_coin_refresh()
RETURNS TABLE(affected_count INTEGER) AS $$
DECLARE
    yearly_plan_coins INTEGER;
BEGIN
    -- Get yearly plan coins
    SELECT coins INTO yearly_plan_coins 
    FROM subscription_plans 
    WHERE plan_name = 'Yearly';
    
    UPDATE users 
    SET 
        user_coins = yearly_plan_coins,
        coins_expiry = NOW() + INTERVAL '30 days',
        next_coin_refresh = NOW() + INTERVAL '30 days',
        last_coin_addition = NOW()
    WHERE user_plan = 'Yearly'
        AND next_coin_refresh <= NOW()
        AND plan_expiry_date > NOW()
        AND subscription_active = true;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN QUERY SELECT affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to handle yearly plan final expiration
CREATE OR REPLACE FUNCTION handle_yearly_plan_final_expiration()
RETURNS TABLE(affected_count INTEGER) AS $$
BEGIN
    UPDATE users 
    SET 
        user_coins = 0,
        subscription_active = false,
        user_plan = NULL,
        plan_valid_till = NULL,
        coins_expiry = NULL,
        last_coin_addition = NULL,
        next_coin_refresh = NULL,
        plan_expiry_date = NULL,
        plan_purchase_date = NULL
    WHERE user_plan = 'Yearly'
        AND plan_expiry_date <= NOW()
        AND subscription_active = true;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN QUERY SELECT affected_count;
END;
$$ LANGUAGE plpgsql;
```

### 5. Enable pg_cron (Optional - for automatic processing)

If you want to enable automatic processing via database cron jobs:

```sql
-- Enable pg_cron extension (may require admin privileges)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly subscription processing
SELECT cron.schedule('subscription-processing', '0 * * * *', $$
    SELECT handle_monthly_plan_expiration();
    SELECT handle_yearly_coin_refresh();
    SELECT handle_yearly_plan_final_expiration();
$$);
```

## Verification

After running the above commands, you can verify the setup by:

1. **Check if columns exist:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'users' 
   AND column_name IN ('plan_purchase_date', 'next_coin_refresh', 'plan_expiry_date');
   ```

2. **Test the monitoring view:**
   ```sql
   SELECT * FROM subscription_monitoring LIMIT 5;
   ```

3. **Check indexes:**
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'users';
   ```

## What's Already Implemented

✅ **Application Code:**
- Subscription expiration service (`src/services/subscriptionExpirationService.js`)
- Cron service for automatic processing (`src/services/subscriptionCronService.js`)
- Updated BuySubscription API with new logic
- Admin endpoints for monitoring and manual processing
- Tester plan updated (100 HKD for 900 coins)

✅ **Server Integration:**
- Cron service automatically starts with the server
- Admin routes for subscription management
- Comprehensive test suite

## Next Steps

1. Execute the SQL commands above in Supabase SQL Editor
2. Run the test suite again: `node test_subscription_system.js`
3. Test the admin endpoints via the web interface
4. Monitor subscription processing in the server logs

## Testing the System

Once the database setup is complete, you can:

1. **Test via API endpoints:**
   - `GET /admin/getSubscriptionMonitoring` - View all subscriptions
   - `POST /admin/runSubscriptionProcessing` - Manually trigger processing
   - `GET /admin/getSubscriptionCronStatus` - Check cron service status

2. **Test via Node.js:**
   ```bash
   node test_subscription_system.js
   ```

3. **Monitor logs:**
   - Server logs will show cron job execution every hour
   - Manual processing results via admin endpoints