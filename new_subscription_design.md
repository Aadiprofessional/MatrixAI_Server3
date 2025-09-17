# New Subscription Logic Design

## Current System Analysis

### Current Plans:
- **Monthly**: 1380 coins, 1 month period, 138 HKD
- **Yearly**: 1380 coins, 1 month period, 12290 HKD
- **Addon**: 550 coins, 1 month period, 50 HKD
- **Tester**: 450 coins, 15 days period, 50 HKD

### Current User Table Fields:
- `subscription_active` (boolean)
- `user_plan` (string)
- `plan_valid_till` (timestamp)
- `user_coins` (integer)
- `coins_expiry` (timestamp)
- `last_coin_addition` (timestamp)

## New Subscription Logic Requirements

### 1. Monthly Plan Logic
- **Duration**: 30 days from purchase date
- **Expiration**: After 30 days:
  - `user_coins` → 0
  - `subscription_active` → false
  - `user_plan` → null
  - `plan_valid_till` → null
  - `coins_expiry` → null

### 2. Yearly Plan Logic
- **Duration**: 365 days from purchase date
- **Monthly Coin Refresh**: Every 30 days:
  - `user_coins` → 0 (reset before adding new coins)
  - Add new coins based on plan
  - Update `coins_expiry` to next 30-day period
  - Update `last_coin_addition` to current timestamp
- **Final Expiration**: After 365 days:
  - Clear all user data in users table:
    - `user_coins` → 0
    - `subscription_active` → false
    - `user_plan` → null
    - `plan_valid_till` → null
    - `coins_expiry` → null
    - `last_coin_addition` → null

### 3. Addon Plan Logic
- **Expiration**: Expires with the active plan's coin date
- When main plan expires, addon coins also become zero

### 4. New Tester Plan
- **Price**: 100 HKD
- **Coins**: 900 coins
- **Duration**: 30 days (follows monthly plan logic)

## Database Schema Changes

### New Fields Needed:
- `plan_purchase_date` (timestamp) - When the plan was purchased
- `next_coin_refresh` (timestamp) - For yearly plans, when next coins should be added
- `plan_expiry_date` (timestamp) - When the entire plan expires

### Updated subscription_plans Table:
```sql
UPDATE subscription_plans SET 
  price = 100, 
  coins = 900 
WHERE plan_name = 'Tester';
```

## Supabase Functions and Triggers

### 1. Monthly Plan Expiration Function
```sql
CREATE OR REPLACE FUNCTION handle_monthly_plan_expiration()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    user_coins = 0,
    subscription_active = false,
    user_plan = null,
    plan_valid_till = null,
    coins_expiry = null
  WHERE 
    user_plan = 'Monthly' 
    AND plan_valid_till < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 2. Yearly Plan Coin Refresh Function
```sql
CREATE OR REPLACE FUNCTION handle_yearly_coin_refresh()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  plan_coins INTEGER;
BEGIN
  FOR user_record IN 
    SELECT uid, user_plan 
    FROM users 
    WHERE user_plan = 'Yearly' 
    AND next_coin_refresh <= NOW()
    AND plan_expiry_date > NOW()
  LOOP
    -- Get coins for the plan
    SELECT coins INTO plan_coins 
    FROM subscription_plans 
    WHERE plan_name = user_record.user_plan;
    
    -- Reset coins and add new ones
    UPDATE users 
    SET 
      user_coins = plan_coins,
      coins_expiry = NOW() + INTERVAL '30 days',
      next_coin_refresh = NOW() + INTERVAL '30 days',
      last_coin_addition = NOW()
    WHERE uid = user_record.uid;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 3. Yearly Plan Final Expiration Function
```sql
CREATE OR REPLACE FUNCTION handle_yearly_plan_final_expiration()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    user_coins = 0,
    subscription_active = false,
    user_plan = null,
    plan_valid_till = null,
    coins_expiry = null,
    last_coin_addition = null,
    next_coin_refresh = null,
    plan_expiry_date = null
  WHERE 
    user_plan = 'Yearly' 
    AND plan_expiry_date <= NOW();
END;
$$ LANGUAGE plpgsql;
```

### 4. Cron Jobs (pg_cron extension)
```sql
-- Run every hour to check for expirations
SELECT cron.schedule('monthly-plan-expiration', '0 * * * *', 'SELECT handle_monthly_plan_expiration();');
SELECT cron.schedule('yearly-coin-refresh', '0 * * * *', 'SELECT handle_yearly_coin_refresh();');
SELECT cron.schedule('yearly-final-expiration', '0 * * * *', 'SELECT handle_yearly_plan_final_expiration();');
```

## API Changes

### BuySubscription API Updates
1. Calculate `plan_expiry_date` based on plan type
2. Set `next_coin_refresh` for yearly plans
3. Set `plan_purchase_date` for all plans
4. Update logic for addon plans to inherit main plan expiry

### New Validation Logic
- Prevent purchasing addon without active main subscription
- Ensure addon expiry aligns with main plan expiry

## Implementation Steps

1. Add new columns to users table
2. Update subscription_plans table with new tester plan pricing
3. Create Supabase functions for expiration handling
4. Set up cron jobs for automatic processing
5. Update BuySubscription API logic
6. Test the complete subscription lifecycle

## Testing Scenarios

1. **Monthly Plan**: Purchase → Wait 30 days → Verify expiration
2. **Yearly Plan**: Purchase → Wait 30 days → Verify coin refresh → Wait 365 days → Verify final expiration
3. **Addon Plan**: Purchase with active monthly → Verify expiry with main plan
4. **Tester Plan**: Purchase → Verify 900 coins and 100 HKD pricing