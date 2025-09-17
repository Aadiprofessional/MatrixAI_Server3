-- GPTZero Detection Table Setup
-- This script drops the old user_detection table and creates a new one optimized for GPTZero API responses

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.user_detection CASCADE;

-- Create new user_detection table optimized for GPTZero API
CREATE TABLE public.user_detection (
    detection_id UUID NOT NULL,
    uid UUID NOT NULL,
    text TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Detection',
    tags TEXT[] NULL DEFAULT '{}',
    language TEXT NULL DEFAULT 'en',
    
    -- Basic detection results (for backward compatibility)
    is_human BOOLEAN NOT NULL,
    fake_percentage NUMERIC(5, 2) NOT NULL,
    ai_words INTEGER NOT NULL,
    text_words INTEGER NOT NULL,
    
    -- GPTZero specific fields
    predicted_class TEXT NOT NULL, -- 'ai', 'human', 'mixed'
    confidence_score NUMERIC(10, 8) NOT NULL,
    confidence_category TEXT NOT NULL, -- 'high', 'medium', 'low'
    overall_burstiness NUMERIC(10, 8) NULL,
    
    -- GPTZero probabilities
    class_prob_human NUMERIC(10, 8) NULL,
    class_prob_ai NUMERIC(10, 8) NULL,
    class_prob_mixed NUMERIC(10, 8) NULL,
    
    -- GPTZero metadata
    gptzero_version TEXT NULL,
    gptzero_neat_version TEXT NULL,
    scan_id UUID NULL,
    document_classification TEXT NULL,
    result_message TEXT NULL,
    result_sub_message TEXT NULL,
    
    -- Detailed analysis data (JSON)
    sentences JSONB NULL,
    paragraphs JSONB NULL,
    writing_stats JSONB NULL,
    confidence_thresholds_raw JSONB NULL,
    confidence_scores_raw JSONB NULL,
    subclass_data JSONB NULL,
    
    -- Full GPTZero response (for complete data preservation)
    full_gptzero_response JSONB NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_detection_pkey PRIMARY KEY (detection_id),
    CONSTRAINT fk_user_detection_uid FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE,
    CONSTRAINT check_predicted_class CHECK (predicted_class IN ('ai', 'human', 'mixed')),
    CONSTRAINT check_confidence_category CHECK (confidence_category IN ('high', 'medium', 'low'))
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_detection_uid 
ON public.user_detection USING btree (uid) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_detection_created_at 
ON public.user_detection USING btree (created_at) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_detection_predicted_class 
ON public.user_detection USING btree (predicted_class) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_detection_confidence_category 
ON public.user_detection USING btree (confidence_category) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_detection_scan_id 
ON public.user_detection USING btree (scan_id) TABLESPACE pg_default;

-- Create GIN index for JSONB fields for better JSON querying
CREATE INDEX IF NOT EXISTS idx_user_detection_sentences_gin 
ON public.user_detection USING gin (sentences) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_detection_full_response_gin 
ON public.user_detection USING gin (full_gptzero_response) TABLESPACE pg_default;

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_detection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_detection_updated_at
    BEFORE UPDATE ON public.user_detection
    FOR EACH ROW
    EXECUTE FUNCTION update_user_detection_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.user_detection IS 'Stores AI detection results from GPTZero API with comprehensive response data';
COMMENT ON COLUMN public.user_detection.detection_id IS 'Unique identifier for each detection';
COMMENT ON COLUMN public.user_detection.uid IS 'User ID who requested the detection';
COMMENT ON COLUMN public.user_detection.predicted_class IS 'GPTZero prediction: ai, human, or mixed';
COMMENT ON COLUMN public.user_detection.confidence_score IS 'GPTZero confidence score (0-1)';
COMMENT ON COLUMN public.user_detection.scan_id IS 'GPTZero scan ID for tracking';
COMMENT ON COLUMN public.user_detection.full_gptzero_response IS 'Complete GPTZero API response for future reference';
COMMENT ON COLUMN public.user_detection.sentences IS 'Sentence-level analysis from GPTZero';
COMMENT ON COLUMN public.user_detection.writing_stats IS 'Writing statistics from GPTZero analysis';