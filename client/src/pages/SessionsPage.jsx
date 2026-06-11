import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../store/toastSlice';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddQ, setShowAddQ] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchSessions = () => {
    api.get('/sessions').then((res) => { setSessions(res.data.sessions); setLoading(false); });
  };
  useEffect(() => { fetchSessions(); }, []);

  const handleActivate = async (id) => {
    try {
      await api.post(`/sessions/${id}/activate`);
      dispatch(showToast('success', 'Session activated!'));
      fetchSessions();
    } catch (err) {
      dispatch(showToast('error', err.response?.data?.message || 'Failed to activate'));
    }
  };

  const handleClose = async (id) => {
    if (!confirm('Close this session? Students will no longer be able to take the quiz.')) return;
    try {
      await api.post(`/sessions/${id}/close`);
      dispatch(showToast('success', 'Session closed'));
      fetchSessions();
    } catch (err) {
      dispatch(showToast('error', err.response?.data?.message || 'Failed'));
    }
  };

  const handleGrade = async (id) => {
    dispatch(showToast('info', 'Starting AI grading... This may take a moment.'));
    try {
      const res = await api.post(`/grading/session/${id}`);
      dispatch(showToast('success', `Graded ${res.data.total} answers`));
      fetchSessions();
    } catch (err) {
      dispatch(showToast('error', err.response?.data?.message || 'Grading failed'));
    }
  };

  const handleToggleResults = async (id) => {
    try {
      const res = await api.post(`/sessions/${id}/toggle-results`);
      dispatch(showToast('success', res.data.message));
      fetchSessions();
    } catch (err) {
      dispatch(showToast('error', 'Failed to toggle results'));
    }
  };

  if (loading) return <LoadingSkeleton type="card" />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Quiz Sessions</h1>
          <p>Create, configure, and manage quiz sessions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>➕ New Session</button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <h3>No sessions created</h3>
          <p>Create your first quiz session to get started</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Session</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sessions.map((s) => (
            <div key={s.id} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{s.title}</h3>
                  {s.description && <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{s.description}</p>}
                </div>
                <span className={`badge badge-${s.status}`}>{s.status}</span>
              </div>

              <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span>⏱ {s.duration_minutes} min</span>
                <span>❓ {s.question_count || 0} questions</span>
                <span>👥 {s.attempt_count || 0} attempts</span>
                {s.join_code && <span style={{ color: 'var(--color-accent-secondary)', fontWeight: 700 }}>Code: {s.join_code}</span>}
                {s.status !== 'draft' && (
                  <span style={{ color: s.results_released ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
                    {s.results_released ? '🟢 Results visible' : '🔴 Results hidden'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {s.status === 'draft' && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddQ(s.id)}>➕ Add Questions</button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleActivate(s.id)}>🚀 Activate</button>
                  </>
                )}
                {s.status === 'active' && (
                  <>
                    <button className="btn btn-danger btn-sm" onClick={() => handleClose(s.id)}>🔒 Close Session</button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleGrade(s.id)}>🤖 AI Grade</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/sessions/${s.id}/results`)}>📊 View Results</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleToggleResults(s.id)}>
                      {s.results_released ? '🙈 Hide Results' : '👁 Release Results'}
                    </button>
                  </>
                )}
                {s.status === 'closed' && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => handleGrade(s.id)}>🤖 AI Grade</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/sessions/${s.id}/results`)}>📊 View Results</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleToggleResults(s.id)}>
                      {s.results_released ? '🙈 Hide Results' : '👁 Release Results'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateSessionModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchSessions(); }} />
      {showAddQ && <AddQuestionsModal sessionId={showAddQ} onClose={() => setShowAddQ(null)} onSuccess={() => { setShowAddQ(null); fetchSessions(); }} />}
    </div>
  );
}

function CreateSessionModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', duration_minutes: 60 });
  const [saving, setSaving] = useState(false);
  const dispatch = useDispatch();

  const handleSubmit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      await api.post('/sessions', form);
      dispatch(showToast('success', 'Session created!'));
      setForm({ title: '', description: '', duration_minutes: 60 });
      onSuccess();
    } catch (err) {
      dispatch(showToast('error', 'Failed to create session'));
    }
    setSaving(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Quiz Session" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.title}>
          {saving ? 'Creating...' : 'Create Session'}
        </button>
      </>
    }>
      <div className="input-group">
        <label>Session Title</label>
        <input className="input" placeholder="e.g., Midterm Exam" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="input-group">
        <label>Description (optional)</label>
        <textarea className="input" placeholder="Instructions for students..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="input-group">
        <label>Duration (minutes)</label>
        <input className="input" type="number" min="5" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) })} />
      </div>
    </Modal>
  );
}

function AddQuestionsModal({ sessionId, onClose, onSuccess }) {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    api.get('/questions').then((res) => { setQuestions(res.data.questions); setLoading(false); });
  }, []);

  const toggle = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      await api.post(`/sessions/${sessionId}/questions`, {
        questionIds: selected,
        marksAllotted: selected.map((id) => questions.find((q) => q.id === id)?.default_marks || 1),
      });
      dispatch(showToast('success', `Added ${selected.length} questions`));
      onSuccess();
    } catch (err) {
      dispatch(showToast('error', 'Failed to add questions'));
    }
    setSaving(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Questions" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleAdd} disabled={saving || selected.length === 0}>
          {saving ? 'Adding...' : `Add ${selected.length} Questions`}
        </button>
      </>
    }>
      {loading ? (
        <div className="page-loader"><div className="loader-spinner"></div></div>
      ) : questions.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>No questions in your bank. Generate some from a syllabus first.</p>
      ) : (
        <div style={{ maxHeight: '400px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {questions.map((q) => (
            <div
              key={q.id}
              className={`option-item ${selected.includes(q.id) ? 'selected' : ''}`}
              onClick={() => toggle(q.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`option-radio`} style={selected.includes(q.id) ? { borderColor: 'var(--color-accent-primary)' } : {}}>
                {selected.includes(q.id) && <div style={{ position: 'absolute', top: '3px', left: '3px', width: '8px', height: '8px', background: 'var(--color-accent-primary)', borderRadius: '50%' }}></div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                  <span className={`badge badge-${q.type}`} style={{ fontSize: '10px' }}>{q.type}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{q.default_marks}pts</span>
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.4 }}>{q.question_text.substring(0, 100)}{q.question_text.length > 100 ? '...' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
