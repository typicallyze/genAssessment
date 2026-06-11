import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../store/toastSlice';
import { Search, Clock, Play } from 'lucide-react';

export default function JoinQuizPage() {
  const [code, setCode] = useState('');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/sessions/join', { joinCode: code.trim() });
      setSession(res.data.session);
    } catch (err) {
      dispatch(showToast('error', err.response?.data?.message || 'Invalid join code'));
      setSession(null);
    }
    setLoading(false);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await api.post('/attempts', { sessionId: session.id });
      navigate(`/quiz/${session.id}/take/${res.data.attempt.id}`);
    } catch (err) {
      dispatch(showToast('error', err.response?.data?.message || 'Could not start quiz'));
    }
    setStarting(false);
  };

  return (
    <div className="fade-in" style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="page-header" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <h1>Join a Quiz</h1>
          <p>Enter the session code provided by your instructor</p>
        </div>
      </div>

      <form onSubmit={handleLookup} style={{ marginBottom: '24px' }}>
        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label>Session Code</label>
          <input
            className="input"
            placeholder="e.g., A1B2C3"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.2em', fontWeight: 700 }}
            maxLength={6}
          />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: '100%', gap: '8px' }} disabled={loading || !code.trim()}>
          {loading ? <span className="spinner"></span> : <Search size={18} />} Look Up
        </button>
      </form>

      {session && (
        <div className="glass-card slide-up">
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>{session.title}</h3>
          {session.description && <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>{session.description}</p>}
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '20px', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> {session.duration_minutes} min
            </span>
            <span className="badge badge-active">Active</span>
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%', gap: '8px' }} onClick={handleStart} disabled={starting}>
            {starting ? <span className="spinner"></span> : <Play size={18} />} Start Quiz
          </button>
        </div>
      )}
    </div>
  );
}
