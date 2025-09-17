# Users Table Fix Instructions

## Problem
The signup API is failing with the error:
```
Could not find the 'created_at' column of 'users' in the schema cache
```

## Root Cause
The `users` table in your Supabase database is missing the `created_at` column that the signup code expects to exist.

## Solution

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Go to your Supabase Dashboard**
   - Open your Supabase project dashboard
   - Navigate to the "SQL Editor" section

2. **Execute the SQL Fix**
   - Copy and paste the following SQL commands:
   ```sql
   -- Add the missing created_at column
   ALTER TABLE users 
   ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
   
   -- Update existing records to have a created_at timestamp
   UPDATE users 
   SET created_at = NOW() 
   WHERE created_at IS NULL;
   
   -- Create an index for better performance
   CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
   ```

3. **Run the SQL**
   - Click "Run" to execute the commands
   - You should see success messages for each command

### Option 2: Using the Provided SQL File

1. **Use the SQL file**
   - Open the file `fix_users_table.sql` in this directory
   - Copy all the contents
   - Paste and run in Supabase SQL Editor

## Verification

After running the SQL commands:

1. **Test the signup API again**
   ```bash
   curl -X POST http://localhost:3000/api/user/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","confirmPassword":"password123"}'
   ```

2. **Check the server logs**
   - The error should be resolved
   - You should see successful user creation

## Current Users Table Structure

Before the fix, your users table has these columns:
- `id`, `name`, `gender`, `email`, `age`, `uid`
- `user_coins`, `phone`, `dp_url`, `newuser`
- `subscription_active`, `user_plan`, `plan_valid_till`, `pending_plan`
- `coins_expiry`, `last_coin_addition`, `preferred_language`
- `invited_members`, `referred_by`, `referral_code`

After the fix, it will also have:
- `created_at` (TIMESTAMP WITH TIME ZONE)

## Notes

- The `created_at` column will be set to the current timestamp for existing users
- New users will automatically get the current timestamp when they sign up
- An index is created on `created_at` for better query performance
- The fix is safe and won't affect existing data