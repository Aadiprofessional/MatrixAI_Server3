-- SQL script to create user_content table for content writer API
-- This table stores user-generated content with proper timestamp tracking

-- Create user_content table
CREATE TABLE IF NOT EXISTS user_content (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(255) UNIQUE NOT NULL,
    uid VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    content TEXT NOT NULL,
    title VARCHAR(500) DEFAULT 'Untitled Content',
    tags JSONB DEFAULT '[]'::jsonb,
    content_type VARCHAR(100),
    tone VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_shared BOOLEAN DEFAULT false,
    share_id VARCHAR(255) UNIQUE,
    view_count INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_content_content_id ON user_content(content_id);
CREATE INDEX IF NOT EXISTS idx_user_content_uid ON user_content(uid);
CREATE INDEX IF NOT EXISTS idx_user_content_created_at ON user_content(created_at);
CREATE INDEX IF NOT EXISTS idx_user_content_updated_at ON user_content(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_content_content_type ON user_content(content_type);
CREATE INDEX IF NOT EXISTS idx_user_content_uid_created_at ON user_content(uid, created_at);
CREATE INDEX IF NOT EXISTS idx_user_content_share_id ON user_content(share_id);
CREATE INDEX IF NOT EXISTS idx_user_content_tags ON user_content USING GIN (tags);

-- Add comments for documentation
COMMENT ON TABLE user_content IS 'Stores user-generated content from content writer API';
COMMENT ON COLUMN user_content.content_id IS 'Unique identifier for the content (UUID)';
COMMENT ON COLUMN user_content.uid IS 'User ID who created the content';
COMMENT ON COLUMN user_content.prompt IS 'Original prompt used to generate the content';
COMMENT ON COLUMN user_content.content IS 'Generated content text';
COMMENT ON COLUMN user_content.title IS 'Title of the content';
COMMENT ON COLUMN user_content.tags IS 'Tags associated with the content in JSON array format';
COMMENT ON COLUMN user_content.content_type IS 'Type of content (blog, article, social_media, etc.)';
COMMENT ON COLUMN user_content.tone IS 'Tone of the content (formal, casual, professional, etc.)';
COMMENT ON COLUMN user_content.language IS 'Language code of the content (en, es, fr, etc.)';
COMMENT ON COLUMN user_content.created_at IS 'Timestamp when the content was created';
COMMENT ON COLUMN user_content.updated_at IS 'Timestamp when the content was last updated';
COMMENT ON COLUMN user_content.is_shared IS 'Whether the content is shared publicly';
COMMENT ON COLUMN user_content.share_id IS 'Unique identifier for shared content';
COMMENT ON COLUMN user_content.view_count IS 'Number of times the content has been viewed';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER trigger_update_user_content_timestamp
    BEFORE UPDATE ON user_content
    FOR EACH ROW
    EXECUTE FUNCTION update_user_content_timestamp();

-- Verify table creation
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'user_content' 
ORDER BY ordinal_position;