import * as questionsService from './questions.service.js';

export async function list(req, res, next) {
  try {
    const questions = await questionsService.list(req.user.id, {
      syllabusId: req.query.syllabusId,
      type: req.query.type,
      topic: req.query.topic,
      difficulty: req.query.difficulty ? parseInt(req.query.difficulty) : undefined,
    });
    res.json({ questions });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const question = await questionsService.getById(req.params.id, req.user.id);
    res.json({ question });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const question = await questionsService.update(req.params.id, req.user.id, req.body);
    res.json({ question });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await questionsService.remove(req.params.id, req.user.id);
    res.json({ message: 'Question removed' });
  } catch (err) {
    next(err);
  }
}
