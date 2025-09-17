-- SQL script to add payment tracking columns to user_order table
-- This enables tracking of payment status, order IDs, and payment intent IDs

-- Add payment tracking columns to user_order table
ALTER TABLE user_order 
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS payment_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance on payment queries
CREATE INDEX IF NOT EXISTS idx_user_order_payment_intent_id ON user_order(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_user_order_payment_status ON user_order(payment_status);
CREATE INDEX IF NOT EXISTS idx_user_order_order_id ON user_order(order_id);
CREATE INDEX IF NOT EXISTS idx_user_order_uid_status ON user_order(uid, payment_status);

-- Add comments for documentation
COMMENT ON COLUMN user_order.payment_intent_id IS 'Airwallex payment intent ID for tracking payments';
COMMENT ON COLUMN user_order.payment_status IS 'Payment status: pending, succeeded, failed, cancelled, processing';
COMMENT ON COLUMN user_order.order_id IS 'Unique order identifier from payment gateway';
COMMENT ON COLUMN user_order.payment_method IS 'Payment method used (card, wallet, etc.)';
COMMENT ON COLUMN user_order.payment_created_at IS 'Timestamp when payment was initiated';
COMMENT ON COLUMN user_order.payment_updated_at IS 'Timestamp when payment status was last updated';

-- Update existing records to have 'succeeded' status for active subscriptions
UPDATE user_order 
SET payment_status = 'succeeded', 
    payment_updated_at = NOW()
WHERE status = 'active' AND payment_status = 'pending';

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_order' 
AND column_name IN ('payment_intent_id', 'payment_status', 'order_id', 'payment_method', 'payment_created_at', 'payment_updated_at')
ORDER BY ordinal_position;