import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { register, clearError } from '../store/authSlice';
import { showToast } from '../store/toastSlice';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((s) => s.auth);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(register(form));
    if (register.fulfilled.match(result)) {
      dispatch(showToast('success', 'Account created! Please sign in.'));
      navigate('/login');
    }
  };

  return (
    <div className="auth-card slide-up">
      <h1>Create Account</h1>
      <p className="subtitle">Join GenAssess to start creating or taking quizzes</p>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--color-error-bg)', borderRadius: '10px', color: 'var(--color-error)', fontSize: '14px', marginBottom: '8px' }}>
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="reg-name">Full Name</label>
          <input id="reg-name" name="name" className="input" placeholder="John Doe" value={form.name} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label htmlFor="reg-email">Email Address</label>
          <input id="reg-email" name="email" type="email" className="input" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label htmlFor="reg-password">Password</label>
          <input id="reg-password" name="password" type="password" className="input" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
        </div>

        <div className="input-group">
          <label htmlFor="reg-role">I am a</label>
          <select id="reg-role" name="role" className="input" value={form.role} onChange={handleChange}>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%' }}>
          {isLoading ? <span className="spinner"></span> : null}
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}
