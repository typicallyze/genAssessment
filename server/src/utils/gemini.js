import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/env.js';

let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return model;
}

async function callGeminiWithRetry(prompt, maxRetries = 6) {
  const m = getModel();
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await m.generateContent(prompt);
      const text = result.response.text();
      return text;
    } catch (err) {
      const errMsg = err.message || '';
      // API key invalid — reset cached model so updated key is picked up
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        model = null;
        genAI = null;
        const error = new Error('Invalid Gemini API key. Please update GEMINI_API_KEY in your .env file with a valid key from https://aistudio.google.com/apikey');
        error.type = 'validation';
        throw error;
      }
      if ((err.status === 429 || err.status === 503) && attempt < maxRetries - 1) {
        // Longer backoff: 3s, 6s, 12s, 24s, 48s
        const delay = Math.pow(2, attempt) * 3000;
        console.warn(`Gemini ${err.status} error. Retry ${attempt + 1}/${maxRetries - 1} in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      // Generic Gemini error
      console.error('Gemini API error:', errMsg);
      const error = new Error(`AI generation failed: ${errMsg.substring(0, 200)}`);
      error.type = 'validation';
      throw error;
    }
  }
}

function extractJSON(text) {
  // Try to extract JSON from markdown code blocks or raw text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(raw);
}

export async function generateQuestions(syllabusText, options = {}) {
  const { mcqCount = 5, subjectiveCount = 3 } = options;
  const totalCount = mcqCount + subjectiveCount;

  const prompt = `You are an expert educator and assessment designer. Given the following syllabus content, generate exactly ${totalCount} quiz questions: ${mcqCount} multiple-choice questions (MCQ) and ${subjectiveCount} subjective/open-ended questions.

Return ONLY a valid JSON array (no explanation, no markdown) where each item has this exact structure:

For MCQ:
{
  "type": "mcq",
  "question_text": "The question",
  "difficulty": 3,
  "topic": "Extracted topic from syllabus",
  "default_marks": 1,
  "options": [
    { "text": "Option A", "is_correct": false },
    { "text": "Option B", "is_correct": true },
    { "text": "Option C", "is_correct": false },
    { "text": "Option D", "is_correct": false }
  ]
}

For Subjective:
{
  "type": "subjective",
  "question_text": "The question",
  "difficulty": 3,
  "topic": "Extracted topic from syllabus",
  "default_marks": 5,
  "rubric": [
    { "criterion": "Understanding", "max_marks": 2, "description": "Shows clear understanding of the concept" },
    { "criterion": "Application", "max_marks": 3, "description": "Applies concepts correctly" }
  ]
}

Rules:
- difficulty is 1 (easy) to 5 (hard)
- Each MCQ must have exactly 4 options with exactly 1 correct answer
- Subjective rubric marks must sum to default_marks
- Questions should cover different topics from the syllabus
- Make questions pedagogically sound and clear

Syllabus content:
${syllabusText.substring(0, 15000)}`;

  const response = await callGeminiWithRetry(prompt);
  return extractJSON(response);
}

export async function gradeSubjectiveAnswer(questionText, rubrics, studentAnswer, maxMarks) {
  const rubricStr = rubrics.map((r) => `- ${r.criterion} (max ${r.max_marks} marks): ${r.description}`).join('\n');

  const prompt = `You are a fair, thorough, and consistent grader. Grade the following student answer strictly according to the rubric.

Question: ${questionText}

Rubric criteria:
${rubricStr}

Total maximum marks: ${maxMarks}
Student's answer: ${studentAnswer}

Return ONLY valid JSON (no explanation, no markdown) with this exact structure:
{
  "score": <number between 0 and ${maxMarks}>,
  "justification": "<2-4 sentence overall explanation of the grade>",
  "rubric_breakdown": [
    { "criterion": "<name>", "marks": <awarded>, "max_marks": <max>, "comment": "<brief explanation>" }
  ]
}

Rules:
- Be fair but rigorous
- Each rubric criterion mark must not exceed its max_marks
- Total score must equal the sum of rubric_breakdown marks
- Provide specific, actionable feedback in justification`;

  const response = await callGeminiWithRetry(prompt);
  return extractJSON(response);
}
