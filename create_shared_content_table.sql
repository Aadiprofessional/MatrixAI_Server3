-- Create shared_content table for content sharing functionality
-- This table stores content that has been shared with expiration dates

CREATE TABLE IF NOT EXISTS shared_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id VARCHAR(255) UNIQUE NOT NULL,
    content_id UUID NOT NULL,
    uid VARCHAR(255) NOT NULL,
    title TEXT,
    content TEXT,
    prompt TEXT,
    tags TEXT[],
    content_type VARCHAR(100),
    tone VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE shared_content IS 'Stores shared content with expiration dates';
COMMENT ON COLUMN shared_content.share_id IS 'Unique identifier for sharing the content';
COMMENT ON COLUMN shared_content.content_id IS 'Reference to the original content';
COMMENT ON COLUMN shared_content.uid IS 'User ID who shared the content';
COMMENT ON COLUMN shared_content.expires_at IS 'When the shared content expires';
COMMENT ON COLUMN shared_content.created_at IS 'When the content was shared';
COMMENT ON COLUMN shared_content.updated_at IS 'When the shared content was last updated';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_content_share_id ON shared_content(share_id);
CREATE INDEX IF NOT EXISTS idx_shared_content_content_id ON shared_content(content_id);
CREATE INDEX IF NOT EXISTS idx_shared_content_uid ON shared_content(uid);
CREATE INDEX IF NOT EXISTS idx_shared_content_expires_at ON shared_content(expires_at);
CREATE INDEX IF NOT EXISTS idx_shared_content_created_at ON shared_content(created_at);

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_shared_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shared_content_updated_at
    BEFORE UPDATE ON shared_content
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_content_updated_at();

-- Add constraint to ensure expires_at is in the future when created
ALTER TABLE shared_content 
ADD CONSTRAINT check_expires_at_future 
CHECK (expires_at > created_at);