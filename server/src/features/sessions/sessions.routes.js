import { Router } from 'express';
import * as sessionsController from './sessions.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Both roles can list and view sessions
router.get('/', sessionsController.list);
router.get('/:id', sessionsController.getById);

// Student join
router.post('/join', requireRole('student'), sessionsController.join);

// Instructor-only session management
router.post('/', requireRole('instructor'), sessionsController.create);
router.put('/:id', requireRole('instructor'), sessionsController.update);
router.post('/:id/questions', requireRole('instructor'), sessionsController.addQuestions);
router.delete('/:id/questions/:sqId', requireRole('instructor'), sessionsController.removeQuestion);
router.post('/:id/activate', requireRole('instructor'), sessionsController.activate);
router.post('/:id/close', requireRole('instructor'), sessionsController.close);
router.post('/:id/toggle-results', requireRole('instructor'), sessionsController.toggleResultsReleased);

export default router;
