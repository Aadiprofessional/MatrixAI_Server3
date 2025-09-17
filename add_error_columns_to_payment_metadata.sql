-- SQL script to add missing error columns to payment_metadata table
-- This fixes the "Could not find the 'error_code' column" error in production

-- Add error_code column
ALTER TABLE payment_metadata 
ADD COLUMN IF NOT EXISTS error_code VARCHAR(100);

-- Add error_message column
ALTER TABLE payment_metadata 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add comments for documentation
COMMENT ON COLUMN payment_metadata.error_code IS 'Error code when payment processing fails';
COMMENT ON COLUMN payment_metadata.error_message IS 'Detailed error message when payment processing fails';

-- Create index for error_code for better performance when querying failed payments
CREATE INDEX IF NOT EXISTS idx_payment_metadata_error_code ON payment_metadata(error_code);

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'payment_metadata' 
  AND column_name IN ('error_code', 'error_message')
ORDER BY ordinal_position;