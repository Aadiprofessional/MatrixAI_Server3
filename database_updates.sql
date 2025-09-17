-- SQL statements to add new columns for feedback and issue management system

-- Add columns to feedback table
ALTER TABLE feedback 
ADD COLUMN status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN admin_comment TEXT,
ADD COLUMN resolved_at TIMESTAMP,
ADD COLUMN resolved_by VARCHAR(255);

-- Add columns to help_requests table
ALTER TABLE help_requests 
ADD COLUMN status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN admin_comment TEXT,
ADD COLUMN resolved_at TIMESTAMP,
ADD COLUMN resolved_by VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_uid_status ON feedback(uid, status);
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_help_requests_uid_status ON help_requests(uid, status);

-- Update existing records to have 'pending' status
UPDATE feedback SET status = 'pending' WHERE status IS NULL;
UPDATE help_requests SET status = 'pending' WHERE status IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN feedback.status IS 'Status of feedback: pending, resolved, closed';
COMMENT ON COLUMN feedback.admin_comment IS 'Admin response/resolution comment';
COMMENT ON COLUMN feedback.resolved_at IS 'Timestamp when feedback was resolved';
COMMENT ON COLUMN feedback.resolved_by IS 'Admin user who resolved the feedback';

COMMENT ON COLUMN help_requests.status IS 'Status of help request: pending, resolved, closed';
COMMENT ON COLUMN help_requests.admin_comment IS 'Admin response/resolution comment';
COMMENT ON COLUMN help_requests.resolved_at IS 'Timestamp when help request was resolved';
COMMENT ON COLUMN help_requests.resolved_by IS 'Admin user who resolved the help request';