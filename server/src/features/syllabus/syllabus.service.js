import { query } from '../../config/db.js';
import { extractText } from '../../utils/textExtractor.js';
import { generateQuestions } from '../../utils/gemini.js';

export async function create({ instructorId, title, filePath, mimetype }) {
  const rawText = await extractText(filePath, mimetype);

  const result = await query(
    'INSERT INTO syllabi (instructor_id, title, raw_text, file_url) VALUES ($1, $2, $3, $4) RETURNING *',
    [instructorId, title, rawText, filePath]
  );
  return result.rows[0];
}

export async function list(instructorId) {
  const result = await query(
    `SELECT s.*, 
      (SELECT COUNT(*) FROM questions q WHERE q.syllabus_id = s.id AND q.is_active = true) as question_count
     FROM syllabi s WHERE s.instructor_id = $1 ORDER BY s.created_at DESC`,
    [instructorId]
  );
  return result.rows;
}

export async function getById(id, instructorId) {
  const result = await query('SELECT * FROM syllabi WHERE id = $1 AND instructor_id = $2', [id, instructorId]);
  if (result.rows.length === 0) {
    const err = new Error('Syllabus not found');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}

export async function generate(syllabusId, instructorId, options = {}) {
  const syllabus = await getById(syllabusId, instructorId);

  if (!syllabus.raw_text) {
    const err = new Error('Syllabus has no extracted text');
    err.type = 'validation';
    throw err;
  }

  const questions = await generateQuestions(syllabus.raw_text, options);

  const createdQuestions = [];

  for (const q of questions) {
    const qResult = await query(
      `INSERT INTO questions (syllabus_id, instructor_id, type, question_text, difficulty, topic, default_marks)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [syllabusId, instructorId, q.type, q.question_text, Math.round(Number(q.difficulty) || 3), q.topic || 'General', Math.round(Number(q.default_marks) || 1)]
    );
    const question = qResult.rows[0];

    if (q.type === 'mcq' && q.options) {
      for (let i = 0; i < q.options.length; i++) {
        await query(
          'INSERT INTO question_options (question_id, option_text, is_correct, display_order) VALUES ($1, $2, $3, $4)',
          [question.id, q.options[i].text, q.options[i].is_correct, i]
        );
      }
    }

    if (q.type === 'subjective' && q.rubric) {
      for (const r of q.rubric) {
        await query(
          'INSERT INTO question_rubrics (question_id, criterion, max_marks, description) VALUES ($1, $2, $3, $4)',
          [question.id, r.criterion, Math.round(Number(r.max_marks) || 1), r.description || '']
        );
      }
    }

    createdQuestions.push(question);
  }

  return createdQuestions;
}

export async function remove(id, instructorId) {
  const result = await query('DELETE FROM syllabi WHERE id = $1 AND instructor_id = $2 RETURNING id', [id, instructorId]);
  if (result.rows.length === 0) {
    const err = new Error('Syllabus not found');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}
