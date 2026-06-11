-- Migration 005: Create attempts, answers, and AI gradings tables
DO $$ BEGIN
  CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'graded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  total_score NUMERIC(10,2),
  status attempt_status NOT NULL DEFAULT 'in_progress',
  UNIQUE(session_id, student_id)
);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  session_question_id UUID NOT NULL REFERENCES session_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES question_options(id) ON DELETE SET NULL,
  subjective_answer TEXT,
  marks_awarded NUMERIC(10,2),
  is_manually_overridden BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(attempt_id, session_question_id)
);

CREATE TABLE IF NOT EXISTS ai_gradings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES attempt_answers(id) ON DELETE CASCADE,
  ai_score NUMERIC(10,2) NOT NULL,
  ai_justification TEXT NOT NULL,
  rubric_breakdown JSONB,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts(status);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answers_session_question ON attempt_answers(session_question_id);
CREATE INDEX IF NOT EXISTS idx_ai_gradings_answer ON ai_gradings(answer_id);
