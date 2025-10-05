-- Database Migration Script: Add timezone columns to support timezone-aware timestamps
-- This script adds timezone columns to tables that store transaction and metadata information

-- 1. Add timezone column to user_transaction table
-- This table stores all user coin transactions (deductions and additions)
ALTER TABLE user_transaction 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add index for better performance when querying by timezone
CREATE INDEX IF NOT EXISTS idx_user_transaction_timezone ON user_transaction(timezone);

-- Add comment for documentation
COMMENT ON COLUMN user_transaction.timezone IS 'User timezone when the transaction was created (e.g., America/New_York, Asia/Shanghai, UTC)';

-- 2. Add timezone column to image_generate table
-- This table stores AI-generated image metadata
ALTER TABLE image_generate 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add index for better performance when querying by timezone
CREATE INDEX IF NOT EXISTS idx_image_generate_timezone ON image_generate(timezone);

-- Add comment for documentation
COMMENT ON COLUMN image_generate.timezone IS 'User timezone when the image was generated (e.g., America/New_York, Asia/Shanghai, UTC)';

-- 3. Add timezone column to audio_metadata table
-- This table stores audio transcription metadata
ALTER TABLE audio_metadata 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add index for better performance when querying by timezone
CREATE INDEX IF NOT EXISTS idx_audio_metadata_timezone ON audio_metadata(timezone);

-- Add comment for documentation
COMMENT ON COLUMN audio_metadata.timezone IS 'User timezone when the audio was processed (e.g., America/New_York, Asia/Shanghai, UTC)';

-- 4. Add timezone column to video_metadata table
-- This table stores video generation and processing metadata
ALTER TABLE video_metadata 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add index for better performance when querying by timezone
CREATE INDEX IF NOT EXISTS idx_video_metadata_timezone ON video_metadata(timezone);

-- Add comment for documentation
COMMENT ON COLUMN video_metadata.timezone IS 'User timezone when the video was processed (e.g., America/New_York, Asia/Shanghai, UTC)';

-- 5. Update existing records to have UTC timezone (for backward compatibility)
-- This ensures existing records have a timezone value instead of NULL

UPDATE user_transaction 
SET timezone = 'UTC' 
WHERE timezone IS NULL;

UPDATE image_generate 
SET timezone = 'UTC' 
WHERE timezone IS NULL;

UPDATE audio_metadata 
SET timezone = 'UTC' 
WHERE timezone IS NULL;

UPDATE video_metadata 
SET timezone = 'UTC' 
WHERE timezone IS NULL;

-- 6. Add constraints to ensure timezone values are valid
-- This prevents invalid timezone strings from being inserted

-- Note: We use a basic check for common timezone formats
-- In production, you might want to use a more comprehensive timezone validation

ALTER TABLE user_transaction 
ADD CONSTRAINT check_user_transaction_timezone 
CHECK (timezone ~ '^[A-Za-z_/]+$' OR timezone = 'UTC');

ALTER TABLE image_generate 
ADD CONSTRAINT check_image_generate_timezone 
CHECK (timezone ~ '^[A-Za-z_/]+$' OR timezone = 'UTC');

ALTER TABLE audio_metadata 
ADD CONSTRAINT check_audio_metadata_timezone 
CHECK (timezone ~ '^[A-Za-z_/]+$' OR timezone = 'UTC');

ALTER TABLE video_metadata 
ADD CONSTRAINT check_video_metadata_timezone 
CHECK (timezone ~ '^[A-Za-z_/]+$' OR timezone = 'UTC');

-- Migration completed successfully
-- All tables now support timezone-aware timestamps