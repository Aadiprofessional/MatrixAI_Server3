-- Create image_prompts table for storing image URLs and prompts
CREATE TABLE IF NOT EXISTS image_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_image_prompts_user_id ON image_prompts(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_image_prompts_created_at ON image_prompts(created_at);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE image_prompts ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see their own records
CREATE POLICY "Users can view their own image prompts" ON image_prompts
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own records
CREATE POLICY "Users can insert their own image prompts" ON image_prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own records
CREATE POLICY "Users can delete their own image prompts" ON image_prompts
    FOR DELETE USING (auth.uid() = user_id);

-- Policy to allow users to update their own records
CREATE POLICY "Users can update their own image prompts" ON image_prompts
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER update_image_prompts_updated_at 
    BEFORE UPDATE ON image_prompts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();