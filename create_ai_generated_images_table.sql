-- Create table for AI generated images
CREATE TABLE IF NOT EXISTS ai_generated_images (
    id UUID PRIMARY KEY,
    uid TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    python_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_uid ON ai_generated_images(uid);

-- Create index for faster queries by creation date
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_created_at ON ai_generated_images(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE ai_generated_images ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own images
CREATE POLICY "Users can view their own AI generated images" ON ai_generated_images
    FOR SELECT USING (auth.uid()::text = uid);

-- Create policy to allow users to insert their own images
CREATE POLICY "Users can insert their own AI generated images" ON ai_generated_images
    FOR INSERT WITH CHECK (auth.uid()::text = uid);

-- Create policy to allow users to update their own images
CREATE POLICY "Users can update their own AI generated images" ON ai_generated_images
    FOR UPDATE USING (auth.uid()::text = uid);

-- Create policy to allow users to delete their own images
CREATE POLICY "Users can delete their own AI generated images" ON ai_generated_images
    FOR DELETE USING (auth.uid()::text = uid);