-- SQL script to create payment_metadata table for persistent storage of payment intent data
-- This replaces the in-memory storage in paymentController.js

-- Create payment_metadata table
CREATE TABLE IF NOT EXISTS payment_metadata (
    id SERIAL PRIMARY KEY,
    payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    uid VARCHAR(255) NOT NULL,
    plan VARCHAR(100) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    order_id VARCHAR(255),
    payment_method VARCHAR(100) DEFAULT 'airwallex',
    request_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_metadata_payment_intent_id ON payment_metadata(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_metadata_uid ON payment_metadata(uid);
CREATE INDEX IF NOT EXISTS idx_payment_metadata_status ON payment_metadata(status);
CREATE INDEX IF NOT EXISTS idx_payment_metadata_created_at ON payment_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_metadata_expires_at ON payment_metadata(expires_at);

-- Add comments for documentation
COMMENT ON TABLE payment_metadata IS 'Stores payment intent metadata for processing after payment completion';
COMMENT ON COLUMN payment_metadata.payment_intent_id IS 'Airwallex payment intent ID';
COMMENT ON COLUMN payment_metadata.uid IS 'User ID who initiated the payment';
COMMENT ON COLUMN payment_metadata.plan IS 'Subscription plan being purchased';
COMMENT ON COLUMN payment_metadata.total_price IS 'Total amount for the payment';
COMMENT ON COLUMN payment_metadata.order_id IS 'Unique order identifier';
COMMENT ON COLUMN payment_metadata.payment_method IS 'Payment method used';
COMMENT ON COLUMN payment_metadata.request_id IS 'Request ID for tracking';
COMMENT ON COLUMN payment_metadata.status IS 'Payment status: pending, processing, completed, failed, expired';
COMMENT ON COLUMN payment_metadata.metadata IS 'Additional metadata in JSON format';
COMMENT ON COLUMN payment_metadata.expires_at IS 'When this metadata record expires (24 hours default)';

-- Create function to clean up expired metadata
CREATE OR REPLACE FUNCTION cleanup_expired_payment_metadata()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM payment_metadata 
    WHERE expires_at <= NOW() 
    AND status IN ('pending', 'expired');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_metadata_timestamp
    BEFORE UPDATE ON payment_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_metadata_timestamp();

-- Insert some example data for testing (optional)
-- INSERT INTO payment_metadata (payment_intent_id, uid, plan, total_price, order_id) 
-- VALUES ('test_intent_123', 'test_user_456', 'Monthly', 29.99, 'order_789');

-- Verify table creation
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'payment_metadata' 
ORDER BY ordinal_position;