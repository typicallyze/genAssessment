import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { checkAuth } from './store/authSlice';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import ToastContainer from './components/ToastContainer';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SyllabiPage from './pages/SyllabiPage';
import QuestionBankPage from './pages/QuestionBankPage';
import SessionsPage from './pages/SessionsPage';
import SessionResultsPage from './pages/SessionResultsPage';
import JoinQuizPage from './pages/JoinQuizPage';
import QuizTakingPage from './pages/QuizTakingPage';
import ResultsPage from './pages/ResultsPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useSelector((s) => s.auth);
  if (isLoading) return <div className="page-loader"><div className="loader-spinner"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useSelector((s) => s.auth);
  if (isLoading) return <div className="page-loader"><div className="loader-spinner"></div></div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Auth routes */}
        <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected app routes */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Instructor-only */}
          <Route path="/syllabi" element={<ProtectedRoute allowedRoles={['instructor']}><SyllabiPage /></ProtectedRoute>} />
          <Route path="/questions" element={<ProtectedRoute allowedRoles={['instructor']}><QuestionBankPage /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute allowedRoles={['instructor']}><SessionsPage /></ProtectedRoute>} />
          <Route path="/sessions/:sessionId/results" element={<ProtectedRoute allowedRoles={['instructor']}><SessionResultsPage /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/join" element={<ProtectedRoute allowedRoles={['student']}><JoinQuizPage /></ProtectedRoute>} />
          <Route path="/quiz/:sessionId/take/:attemptId" element={<ProtectedRoute allowedRoles={['student']}><QuizTakingPage /></ProtectedRoute>} />
          <Route path="/results/:attemptId" element={<ResultsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
