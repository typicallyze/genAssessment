import { query } from '../../config/db.js';
import { gradeSubjectiveAnswer } from '../../utils/gemini.js';

export async function batchGrade(sessionId, instructorId) {
  // Verify instructor owns the session
  const session = await query(
    'SELECT id FROM quiz_sessions WHERE id = $1 AND instructor_id = $2',
    [sessionId, instructorId]
  );
  if (session.rows.length === 0) {
    const err = new Error('Session not found');
    err.type = 'not_found';
    throw err;
  }

  // Get all ungraded subjective answers for this session
  const ungraded = await query(
    `SELECT aa.id as answer_id, aa.subjective_answer, sq.marks_allotted,
      q.question_text, q.id as question_id,
      a.id as attempt_id
     FROM attempt_answers aa
     JOIN session_questions sq ON sq.id = aa.session_question_id
     JOIN questions q ON q.id = sq.question_id
     JOIN attempts a ON a.id = aa.attempt_id
     WHERE a.session_id = $1 AND q.type = 'subjective'
       AND aa.subjective_answer IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM ai_gradings ag WHERE ag.answer_id = aa.id)`,
    [sessionId]
  );

  const results = [];

  for (const answer of ungraded.rows) {
    try {
      // Get rubrics for this question
      const rubrics = await query(
        'SELECT criterion, max_marks, description FROM question_rubrics WHERE question_id = $1',
        [answer.question_id]
      );

      const grading = await gradeSubjectiveAnswer(
        answer.question_text,
        rubrics.rows,
        answer.subjective_answer,
        answer.marks_allotted
      );

      // Insert AI grading
      await query(
        `INSERT INTO ai_gradings (answer_id, ai_score, ai_justification, rubric_breakdown)
         VALUES ($1, $2, $3, $4)`,
        [answer.answer_id, grading.score, grading.justification, JSON.stringify(grading.rubric_breakdown)]
      );

      // Update answer marks
      await query(
        'UPDATE attempt_answers SET marks_awarded = $1 WHERE id = $2',
        [grading.score, answer.answer_id]
      );

      results.push({ answerId: answer.answer_id, score: grading.score, status: 'graded' });

      // Rate limit: pause 2 seconds between API calls
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`Failed to grade answer ${answer.answer_id}:`, err.message);
      results.push({ answerId: answer.answer_id, status: 'error', error: err.message });
    }
  }

  // Recalculate total scores for all attempts in this session
  await recalculateSessionScores(sessionId);

  return { total: ungraded.rows.length, results };
}

async function recalculateAttemptScore(attemptId) {
  const scoreResult = await query(
    'SELECT COALESCE(SUM(marks_awarded), 0) as total FROM attempt_answers WHERE attempt_id = $1',
    [attemptId]
  );

  const allGraded = await query(
    `SELECT COUNT(*) as ungraded FROM attempt_answers aa
     JOIN session_questions sq ON sq.id = aa.session_question_id
     JOIN questions q ON q.id = sq.question_id
     WHERE aa.attempt_id = $1 AND q.type = 'subjective' AND aa.marks_awarded IS NULL`,
    [attemptId]
  );

  const status = parseInt(allGraded.rows[0].ungraded) === 0 ? 'graded' : 'submitted';

  await query(
    'UPDATE attempts SET total_score = $1, status = $2 WHERE id = $3',
    [scoreResult.rows[0].total, status, attemptId]
  );
}

async function recalculateSessionScores(sessionId) {
  const attempts = await query('SELECT id FROM attempts WHERE session_id = $1', [sessionId]);

  for (const attempt of attempts.rows) {
    await recalculateAttemptScore(attempt.id);
  }
}

/**
 * Grades a single attempt's subjective answers asynchronously.
 * Fire-and-forget — errors are logged but don't propagate.
 * Rate-limited with 5-second delays between Gemini API calls.
 */
export async function gradeAttemptAsync(attemptId) {
  try {
    // Get ungraded subjective answers for this specific attempt
    const ungraded = await query(
      `SELECT aa.id as answer_id, aa.subjective_answer, sq.marks_allotted,
        q.question_text, q.id as question_id
       FROM attempt_answers aa
       JOIN session_questions sq ON sq.id = aa.session_question_id
       JOIN questions q ON q.id = sq.question_id
       WHERE aa.attempt_id = $1 AND q.type = 'subjective'
         AND aa.subjective_answer IS NOT NULL AND aa.subjective_answer != ''
         AND NOT EXISTS (SELECT 1 FROM ai_gradings ag WHERE ag.answer_id = aa.id)`,
      [attemptId]
    );

    if (ungraded.rows.length === 0) {
      console.log(`[Grading] No subjective answers to grade for attempt ${attemptId}`);
      return;
    }

    console.log(`[Grading] Starting async grading of ${ungraded.rows.length} subjective answer(s) for attempt ${attemptId}`);

    for (let i = 0; i < ungraded.rows.length; i++) {
      const answer = ungraded.rows[i];

      // Wait 5 seconds between Gemini calls to respect free-tier rate limits
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 5000));
      }

      try {
        const rubrics = await query(
          'SELECT criterion, max_marks, description FROM question_rubrics WHERE question_id = $1',
          [answer.question_id]
        );

        const grading = await gradeSubjectiveAnswer(
          answer.question_text,
          rubrics.rows,
          answer.subjective_answer,
          answer.marks_allotted
        );

        // Insert AI grading record
        await query(
          `INSERT INTO ai_gradings (answer_id, ai_score, ai_justification, rubric_breakdown)
           VALUES ($1, $2, $3, $4)`,
          [answer.answer_id, Math.round(Number(grading.score)), grading.justification, JSON.stringify(grading.rubric_breakdown)]
        );

        // Update answer marks
        await query(
          'UPDATE attempt_answers SET marks_awarded = $1 WHERE id = $2',
          [Math.round(Number(grading.score)), answer.answer_id]
        );

        console.log(`[Grading] ✅ Answer ${answer.answer_id} graded: ${grading.score}/${answer.marks_allotted}`);
      } catch (err) {
        console.error(`[Grading] ❌ Failed to grade answer ${answer.answer_id}:`, err.message);
        // Continue grading other answers even if one fails
      }
    }

    // Recalculate attempt total score after grading all answers
    await recalculateAttemptScore(attemptId);
    console.log(`[Grading] ✅ Attempt ${attemptId} grading complete`);
  } catch (err) {
    console.error(`[Grading] Fatal error grading attempt ${attemptId}:`, err.message);
  }
}

export async function getSessionGrades(sessionId, instructorId) {
  const session = await query(
    'SELECT id, title FROM quiz_sessions WHERE id = $1 AND instructor_id = $2',
    [sessionId, instructorId]
  );
  if (session.rows.length === 0) {
    const err = new Error('Session not found');
    err.type = 'not_found';
    throw err;
  }

  const attempts = await query(
    `SELECT a.*, u.name as student_name, u.email as student_email,
      (SELECT COALESCE(SUM(sq.marks_allotted), 0) FROM session_questions sq WHERE sq.session_id = a.session_id) as total_possible
     FROM attempts a
     JOIN users u ON u.id = a.student_id
     WHERE a.session_id = $1
     ORDER BY u.name`,
    [sessionId]
  );

  return { session: session.rows[0], attempts: attempts.rows };
}

export async function overrideGrade(answerId, instructorId, newScore) {
  // Verify the answer belongs to a session owned by this instructor
  const check = await query(
    `SELECT aa.id, a.id as attempt_id FROM attempt_answers aa
     JOIN attempts a ON a.id = aa.attempt_id
     JOIN quiz_sessions qs ON qs.id = a.session_id
     WHERE aa.id = $1 AND qs.instructor_id = $2`,
    [answerId, instructorId]
  );
  if (check.rows.length === 0) {
    const err = new Error('Answer not found');
    err.type = 'not_found';
    throw err;
  }

  await query(
    'UPDATE attempt_answers SET marks_awarded = $1, is_manually_overridden = true WHERE id = $2',
    [newScore, answerId]
  );

  // Recalculate attempt total
  const attemptId = check.rows[0].attempt_id;
  const scoreResult = await query(
    'SELECT COALESCE(SUM(marks_awarded), 0) as total FROM attempt_answers WHERE attempt_id = $1',
    [attemptId]
  );
  await query('UPDATE attempts SET total_score = $1 WHERE id = $2', [scoreResult.rows[0].total, attemptId]);

  return { answerId, newScore: parseFloat(newScore) };
}
