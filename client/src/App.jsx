import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import WorkoutsPage from './pages/WorkoutsPage';
import NutritionPage from './pages/NutritionPage';
import GoalsPage from './pages/GoalsPage';
import MetricsPage from './pages/MetricsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AiAssistantPage from './pages/AiAssistantPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="workouts" element={<WorkoutsPage />} />
              <Route path="nutrition" element={<NutritionPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="metrics" element={<MetricsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="ai-coach" element={<AiAssistantPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
