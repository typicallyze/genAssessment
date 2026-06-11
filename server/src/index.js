import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './features/auth/auth.routes.js';
import syllabusRoutes from './features/syllabus/syllabus.routes.js';
import questionsRoutes from './features/questions/questions.routes.js';
import sessionsRoutes from './features/sessions/sessions.routes.js';
import attemptsRoutes from './features/attempts/attempts.routes.js';
import gradingRoutes from './features/grading/grading.routes.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

// Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/syllabi', syllabusRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/attempts', attemptsRoutes);
app.use('/api/grading', gradingRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`\n🚀 GenAssessment API running on http://localhost:${config.port}`);
  console.log(`📦 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Client URL: ${config.clientUrl}\n`);
});

export default app;
