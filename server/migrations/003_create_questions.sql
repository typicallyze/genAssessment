-- Migration 003: Create questions, options, and rubrics tables
DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('mcq', 'subjective');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id UUID REFERENCES syllabi(id) ON DELETE SET NULL,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type question_type NOT NULL,
  question_text TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty >= 1 AND difficulty <= 5),
  topic VARCHAR(255),
  default_marks INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS question_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  criterion VARCHAR(255) NOT NULL,
  max_marks INTEGER NOT NULL DEFAULT 1,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_questions_instructor ON questions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_questions_syllabus ON questions(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active);
CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_rubrics_question ON question_rubrics(question_id);
