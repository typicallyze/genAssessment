import { Router } from 'express';
import * as gradingController from './grading.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('instructor'));

router.post('/session/:sessionId', gradingController.batchGrade);
router.get('/session/:sessionId', gradingController.getSessionGrades);
router.put('/answer/:answerId/override', gradingController.overrideGrade);

export default router;
