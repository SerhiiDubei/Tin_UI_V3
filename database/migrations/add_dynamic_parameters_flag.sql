-- Migration: Add dynamic parameters flag to sessions table
-- Date: 2025-12-08
-- Description: Allow users to toggle dynamic parameter extraction per session

-- Add column to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS use_dynamic_parameters BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN sessions.use_dynamic_parameters IS 
  'Enable context-aware dynamic parameter extraction (experimental feature)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_dynamic_params 
  ON sessions(use_dynamic_parameters) 
  WHERE use_dynamic_parameters = true;
