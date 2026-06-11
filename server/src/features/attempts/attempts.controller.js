import * as attemptsService from './attempts.service.js';

export async function start(req, res, next) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    const attempt = await attemptsService.startAttempt(sessionId, req.user.id);
    res.status(201).json({ attempt });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req, res, next) {
  try {
    const attempts = await attemptsService.listStudentAttempts(req.user.id);
    res.json({ attempts });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const attempt = await attemptsService.getAttempt(req.params.id, req.user.id, req.user.role);
    res.json({ attempt });
  } catch (err) {
    next(err);
  }
}

export async function saveAnswers(req, res, next) {
  try {
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers array is required' });
    }
    const result = await attemptsService.saveAnswers(req.params.id, req.user.id, answers);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function submit(req, res, next) {
  try {
    const attempt = await attemptsService.submit(req.params.id, req.user.id);
    res.json({ message: 'Quiz submitted', attempt });
  } catch (err) {
    next(err);
  }
}
