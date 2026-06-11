import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../store/toastSlice';

export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth);

  if (user?.role === 'instructor') return <InstructorDashboard />;
  return <StudentDashboard />;
}

function InstructorDashboard() {
  const [data, setData] = useState({ sessions: [], loading: true });

  useEffect(() => {
    api.get('/sessions').then((res) => setData({ sessions: res.data.sessions, loading: false }));
  }, []);

  const stats = [
    { icon: '🎯', label: 'Total Sessions', value: data.sessions.length, color: 'var(--color-accent-primary)' },
    { icon: '✅', label: 'Active', value: data.sessions.filter((s) => s.status === 'active').length, color: 'var(--color-success)' },
    { icon: '📋', label: 'Drafts', value: data.sessions.filter((s) => s.status === 'draft').length, color: 'var(--color-warning)' },
    { icon: '🔒', label: 'Closed', value: data.sessions.filter((s) => s.status === 'closed').length, color: 'var(--color-info)' },
  ];

  if (data.loading) return <LoadingSkeleton type="spinner" />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your quizzes and assessments</p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card glass-card">
            <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Sessions</h2>
      {data.sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <h3>No sessions yet</h3>
          <p>Create your first quiz session to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Attempts</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.slice(0, 10).map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.title}</td>
                  <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                  <td>{s.question_count || 0}</td>
                  <td>{s.attempt_count || 0}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentDashboard() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    api.get('/attempts/mine').then((res) => {
      setAttempts(res.data.attempts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true);
    try {
      // Lookup session by join code
      const lookupRes = await api.post('/sessions/join', { joinCode: code.trim() });
      const session = lookupRes.data.session;
      // Start attempt
      const attemptRes = await api.post('/attempts', { sessionId: session.id });
      navigate(`/quiz/${session.id}/take/${attemptRes.data.attempt.id}`);
    } catch (err) {
      dispatch(showToast('error', err.response?.data?.error || err.response?.data?.message || 'Invalid or expired join code'));
      setJoining(false);
    }
  };

  if (loading) return <LoadingSkeleton type="spinner" />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>My Quizzes</h1>
          <p>Enter a join code from your instructor to take a quiz</p>
        </div>
      </div>

      {/* Join by code card */}
      <div className="glass-card" style={{ marginBottom: '32px', maxWidth: '500px' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>🔗 Join a Quiz</h3>
        <form onSubmit={handleJoinByCode} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Session Code</label>
            <input
              className="input"
              placeholder="e.g., A1B2C3"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ fontSize: '1.2rem', letterSpacing: '0.15em', fontWeight: 700 }}
              maxLength={6}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={joining || !code.trim()} style={{ height: '48px' }}>
            {joining ? <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span> : '🚀'} Join
          </button>
        </form>
      </div>

      {/* Past attempts */}
      {attempts.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>Past Attempts</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.session_title}</td>
                    <td>
                      {a.status === 'in_progress' ? (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      ) : a.results_released ? (
                        <div className="score-display">
                          <span style={{ fontWeight: 700 }}>{a.total_score ?? '—'}</span>
                          <span className="score-max">/ {a.total_possible || '?'}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-warning)', fontSize: '13px' }}>🔒 Pending</span>
                      )}
                    </td>
                    <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '—'}
                    </td>
                    <td>
                      {a.status === 'in_progress' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/quiz/${a.session_id}/take/${a.id}`)}>▶ Resume</button>
                      ) : a.results_released ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/results/${a.id}`)}>📊 View</button>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>⏳ Not released</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {attempts.length === 0 && (
        <div className="empty-state" style={{ marginTop: '24px' }}>
          <div className="empty-icon">📝</div>
          <h3>No quizzes taken yet</h3>
          <p>Enter a join code above to take your first quiz</p>
        </div>
      )}
    </div>
  );
}


