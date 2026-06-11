import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../store/toastSlice';
import { 
  Target, 
  CheckCircle2, 
  FileText, 
  Lock, 
  ArrowRight, 
  Play, 
  Eye, 
  Clock, 
  Link2 
} from 'lucide-react';

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
    { icon: Target, label: 'Total Sessions', value: data.sessions.length, color: 'var(--color-accent-primary)' },
    { icon: CheckCircle2, label: 'Active', value: data.sessions.filter((s) => s.status === 'active').length, color: 'var(--color-success)' },
    { icon: FileText, label: 'Drafts', value: data.sessions.filter((s) => s.status === 'draft').length, color: 'var(--color-warning)' },
    { icon: Lock, label: 'Closed', value: data.sessions.filter((s) => s.status === 'closed').length, color: 'var(--color-info)' },
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
        {stats.map((s, i) => {
          const StatIcon = s.icon;
          return (
            <div key={i} className="stat-card glass-card">
              <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>
                <StatIcon size={20} />
              </div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Sessions</h2>
      {data.sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Target size={36} />
          </div>
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
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '12px' }}>
          <Link2 size={18} /> Join a Quiz
        </h3>
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
          <button className="btn btn-primary" type="submit" disabled={joining || !code.trim()} style={{ height: '48px', gap: '8px' }}>
            {joining ? <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span> : <ArrowRight size={16} />} Join
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
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-warning)', fontSize: '13px' }}>
                          <Lock size={12} /> Pending
                        </span>
                      )}
                    </td>
                    <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '—'}
                    </td>
                    <td>
                      {a.status === 'in_progress' ? (
                        <button className="btn btn-primary btn-sm" style={{ gap: '6px' }} onClick={() => navigate(`/quiz/${a.session_id}/take/${a.id}`)}>
                          <Play size={12} /> Resume
                        </button>
                      ) : a.results_released ? (
                        <button className="btn btn-ghost btn-sm" style={{ gap: '6px' }} onClick={() => navigate(`/results/${a.id}`)}>
                          <Eye size={12} /> View
                        </button>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                          <Clock size={12} /> Not released
                        </span>
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
          <div className="empty-icon">
            <FileText size={36} />
          </div>
          <h3>No quizzes taken yet</h3>
          <p>Enter a join code above to take your first quiz</p>
        </div>
      )}
    </div>
  );
}


