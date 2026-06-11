import * as syllabusService from './syllabus.service.js';

export async function create(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required (.docx or .txt)' });
    }
    const title = req.body.title || req.file.originalname;
    const syllabus = await syllabusService.create({
      instructorId: req.user.id,
      title,
      filePath: req.file.path,
      mimetype: req.file.mimetype,
    });
    res.status(201).json({ syllabus });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const syllabi = await syllabusService.list(req.user.id);
    res.json({ syllabi });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const syllabus = await syllabusService.getById(req.params.id, req.user.id);
    res.json({ syllabus });
  } catch (err) {
    next(err);
  }
}

export async function generate(req, res, next) {
  try {
    const { mcqCount, subjectiveCount } = req.body;
    const questions = await syllabusService.generate(req.params.id, req.user.id, {
      mcqCount: mcqCount || 5,
      subjectiveCount: subjectiveCount || 3,
    });
    res.json({ message: 'Questions generated successfully', questions });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await syllabusService.remove(req.params.id, req.user.id);
    res.json({ message: 'Syllabus deleted' });
  } catch (err) {
    next(err);
  }
}
