import { query } from '../../config/db.js';
import { gradeAttemptAsync } from '../grading/grading.service.js';

export async function listStudentAttempts(studentId) {
  const result = await query(
    `SELECT a.*, qs.title as session_title, qs.id as session_id, qs.results_released,
      (SELECT COALESCE(SUM(sq.marks_allotted), 0) FROM session_questions sq WHERE sq.session_id = a.session_id) as total_possible
     FROM attempts a
     JOIN quiz_sessions qs ON qs.id = a.session_id
     WHERE a.student_id = $1
     ORDER BY a.started_at DESC`,
    [studentId]
  );
  return result.rows;
}

export async function startAttempt(sessionId, studentId) {
  // Check if student already has an attempt
  const existing = await query(
    'SELECT * FROM attempts WHERE session_id = $1 AND student_id = $2',
    [sessionId, studentId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0]; // Return existing attempt
  }

  // Verify session is active
  const session = await query('SELECT * FROM quiz_sessions WHERE id = $1 AND status = $2', [sessionId, 'active']);
  if (session.rows.length === 0) {
    const err = new Error('Session not active');
    err.type = 'validation';
    throw err;
  }

  const result = await query(
    'INSERT INTO attempts (session_id, student_id) VALUES ($1, $2) RETURNING *',
    [sessionId, studentId]
  );
  return result.rows[0];
}

export async function getAttempt(attemptId, userId, role) {
  let result;
  if (role === 'student') {
    result = await query(
      `SELECT a.*, qs.title as session_title, qs.duration_minutes, qs.results_released
       FROM attempts a JOIN quiz_sessions qs ON qs.id = a.session_id
       WHERE a.id = $1 AND a.student_id = $2`,
      [attemptId, userId]
    );
  } else {
    result = await query(
      `SELECT a.*, qs.title as session_title, qs.duration_minutes, qs.results_released, u.name as student_name, u.email as student_email
       FROM attempts a
       JOIN quiz_sessions qs ON qs.id = a.session_id
       JOIN users u ON u.id = a.student_id
       WHERE a.id = $1 AND qs.instructor_id = $2`,
      [attemptId, userId]
    );
  }

  if (result.rows.length === 0) {
    const err = new Error('Attempt not found');
    err.type = 'not_found';
    throw err;
  }

  const attempt = result.rows[0];

  // If student is viewing a submitted/graded attempt, check if results are released
  if (role === 'student' && attempt.status !== 'in_progress' && !attempt.results_released) {
    const err = new Error('Results have not been released yet. Please check back later.');
    err.type = 'validation';
    throw err;
  }

  // Get answers with question details
  const answers = await query(
    `SELECT aa.*, sq.marks_allotted, sq.display_order,
      q.question_text, q.type, q.topic,
      qo_selected.option_text as selected_option_text,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', qo.id, 'option_text', qo.option_text, 'is_correct', qo.is_correct, 'display_order', qo.display_order)) FILTER (WHERE qo.id IS NOT NULL), '[]') as options,
      (SELECT json_agg(jsonb_build_object('id', ag.id, 'ai_score', ag.ai_score, 'ai_justification', ag.ai_justification, 'rubric_breakdown', ag.rubric_breakdown)) FROM ai_gradings ag WHERE ag.answer_id = aa.id) as ai_gradings
     FROM attempt_answers aa
     JOIN session_questions sq ON sq.id = aa.session_question_id
     JOIN questions q ON q.id = sq.question_id
     LEFT JOIN question_options qo ON qo.question_id = q.id
     LEFT JOIN question_options qo_selected ON qo_selected.id = aa.selected_option_id
     WHERE aa.attempt_id = $1
     GROUP BY aa.id, sq.marks_allotted, sq.display_order, q.question_text, q.type, q.topic, qo_selected.option_text
     ORDER BY sq.display_order`,
    [attemptId]
  );

  attempt.answers = answers.rows;
  return attempt;
}

export async function saveAnswers(attemptId, studentId, answers) {
  // Verify attempt belongs to student and is in progress
  const attempt = await query(
    'SELECT * FROM attempts WHERE id = $1 AND student_id = $2 AND status = $3',
    [attemptId, studentId, 'in_progress']
  );
  if (attempt.rows.length === 0) {
    const err = new Error('Attempt not found or already submitted');
    err.type = 'validation';
    throw err;
  }

  for (const ans of answers) {
    await query(
      `INSERT INTO attempt_answers (attempt_id, session_question_id, selected_option_id, subjective_answer)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (attempt_id, session_question_id)
       DO UPDATE SET selected_option_id = COALESCE($3, attempt_answers.selected_option_id),
                     subjective_answer = COALESCE($4, attempt_answers.subjective_answer)`,
      [attemptId, ans.session_question_id, ans.selected_option_id || null, ans.subjective_answer || null]
    );
  }

  return { saved: answers.length };
}

export async function submit(attemptId, studentId) {
  // Verify attempt is in progress
  const attempt = await query(
    `SELECT a.*, qs.duration_minutes, qs.status as session_status
     FROM attempts a JOIN quiz_sessions qs ON qs.id = a.session_id
     WHERE a.id = $1 AND a.student_id = $2 AND a.status = 'in_progress'`,
    [attemptId, studentId]
  );
  if (attempt.rows.length === 0) {
    const err = new Error('Attempt not found or already submitted');
    err.type = 'validation';
    throw err;
  }

  const attemptData = attempt.rows[0];

  // Check if time has expired (with 60s grace period)
  const startedAt = new Date(attemptData.started_at);
  const maxTime = attemptData.duration_minutes * 60 * 1000 + 60000;
  if (Date.now() - startedAt.getTime() > maxTime) {
    console.warn(`Late submission detected for attempt ${attemptId}`);
  }

  // Auto-grade MCQ questions
  const mcqAnswers = await query(
    `SELECT aa.id, aa.selected_option_id, sq.marks_allotted, q.type
     FROM attempt_answers aa
     JOIN session_questions sq ON sq.id = aa.session_question_id
     JOIN questions q ON q.id = sq.question_id
     WHERE aa.attempt_id = $1 AND q.type = 'mcq'`,
    [attemptId]
  );

  let totalScore = 0;
  for (const ans of mcqAnswers.rows) {
    let marks = 0;
    if (ans.selected_option_id) {
      const correct = await query(
        'SELECT is_correct FROM question_options WHERE id = $1',
        [ans.selected_option_id]
      );
      if (correct.rows.length > 0 && correct.rows[0].is_correct) {
        marks = ans.marks_allotted;
      }
    }
    await query('UPDATE attempt_answers SET marks_awarded = $1 WHERE id = $2', [marks, ans.id]);
    totalScore += marks;
  }

  // Mark as submitted
  const hasSubjective = await query(
    `SELECT COUNT(*) as cnt FROM attempt_answers aa
     JOIN session_questions sq ON sq.id = aa.session_question_id
     JOIN questions q ON q.id = sq.question_id
     WHERE aa.attempt_id = $1 AND q.type = 'subjective'`,
    [attemptId]
  );

  const subjectiveCount = parseInt(hasSubjective.rows[0].cnt);
  const status = subjectiveCount > 0 ? 'submitted' : 'graded';

  const updated = await query(
    'UPDATE attempts SET status = $1, submitted_at = NOW(), total_score = $2 WHERE id = $3 RETURNING *',
    [status, totalScore, attemptId]
  );

  // Fire-and-forget: trigger async AI grading for subjective answers
  if (subjectiveCount > 0) {
    console.log(`[Submit] Triggering async AI grading for attempt ${attemptId} (${subjectiveCount} subjective answer(s))`);
    gradeAttemptAsync(attemptId).catch((err) => {
      console.error(`[Submit] Async grading failed for attempt ${attemptId}:`, err.message);
    });
  }

  return updated.rows[0];
}
