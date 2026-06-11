import { query } from '../../config/db.js';
import crypto from 'crypto';

function generateJoinCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export async function create(instructorId, data) {
  const { title, description, duration_minutes } = data;
  const joinCode = generateJoinCode();

  const result = await query(
    `INSERT INTO quiz_sessions (instructor_id, title, description, join_code, duration_minutes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [instructorId, title, description || '', joinCode, duration_minutes || 60]
  );
  return result.rows[0];
}

export async function list(userId, role) {
  if (role === 'instructor') {
    const result = await query(
      `SELECT qs.*,
        (SELECT COUNT(*) FROM session_questions sq WHERE sq.session_id = qs.id) as question_count,
        (SELECT COUNT(*) FROM attempts a WHERE a.session_id = qs.id) as attempt_count
       FROM quiz_sessions qs WHERE qs.instructor_id = $1 ORDER BY qs.created_at DESC`,
      [userId]
    );
    return result.rows;
  } else {
    // Students see only active sessions
    const result = await query(
      `SELECT qs.id, qs.title, qs.description, qs.duration_minutes, qs.status, qs.start_time, qs.end_time,
        (SELECT COUNT(*) FROM session_questions sq WHERE sq.session_id = qs.id) as question_count
       FROM quiz_sessions qs WHERE qs.status = 'active' ORDER BY qs.created_at DESC`
    );
    return result.rows;
  }
}

export async function getById(id, userId, role) {
  let result;
  if (role === 'instructor') {
    result = await query(
      `SELECT qs.*,
        (SELECT COUNT(*) FROM attempts a WHERE a.session_id = qs.id) as attempt_count
       FROM quiz_sessions qs WHERE qs.id = $1 AND qs.instructor_id = $2`,
      [id, userId]
    );
  } else {
    result = await query(
      `SELECT qs.id, qs.title, qs.description, qs.duration_minutes, qs.status, qs.start_time, qs.end_time
       FROM quiz_sessions qs WHERE qs.id = $1 AND qs.status = 'active'`,
      [id]
    );
  }
  if (result.rows.length === 0) {
    const err = new Error('Session not found');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}

export async function update(id, instructorId, data) {
  const { title, description, duration_minutes, start_time, end_time } = data;
  const result = await query(
    `UPDATE quiz_sessions SET title = COALESCE($1, title), description = COALESCE($2, description),
     duration_minutes = COALESCE($3, duration_minutes), start_time = COALESCE($4, start_time),
     end_time = COALESCE($5, end_time)
     WHERE id = $6 AND instructor_id = $7 AND status = 'draft' RETURNING *`,
    [title, description, duration_minutes, start_time, end_time, id, instructorId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Session not found or not editable');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}

export async function addQuestions(sessionId, instructorId, questionIds, marksAllotted) {
  // Verify session belongs to instructor and is in draft
  const session = await query(
    'SELECT id FROM quiz_sessions WHERE id = $1 AND instructor_id = $2 AND status = $3',
    [sessionId, instructorId, 'draft']
  );
  if (session.rows.length === 0) {
    const err = new Error('Session not found or not in draft status');
    err.type = 'not_found';
    throw err;
  }

  const existing = await query('SELECT MAX(display_order) as max_order FROM session_questions WHERE session_id = $1', [sessionId]);
  let order = (existing.rows[0]?.max_order || 0) + 1;

  const added = [];
  for (let i = 0; i < questionIds.length; i++) {
    try {
      const result = await query(
        'INSERT INTO session_questions (session_id, question_id, marks_allotted, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
        [sessionId, questionIds[i], marksAllotted?.[i] || 1, order++]
      );
      added.push(result.rows[0]);
    } catch (err) {
      if (err.code !== '23505') throw err; // Skip duplicates
    }
  }
  return added;
}

export async function removeQuestion(sessionId, sqId, instructorId) {
  const result = await query(
    `DELETE FROM session_questions sq
     USING quiz_sessions qs
     WHERE sq.id = $1 AND sq.session_id = $2 AND qs.id = sq.session_id AND qs.instructor_id = $3 AND qs.status = 'draft'
     RETURNING sq.id`,
    [sqId, sessionId, instructorId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Question not found in session');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}

export async function getSessionQuestions(sessionId, includeAnswers = true) {
  const result = await query(
    `SELECT sq.id as session_question_id, sq.marks_allotted, sq.display_order,
      q.id as question_id, q.type, q.question_text, q.difficulty, q.topic, q.default_marks,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', qo.id, 'option_text', qo.option_text, 'is_correct', qo.is_correct, 'display_order', qo.display_order)) FILTER (WHERE qo.id IS NOT NULL), '[]') as options,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', qr.id, 'criterion', qr.criterion, 'max_marks', qr.max_marks, 'description', qr.description)) FILTER (WHERE qr.id IS NOT NULL), '[]') as rubrics
     FROM session_questions sq
     JOIN questions q ON q.id = sq.question_id
     LEFT JOIN question_options qo ON qo.question_id = q.id
     LEFT JOIN question_rubrics qr ON qr.question_id = q.id
     WHERE sq.session_id = $1
     GROUP BY sq.id, q.id
     ORDER BY sq.display_order`,
    [sessionId]
  );
  return result.rows;
}

export async function activate(id, instructorId) {
  // Check at least one question is assigned
  const qCount = await query('SELECT COUNT(*) as cnt FROM session_questions WHERE session_id = $1', [id]);
  if (parseInt(qCount.rows[0].cnt) === 0) {
    const err = new Error('Cannot activate session with no questions');
    err.type = 'validation';
    throw err;
  }

  const result = await query(
    `UPDATE quiz_sessions SET status = 'active', start_time = NOW()
     WHERE id = $1 AND instructor_id = $2 AND status = 'draft' RETURNING *`,
    [id, instructorId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Session not found or already active');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}

export async function close(id, instructorId) {
  const result = await query(
    `UPDATE quiz_sessions SET status = 'closed', end_time = NOW()
     WHERE id = $1 AND instructor_id = $2 AND status = 'active' RETURNING *`,
    [id, instructorId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Session not found or not active');
    err.type = 'not_found';
    throw err;
  }

  // Auto-submit any in-progress attempts
  await query(
    `UPDATE attempts SET status = 'submitted', submitted_at = NOW()
     WHERE session_id = $1 AND status = 'in_progress'`,
    [id]
  );

  return result.rows[0];
}

export async function joinByCode(joinCode, studentId) {
  const result = await query(
    `SELECT id, title, description, duration_minutes, status FROM quiz_sessions WHERE join_code = $1`,
    [joinCode.toUpperCase()]
  );
  if (result.rows.length === 0) {
    const err = new Error('Invalid join code');
    err.type = 'not_found';
    throw err;
  }
  const session = result.rows[0];
  if (session.status !== 'active') {
    const err = new Error('This session is not currently active');
    err.type = 'validation';
    throw err;
  }
  return session;
}

export async function toggleResultsReleased(id, instructorId) {
  const result = await query(
    `UPDATE quiz_sessions SET results_released = NOT results_released
     WHERE id = $1 AND instructor_id = $2 RETURNING *`,
    [id, instructorId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Session not found');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}
