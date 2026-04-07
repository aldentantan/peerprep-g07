import { query } from './index.js';

const ATTEMPT_HISTORY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS question_attempt_history (
    attempt_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    question_id INTEGER NOT NULL,
    question_title VARCHAR(255) NOT NULL,
    question_description TEXT NOT NULL,
    question_difficulty VARCHAR(10) NOT NULL CHECK (question_difficulty IN ('Easy', 'Medium', 'Hard')),
    question_topics TEXT[] NOT NULL DEFAULT '{}',
    question_updated_at TIMESTAMPTZ,
    submitted_code TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE question_attempt_history
    ADD COLUMN IF NOT EXISTS question_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_question_attempt_history_user_submitted_at
    ON question_attempt_history (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_attempt_history_user_question
    ON question_attempt_history (user_id, question_id);
`;

export async function ensureSchema() {
  await query(ATTEMPT_HISTORY_SCHEMA_SQL);
}
