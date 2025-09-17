-- SQL script to add translated_data column to audio_metadata table
-- This column will store multiple language translations as JSONB

-- Add translated_data column to store multiple language translations
ALTER TABLE audio_metadata 
ADD COLUMN translated_data JSONB DEFAULT '{}'::jsonb;

-- Add index for better performance on translated_data queries
CREATE INDEX IF NOT EXISTS idx_audio_metadata_translated_data ON audio_metadata USING GIN (translated_data);

-- Add comment for documentation
COMMENT ON COLUMN audio_metadata.translated_data IS 'Stores translated word data for multiple languages in JSONB format. Structure: {"language_code": {"words": [...], "transcription": "..."}}';

-- Example of the expected JSONB structure:
-- {
--   "es": {
--     "words": [
--       {
--         "word": "hola",
--         "start": 0.5,
--         "end": 1.0,
--         "confidence": 0.95
--       }
--     ],
--     "transcription": "hola mundo"
--   },
--   "fr": {
--     "words": [
--       {
--         "word": "bonjour",
--         "start": 0.5,
--         "end": 1.0,
--         "confidence": 0.95
--       }
--     ],
--     "transcription": "bonjour le monde"
--   }
-- }