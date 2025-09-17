-- SQL script to fix the users table by adding the missing 'created_at' column
-- This addresses the error: "Could not find the 'created_at' column of 'users' in the schema cache"

-- Step 1: Add the missing created_at column
ALTER TABLE users 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Update existing records to have a created_at timestamp
UPDATE users 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Step 3: Create an index for better performance on created_at queries
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Step 4: Add a comment for documentation
COMMENT ON COLUMN users.created_at IS 'Timestamp when the user account was created';

-- Step 5: Verify the table structure (optional - for confirmation)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'created_at'
ORDER BY ordinal_position;