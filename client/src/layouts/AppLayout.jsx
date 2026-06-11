import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { 
  LayoutDashboard, 
  FileText, 
  HelpCircle, 
  Trophy, 
  BookOpen, 
  Link as LinkIcon, 
  LogOut, 
  Award 
} from 'lucide-react';

export default function AppLayout() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout()).then(() => navigate('/login'));
  };

  const instructorLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/syllabi', label: 'Syllabi', icon: FileText },
    { to: '/questions', label: 'Question Bank', icon: HelpCircle },
    { to: '/sessions', label: 'Quiz Sessions', icon: Trophy },
  ];

  const studentLinks = [
    { to: '/dashboard', label: 'My Quizzes', icon: BookOpen },
    { to: '/join', label: 'Join Quiz', icon: LinkIcon },
  ];

  const links = user?.role === 'instructor' ? instructorLinks : studentLinks;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Award size={18} />
          </div>
          <span className="sidebar-logo-text">GenAssess</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Main Menu</div>
          {links.map((link) => {
            const IconComponent = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="icon">
                  <IconComponent size={18} />
                </span>
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: '12px' }} onClick={handleLogout}>
            <LogOut size={16} /> Sign Out
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
