import { query } from '../../config/db.js';

export async function list(instructorId, filters = {}) {
  let sql = `
    SELECT q.*, 
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', qo.id, 'option_text', qo.option_text, 'is_correct', qo.is_correct, 'display_order', qo.display_order)) FILTER (WHERE qo.id IS NOT NULL), '[]') as options,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', qr.id, 'criterion', qr.criterion, 'max_marks', qr.max_marks, 'description', qr.description)) FILTER (WHERE qr.id IS NOT NULL), '[]') as rubrics
    FROM questions q
    LEFT JOIN question_options qo ON qo.question_id = q.id
    LEFT JOIN question_rubrics qr ON qr.question_id = q.id
    WHERE q.instructor_id = $1 AND q.is_active = true
  `;
  const params = [instructorId];
  let paramIdx = 2;

  if (filters.syllabusId) {
    sql += ` AND q.syllabus_id = $${paramIdx}`;
    params.push(filters.syllabusId);
    paramIdx++;
  }
  if (filters.type) {
    sql += ` AND q.type = $${paramIdx}`;
    params.push(filters.type);
    paramIdx++;
  }
  if (filters.topic) {
    sql += ` AND q.topic ILIKE $${paramIdx}`;
    params.push(`%${filters.topic}%`);
    paramIdx++;
  }
  if (filters.difficulty) {
    sql += ` AND q.difficulty = $${paramIdx}`;
    params.push(filters.difficulty);
    paramIdx++;
  }

  sql += ' GROUP BY q.id ORDER BY q.created_at DESC';

  const result = await query(sql, params);
  return result.rows;
}

export async function getById(id, instructorId) {
  const result = await query(
    `SELECT q.*,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', qo.id, 'option_text', qo.option_text, 'is_correct', qo.is_correct, 'display_order', qo.display_order)) FILTER (WHERE qo.id IS NOT NULL), '[]') as options,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', qr.id, 'criterion', qr.criterion, 'max_marks', qr.max_marks, 'description', qr.description)) FILTER (WHERE qr.id IS NOT NULL), '[]') as rubrics
     FROM questions q
     LEFT JOIN question_options qo ON qo.question_id = q.id
     LEFT JOIN question_rubrics qr ON qr.question_id = q.id
     WHERE q.id = $1 AND q.instructor_id = $2
     GROUP BY q.id`,
    [id, instructorId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Question not found');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}

export async function update(id, instructorId, data) {
  const { question_text, difficulty, topic, default_marks, options, rubrics } = data;

  // Update the question itself
  await query(
    `UPDATE questions SET question_text = COALESCE($1, question_text), difficulty = COALESCE($2, difficulty),
     topic = COALESCE($3, topic), default_marks = COALESCE($4, default_marks), updated_at = NOW()
     WHERE id = $5 AND instructor_id = $6`,
    [question_text, difficulty, topic, default_marks, id, instructorId]
  );

  // Replace options if provided
  if (options) {
    await query('DELETE FROM question_options WHERE question_id = $1', [id]);
    for (let i = 0; i < options.length; i++) {
      await query(
        'INSERT INTO question_options (question_id, option_text, is_correct, display_order) VALUES ($1, $2, $3, $4)',
        [id, options[i].option_text, options[i].is_correct, i]
      );
    }
  }

  // Replace rubrics if provided
  if (rubrics) {
    await query('DELETE FROM question_rubrics WHERE question_id = $1', [id]);
    for (const r of rubrics) {
      await query(
        'INSERT INTO question_rubrics (question_id, criterion, max_marks, description) VALUES ($1, $2, $3, $4)',
        [id, r.criterion, r.max_marks, r.description || '']
      );
    }
  }

  return getById(id, instructorId);
}

export async function remove(id, instructorId) {
  const result = await query(
    'UPDATE questions SET is_active = false, updated_at = NOW() WHERE id = $1 AND instructor_id = $2 RETURNING id',
    [id, instructorId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Question not found');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}
