import * as gradingService from './grading.service.js';

export async function batchGrade(req, res, next) {
  try {
    const result = await gradingService.batchGrade(req.params.sessionId, req.user.id);
    res.json({ message: 'Grading complete', ...result });
  } catch (err) {
    next(err);
  }
}

export async function getSessionGrades(req, res, next) {
  try {
    const data = await gradingService.getSessionGrades(req.params.sessionId, req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function overrideGrade(req, res, next) {
  try {
    const { newScore } = req.body;
    if (newScore === undefined || newScore === null) {
      return res.status(400).json({ error: 'newScore is required' });
    }
    const result = await gradingService.overrideGrade(req.params.answerId, req.user.id, newScore);
    res.json({ message: 'Grade overridden', ...result });
  } catch (err) {
    next(err);
  }
}
