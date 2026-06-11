import * as sessionsService from './sessions.service.js';

export async function create(req, res, next) {
  try {
    const session = await sessionsService.create(req.user.id, req.body);
    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const sessions = await sessionsService.list(req.user.id, req.user.role);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const session = await sessionsService.getById(req.params.id, req.user.id, req.user.role);
    const questions = await sessionsService.getSessionQuestions(req.params.id);
    // Strip correct answers for students
    if (req.user.role === 'student') {
      questions.forEach((q) => {
        if (q.options) {
          q.options = q.options.map(({ id, option_text, display_order }) => ({ id, option_text, display_order }));
        }
        delete q.rubrics;
      });
    }
    res.json({ session, questions });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const session = await sessionsService.update(req.params.id, req.user.id, req.body);
    res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function addQuestions(req, res, next) {
  try {
    const { questionIds, marksAllotted } = req.body;
    if (!questionIds || !Array.isArray(questionIds)) {
      return res.status(400).json({ error: 'questionIds array is required' });
    }
    const added = await sessionsService.addQuestions(req.params.id, req.user.id, questionIds, marksAllotted);
    res.json({ added });
  } catch (err) {
    next(err);
  }
}

export async function removeQuestion(req, res, next) {
  try {
    await sessionsService.removeQuestion(req.params.id, req.params.sqId, req.user.id);
    res.json({ message: 'Question removed from session' });
  } catch (err) {
    next(err);
  }
}

export async function activate(req, res, next) {
  try {
    const session = await sessionsService.activate(req.params.id, req.user.id);
    res.json({ message: 'Session activated', session });
  } catch (err) {
    next(err);
  }
}

export async function close(req, res, next) {
  try {
    const session = await sessionsService.close(req.params.id, req.user.id);
    res.json({ message: 'Session closed', session });
  } catch (err) {
    next(err);
  }
}

export async function join(req, res, next) {
  try {
    const { joinCode } = req.body;
    if (!joinCode) {
      return res.status(400).json({ error: 'Join code is required' });
    }
    const session = await sessionsService.joinByCode(joinCode, req.user.id);
    res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function toggleResultsReleased(req, res, next) {
  try {
    const session = await sessionsService.toggleResultsReleased(req.params.id, req.user.id);
    res.json({ message: session.results_released ? 'Results released to students' : 'Results hidden from students', session });
  } catch (err) {
    next(err);
  }
}
