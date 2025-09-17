# BuySubscription API Troubleshooting Guide

## Issue Summary
The BuySubscription API is working fine in localhost but failing in production deployment with the following errors:

1. **Database Schema Error**: `Could not find the 'error_code' column of 'payment_metadata' in the schema cache`
2. **Undefined Error Values**: BuySubscription API call returning undefined error properties

## Root Causes Identified

### 1. Missing Database Columns
The `payment_metadata` table is missing the `error_code` and `error_message` columns that the code is trying to update.

**Files affected:**
- `src/controllers/paymentController.js` (line 338)
- `src/routes/userRoutes.js` (line 1605)
- `src/services/paymentMetadataService.js` (updatePaymentMetadataStatus method)

### 2. Environment Differences
The production database schema is out of sync with the local development database.

## Solutions

### Step 1: Fix Database Schema

1. **Execute the database fix script:**
   ```bash
   node execute_payment_metadata_fix.js
   ```

2. **Or manually run the SQL:**
   ```sql
   -- Add missing columns
   ALTER TABLE payment_metadata 
   ADD COLUMN IF NOT EXISTS error_code VARCHAR(100);
   
   ALTER TABLE payment_metadata 
   ADD COLUMN IF NOT EXISTS error_message TEXT;
   
   -- Add indexes
   CREATE INDEX IF NOT EXISTS idx_payment_metadata_error_code ON payment_metadata(error_code);
   ```

### Step 2: Verify Database Schema

Run this query to verify the columns exist:
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'payment_metadata' 
ORDER BY ordinal_position;
```

### Step 3: Test the Fix

1. **Run the test script:**
   ```bash
   node test_buysubscription_fix.js
   ```

2. **Monitor production logs** after deployment

## Prevention

### 1. Database Migration Strategy
- Always run database migrations in production before deploying code changes
- Use version-controlled migration scripts
- Test migrations in staging environment first

### 2. Environment Parity
- Ensure development, staging, and production databases have identical schemas
- Use database schema comparison tools
- Document all schema changes

### 3. Error Handling Improvements
- Add better error logging with structured data
- Implement graceful degradation when optional columns are missing
- Add database schema validation on startup

## Files Created/Modified

1. **`add_error_columns_to_payment_metadata.sql`** - SQL script to add missing columns
2. **`execute_payment_metadata_fix.js`** - Node.js script to execute the database fix
3. **`test_buysubscription_fix.js`** - Test script to verify the fix
4. **`BUYSUBSCRIPTION_TROUBLESHOOTING.md`** - This troubleshooting guide

## Monitoring

After applying the fix, monitor these logs:
- PaymentMetadataService update operations
- BuySubscription API calls
- Payment status updates
- Database connection errors

## Emergency Rollback

If issues persist:
1. Remove the error columns temporarily:
   ```sql
   ALTER TABLE payment_metadata DROP COLUMN IF EXISTS error_code;
   ALTER TABLE payment_metadata DROP COLUMN IF EXISTS error_message;
   ```
2. Deploy a hotfix that removes error_code/error_message from the update calls
3. Investigate further in a staging environment