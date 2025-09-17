-- Create document_extractions table
CREATE TABLE IF NOT EXISTS document_extractions (
    id SERIAL PRIMARY KEY,
    extraction_id UUID UNIQUE NOT NULL,
    uid UUID NOT NULL,
    document_url TEXT NOT NULL,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('doc', 'docx')),
    extracted_text TEXT NOT NULL,
    character_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_extractions_uid ON document_extractions(uid);
CREATE INDEX IF NOT EXISTS idx_document_extractions_extraction_id ON document_extractions(extraction_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_created_at ON document_extractions(created_at);

-- Add foreign key constraint to users table
ALTER TABLE document_extractions 
ADD CONSTRAINT fk_document_extractions_uid 
FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_extractions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_extractions_updated_at
    BEFORE UPDATE ON document_extractions
    FOR EACH ROW
    EXECUTE FUNCTION update_document_extractions_updated_at();