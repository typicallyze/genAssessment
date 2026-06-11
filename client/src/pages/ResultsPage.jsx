import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { 
  Clock, 
  Check, 
  X, 
  Circle, 
  Sparkles 
} from 'lucide-react';

export default function ResultsPage() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/attempts/${attemptId}`).then((res) => {
      setAttempt(res.data.attempt);
      setLoading(false);
    }).catch((err) => {
      setError(err.response?.data?.error || 'Could not load results');
      setLoading(false);
    });
  }, [attemptId]);

  if (loading) return <LoadingSkeleton type="spinner" />;
  if (error) return (
    <div className="fade-in" style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center' }}>
      <div className="glass-card" style={{ padding: '48px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Clock size={64} style={{ color: 'var(--color-text-secondary)' }} />
        </div>
        <h2 style={{ fontWeight: 700, marginBottom: '8px' }}>Results Not Available</h2>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{error}</p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '16px' }}>Your instructor will release the results when they're ready.</p>
      </div>
    </div>
  );
  if (!attempt) return <div className="empty-state"><h3>Attempt not found</h3></div>;

  const totalPossible = attempt.answers?.reduce((sum, a) => sum + (a.marks_allotted || 0), 0) || 0;
  const percentage = totalPossible > 0 ? Math.round((attempt.total_score / totalPossible) * 100) : 0;

  return (
    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>{attempt.session_title}</h1>
        <span className={`badge badge-${attempt.status}`}>{attempt.status}</span>
      </div>

      {/* Score Card */}
      <div className="glass-card" style={{ textAlign: 'center', marginBottom: '32px', padding: '32px' }}>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--color-accent-primary)' }}>
          {percentage}%
        </div>
        <div className="score-display" style={{ justifyContent: 'center', marginTop: '8px' }}>
          <span className="score-value">{attempt.total_score ?? '—'}</span>
          <span className="score-max">/ {totalPossible}</span>
        </div>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '14px' }}>
          Submitted {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : '—'}
        </p>
        <div className="progress-bar" style={{ marginTop: '16px' }}>
          <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>

      {/* Per-question breakdown */}
      <h2 style={{ fontWeight: 700, marginBottom: '16px' }}>Question Breakdown</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {attempt.answers?.sort((a, b) => a.display_order - b.display_order).map((a, i) => (
          <div key={a.id} className="card">
            <div className="question-header">
              <span className="question-number">Q{i + 1}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`badge badge-${a.type}`}>{a.type}</span>
                <div className="score-display">
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>{a.marks_awarded ?? '—'}</span>
                  <span className="score-max">/ {a.marks_allotted}</span>
                </div>
                {a.is_manually_overridden && <span className="chip" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>Overridden</span>}
              </div>
            </div>
            <p className="question-text" style={{ fontSize: '15px' }}>{a.question_text}</p>

            {a.type === 'mcq' && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {a.options?.sort((x, y) => x.display_order - y.display_order).map((opt) => {
                    const isSelected = opt.id === a.selected_option_id;
                    const isCorrect = opt.is_correct;
                    let style = {};
                    if (isCorrect) style = { borderColor: 'var(--color-success)', color: 'var(--color-success)', background: 'var(--color-success-bg)', gap: '6px' };
                    else if (isSelected && !isCorrect) style = { borderColor: 'var(--color-error)', color: 'var(--color-error)', background: 'var(--color-error-bg)', gap: '6px' };
                    else style = { gap: '6px' };
                    return (
                      <span key={opt.id} className="chip" style={style}>
                        {isSelected ? (isCorrect ? <Check size={12} /> : <X size={12} />) : isCorrect ? <Check size={12} /> : <Circle size={10} />} {opt.option_text}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {a.type === 'subjective' && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', background: 'var(--color-bg-glass)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Your answer:</strong><br />
                  {a.subjective_answer || '(No answer provided)'}
                </div>

                {a.ai_gradings && a.ai_gradings.length > 0 && (
                  <div className="ai-grading-card">
                    <div className="ai-grading-header">
                      <span className="ai-badge" style={{ gap: '6px' }}>
                        <Sparkles size={12} /> AI Graded
                      </span>
                      <div className="score-display">
                        <span style={{ fontWeight: 700 }}>{a.ai_gradings[0].ai_score}</span>
                        <span className="score-max">/ {a.marks_allotted}</span>
                      </div>
                    </div>
                    <div className="ai-justification">{a.ai_gradings[0].ai_justification}</div>
                    {a.ai_gradings[0].rubric_breakdown && (
                      <div className="rubric-list">
                        {(typeof a.ai_gradings[0].rubric_breakdown === 'string' ? JSON.parse(a.ai_gradings[0].rubric_breakdown) : a.ai_gradings[0].rubric_breakdown).map((rb, j) => (
                          <div key={j} className="rubric-item">
                            <div>
                              <span className="rubric-criterion">{rb.criterion}</span>
                              {rb.comment && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{rb.comment}</p>}
                            </div>
                            <span className="rubric-score">{rb.marks}/{rb.max_marks}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
