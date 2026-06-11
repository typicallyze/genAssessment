import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import { showToast } from '../store/toastSlice';

export default function QuizTakingPage() {
  const { sessionId, attemptId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const autoSaveRef = useRef(null);

  // Load questions and attempt
  useEffect(() => {
    Promise.all([
      api.get(`/sessions/${sessionId}`),
      api.get(`/attempts/${attemptId}`),
    ]).then(([sessionRes, attemptRes]) => {
      const qs = sessionRes.data.questions;
      setQuestions(qs);
      setAttempt(attemptRes.data.attempt);

      // Pre-fill existing answers
      const existing = {};
      if (attemptRes.data.attempt.answers) {
        attemptRes.data.attempt.answers.forEach((a) => {
          existing[a.session_question_id] = {
            session_question_id: a.session_question_id,
            selected_option_id: a.selected_option_id,
            subjective_answer: a.subjective_answer,
          };
        });
      }
      setAnswers(existing);

      // Calculate remaining time
      const startedAt = new Date(attemptRes.data.attempt.started_at);
      const durationMs = attemptRes.data.attempt.duration_minutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((startedAt.getTime() + durationMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      setLoading(false);
    });
  }, [sessionId, attemptId]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      saveAnswers();
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [answers]);

  const saveAnswers = useCallback(async () => {
    const ansArr = Object.values(answers).filter((a) => a.selected_option_id || a.subjective_answer);
    if (ansArr.length === 0) return;
    try {
      await api.put(`/attempts/${attemptId}/answers`, { answers: ansArr });
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }, [answers, attemptId]);

  const handleAnswer = (sqId, data) => {
    setAnswers((prev) => ({ ...prev, [sqId]: { session_question_id: sqId, ...prev[sqId], ...data } }));
  };

  const handleSubmit = async (auto = false) => {
    setSubmitting(true);
    try {
      // Save answers first
      const ansArr = Object.values(answers).filter((a) => a.selected_option_id || a.subjective_answer);
      if (ansArr.length > 0) {
        await api.put(`/attempts/${attemptId}/answers`, { answers: ansArr });
      }
      await api.post(`/attempts/${attemptId}/submit`);
      dispatch(showToast('success', auto ? 'Time expired — quiz auto-submitted' : 'Quiz submitted!'));
      navigate(`/results/${attemptId}`);
    } catch (err) {
      dispatch(showToast('error', 'Failed to submit'));
      setSubmitting(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <LoadingSkeleton type="spinner" />;

  const q = questions[currentQ];
  const answeredCount = Object.values(answers).filter((a) => a.selected_option_id || a.subjective_answer).length;
  const timerClass = timeLeft < 60 ? 'danger' : timeLeft < 300 ? 'warning' : '';

  return (
    <div className="fade-in">
      <div className="quiz-container">
        <div className="quiz-main">
          {q && (
            <div className="question-card slide-up" key={q.session_question_id}>
              <div className="question-header">
                <span className="question-number">Question {currentQ + 1} of {questions.length}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge badge-${q.type}`}>{q.type}</span>
                  <span className="question-marks">{q.marks_allotted} marks</span>
                </div>
              </div>
              <p className="question-text">{q.question_text}</p>

              {q.type === 'mcq' && q.options && (
                <div className="options-list">
                  {q.options.sort((a, b) => a.display_order - b.display_order).map((opt) => (
                    <div
                      key={opt.id}
                      className={`option-item ${answers[q.session_question_id]?.selected_option_id === opt.id ? 'selected' : ''}`}
                      onClick={() => handleAnswer(q.session_question_id, { selected_option_id: opt.id })}
                    >
                      <div className="option-radio"></div>
                      <span className="option-text">{opt.option_text}</span>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'subjective' && (
                <div>
                  <textarea
                    className="input"
                    rows={6}
                    placeholder="Write your answer here..."
                    value={answers[q.session_question_id]?.subjective_answer || ''}
                    onChange={(e) => handleAnswer(q.session_question_id, { subjective_answer: e.target.value })}
                  />
                  <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {(answers[q.session_question_id]?.subjective_answer || '').length} characters
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button className="btn btn-secondary" disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)}>
                  ← Previous
                </button>
                {currentQ < questions.length - 1 ? (
                  <button className="btn btn-primary" onClick={() => setCurrentQ(currentQ + 1)}>
                    Next →
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => setShowConfirm(true)}>
                    📤 Submit Quiz
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="quiz-sidebar">
          <div className={`quiz-timer ${timerClass}`}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>TIME LEFT</div>
            <div className="time-display">{formatTime(timeLeft || 0)}</div>
          </div>

          <div className="quiz-nav">
            <div className="quiz-nav-title">Questions ({answeredCount}/{questions.length} answered)</div>
            <div className="quiz-nav-grid">
              {questions.map((q, i) => (
                <button
                  key={q.session_question_id}
                  className={`quiz-nav-btn ${i === currentQ ? 'current' : ''} ${
                    answers[q.session_question_id]?.selected_option_id || answers[q.session_question_id]?.subjective_answer ? 'answered' : ''
                  }`}
                  onClick={() => setCurrentQ(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            onClick={() => setShowConfirm(true)}
          >
            📤 Submit Quiz
          </button>
        </div>
      </div>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Submit Quiz?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Go Back</button>
            <button className="btn btn-primary" onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? <span className="spinner"></span> : null} Confirm Submit
            </button>
          </>
        }
      >
        <p>You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.</p>
        {answeredCount < questions.length && (
          <p style={{ color: 'var(--color-warning)', fontSize: '14px', marginTop: '8px' }}>
            ⚠ You have {questions.length - answeredCount} unanswered question(s).
          </p>
        )}
        <p style={{ marginTop: '12px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Once submitted, you cannot change your answers.
        </p>
      </Modal>
    </div>
  );
}
