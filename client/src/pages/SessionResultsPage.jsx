import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import { showToast } from '../store/toastSlice';

export default function SessionResultsPage() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAttempt, setExpandedAttempt] = useState(null);
  const [overrideModal, setOverrideModal] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchResults = () => {
    api.get(`/grading/session/${sessionId}`).then((res) => {
      setData(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchResults(); }, [sessionId]);

  const handleViewAttempt = async (attemptId) => {
    if (expandedAttempt?.id === attemptId) {
      setExpandedAttempt(null);
      return;
    }
    const res = await api.get(`/attempts/${attemptId}`);
    setExpandedAttempt(res.data.attempt);
  };

  const handleOverride = async (answerId, newScore) => {
    try {
      await api.put(`/grading/answer/${answerId}/override`, { newScore });
      dispatch(showToast('success', 'Grade overridden'));
      setOverrideModal(null);
      // Refresh expanded attempt
      if (expandedAttempt) {
        const res = await api.get(`/attempts/${expandedAttempt.id}`);
        setExpandedAttempt(res.data.attempt);
      }
      fetchResults();
    } catch (err) {
      dispatch(showToast('error', 'Override failed'));
    }
  };

  if (loading) return <LoadingSkeleton type="spinner" />;
  if (!data) return <div className="empty-state"><h3>Session not found</h3></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Results: {data.session.title}</h1>
          <p>{data.attempts.length} student submissions</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/sessions')}>← Back to Sessions</button>
      </div>

      {data.attempts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No attempts yet</h3>
          <p>No students have taken this quiz yet</p>
        </div>
      ) : (
        <>
          <div className="table-container" style={{ marginBottom: '24px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.student_name}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{a.student_email}</td>
                    <td>
                      <div className="score-display">
                        <span style={{ fontWeight: 700 }}>{a.total_score ?? '—'}</span>
                        <span className="score-max">/ {a.total_possible}</span>
                      </div>
                    </td>
                    <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleViewAttempt(a.id)}>
                        {expandedAttempt?.id === a.id ? 'Collapse' : '👁 Review'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expandedAttempt && (
            <div className="slide-up" style={{ marginTop: '16px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>
                Reviewing: {expandedAttempt.student_name || 'Student'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {expandedAttempt.answers?.sort((a, b) => a.display_order - b.display_order).map((a, i) => (
                  <div key={a.id} className="card">
                    <div className="question-header">
                      <span className="question-number">Q{i + 1} — {a.type.toUpperCase()}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div className="score-display">
                          <span style={{ fontWeight: 700 }}>{a.marks_awarded ?? '—'}</span>
                          <span className="score-max">/ {a.marks_allotted}</span>
                        </div>
                        {a.is_manually_overridden && <span className="chip" style={{ color: 'var(--color-warning)' }}>Overridden</span>}
                        {a.type === 'subjective' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setOverrideModal(a)}>✏️ Override</button>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: '15px', marginBottom: '12px' }}>{a.question_text}</p>

                    {a.type === 'mcq' && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {a.options?.sort((x, y) => x.display_order - y.display_order).map((opt) => {
                          const isSelected = opt.id === a.selected_option_id;
                          const isCorrect = opt.is_correct;
                          let style = {};
                          if (isCorrect) style = { borderColor: 'var(--color-success)', color: 'var(--color-success)' };
                          else if (isSelected) style = { borderColor: 'var(--color-error)', color: 'var(--color-error)' };
                          return <span key={opt.id} className="chip" style={style}>{isSelected ? (isCorrect ? '✓' : '✕') : ''} {opt.option_text}</span>;
                        })}
                      </div>
                    )}

                    {a.type === 'subjective' && (
                      <>
                        <div style={{ background: 'var(--color-bg-glass)', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '12px' }}>
                          <strong>Student's Answer:</strong><br/>{a.subjective_answer || '(No answer)'}
                        </div>
                        {a.ai_gradings?.[0] && (
                          <div className="ai-grading-card">
                            <div className="ai-grading-header">
                              <span className="ai-badge">🤖 AI Graded</span>
                              <span style={{ fontWeight: 700 }}>{a.ai_gradings[0].ai_score}/{a.marks_allotted}</span>
                            </div>
                            <div className="ai-justification">{a.ai_gradings[0].ai_justification}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {overrideModal && (
        <OverrideModal
          answer={overrideModal}
          onClose={() => setOverrideModal(null)}
          onOverride={handleOverride}
        />
      )}
    </div>
  );
}

function OverrideModal({ answer, onClose, onOverride }) {
  const [newScore, setNewScore] = useState(answer.marks_awarded || 0);
  const [saving, setSaving] = useState(false);

  return (
    <Modal isOpen={true} onClose={onClose} title="Override Grade" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={async () => { setSaving(true); await onOverride(answer.id, newScore); }} disabled={saving}>
          {saving ? 'Saving...' : 'Override Grade'}
        </button>
      </>
    }>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>{answer.question_text}</p>
      {answer.ai_gradings?.[0] && (
        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(108,99,255,0.05)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>AI Score</span>
            <span style={{ fontWeight: 700 }}>{answer.ai_gradings[0].ai_score}/{answer.marks_allotted}</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{answer.ai_gradings[0].ai_justification}</p>
        </div>
      )}
      <div className="input-group">
        <label>New Score (max {answer.marks_allotted})</label>
        <input className="input" type="number" min="0" max={answer.marks_allotted} step="0.5" value={newScore} onChange={(e) => setNewScore(parseFloat(e.target.value))} />
      </div>
    </Modal>
  );
}
