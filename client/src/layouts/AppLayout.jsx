import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { logout } from '../store/authSlice';

export default function AppLayout() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout()).then(() => navigate('/login'));
  };

  const instructorLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/syllabi', label: 'Syllabi', icon: '📄' },
    { to: '/questions', label: 'Question Bank', icon: '❓' },
    { to: '/sessions', label: 'Quiz Sessions', icon: '🎯' },
  ];

  const studentLinks = [
    { to: '/dashboard', label: 'My Quizzes', icon: '📝' },
    { to: '/join', label: 'Join Quiz', icon: '🔗' },
  ];

  const links = user?.role === 'instructor' ? instructorLinks : studentLinks;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <span className="sidebar-logo-text">GenAssess</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Main Menu</div>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleLogout}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title"></div>
          <div className="topbar-actions">
            <div className="topbar-user">
              <div className="topbar-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">{user?.name}</span>
                <span className="topbar-user-role">{user?.role}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
