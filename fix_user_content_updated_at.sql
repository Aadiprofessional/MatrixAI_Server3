-- Fix user_content table by adding missing updated_at column
-- This addresses the error: "column user_content.updated_at does not exist"

-- Step 1: Add the missing updated_at column
ALTER TABLE user_content 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Update existing records to have an updated_at timestamp
UPDATE user_content 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Step 3: Create an index for better performance on updated_at queries
CREATE INDEX IF NOT EXISTS idx_user_content_updated_at ON user_content(updated_at);

-- Step 4: Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to automatically update updated_at timestamp on row updates
DROP TRIGGER IF EXISTS trigger_update_user_content_updated_at ON user_content;
CREATE TRIGGER trigger_update_user_content_updated_at
    BEFORE UPDATE ON user_content
    FOR EACH ROW
    EXECUTE FUNCTION update_user_content_updated_at();

-- Step 6: Add a comment for documentation
COMMENT ON COLUMN user_content.updated_at IS 'Timestamp when the content was last updated';

-- Step 7: Verify the table structure (optional - for confirmation)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_content' 
AND column_name IN ('created_at', 'updated_at')
ORDER BY ordinal_position;