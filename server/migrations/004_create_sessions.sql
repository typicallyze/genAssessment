-- Migration 004: Create quiz sessions and session_questions tables
DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('draft', 'active', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  join_code VARCHAR(10) UNIQUE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status session_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  marks_allotted INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_instructor ON quiz_sessions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_join_code ON quiz_sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_session_questions_session ON session_questions(session_id);
