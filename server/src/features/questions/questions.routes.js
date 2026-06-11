import { Router } from 'express';
import * as questionsController from './questions.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('instructor'));

router.get('/', questionsController.list);
router.get('/:id', questionsController.getById);
router.put('/:id', questionsController.update);
router.delete('/:id', questionsController.remove);

export default router;
