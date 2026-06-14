import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DiscoveryPage from './pages/DiscoveryPage';
import TutorProfilePage from './pages/TutorProfilePage';
import BookingsPage from './pages/BookingsPage';
import SessionRoomPage from './pages/SessionRoomPage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import TutorSetupPage from './pages/TutorSetupPage';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import GroupSessionsPage from './pages/GroupSessionsPage';
import GroupSessionDetailPage from './pages/GroupSessionDetailPage';
import CreateGroupSessionPage from './pages/CreateGroupSessionPage';
import EscapeRoomLobbyPage from './pages/EscapeRoomLobbyPage';
import EscapeRoomGamePage from './pages/EscapeRoomGamePage';
import NotificationsPage from './pages/NotificationsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LearningPathPage from './pages/LearningPathPage';
import TutorAnalyticsPage from './pages/TutorAnalyticsPage';
import ResourceLibraryPage from './pages/ResourceLibraryPage';

/**
 * Protected route wrapper
 */
function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />

      {/* Protected Routes — Inside Layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/discover" element={<DiscoveryPage />} />
        <Route path="/tutors/:id" element={<TutorProfilePage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/become-tutor" element={<TutorSetupPage />} />
        <Route path="/group-sessions" element={<GroupSessionsPage />} />
        <Route path="/group-sessions/:id" element={<GroupSessionDetailPage />} />
        <Route
          path="/group-sessions/create"
          element={
            <ProtectedRoute roles={['tutor', 'both']}>
              <CreateGroupSessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/escape-room" element={<EscapeRoomLobbyPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/learning-path" element={<LearningPathPage />} />
        <Route path="/resources" element={<ResourceLibraryPage />} />
        <Route
          path="/tutor-analytics"
          element={
            <ProtectedRoute roles={['tutor', 'both']}>
              <TutorAnalyticsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Session Room — Full screen, no sidebar */}
      <Route
        path="/session/:id"
        element={
          <ProtectedRoute>
            <SessionRoomPage />
          </ProtectedRoute>
        }
      />

      {/* Escape Room Game — Full screen, no sidebar */}
      <Route
        path="/escape-room/:id/play"
        element={
          <ProtectedRoute>
            <EscapeRoomGamePage />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
