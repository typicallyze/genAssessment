-- Add results_released flag to quiz_sessions
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS results_released BOOLEAN DEFAULT false;
