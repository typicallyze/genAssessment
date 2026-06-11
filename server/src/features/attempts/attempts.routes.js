import { Router } from 'express';
import * as attemptsController from './attempts.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', attemptsController.start);
router.get('/mine', attemptsController.listMine);
router.get('/:id', attemptsController.getById);
router.put('/:id/answers', attemptsController.saveAnswers);
router.post('/:id/submit', attemptsController.submit);

export default router;
