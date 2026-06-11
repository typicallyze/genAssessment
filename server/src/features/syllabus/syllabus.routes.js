import { Router } from 'express';
import * as syllabusController from './syllabus.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import upload from '../../middleware/upload.js';

const router = Router();

router.use(requireAuth, requireRole('instructor'));

router.post('/', upload.single('file'), syllabusController.create);
router.get('/', syllabusController.list);
router.get('/:id', syllabusController.getById);
router.post('/:id/generate', syllabusController.generate);
router.delete('/:id', syllabusController.remove);

export default router;
