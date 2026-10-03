import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import MyTeamsPage from './pages/MyTeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import OrganizerDashboard from './pages/organizer/OrganizerDashboard';
import TournamentFormPage from './pages/organizer/TournamentFormPage';
import ManageTournamentPage from './pages/organizer/ManageTournamentPage';

function NotFound() {
  return (
    <div className="empty">
      <strong>Página no encontrada</strong>
      <Link to="/">Volver al inicio</Link>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="tournaments" element={<TournamentsPage />} />
            <Route path="tournaments/:id" element={<TournamentDetailPage />} />
            <Route path="calendar" element={<CalendarPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="teams" element={<MyTeamsPage />} />
              <Route path="teams/:id" element={<TeamDetailPage />} />
            </Route>

            <Route path="organizer" element={<ProtectedRoute organizerOnly />}>
              <Route index element={<OrganizerDashboard />} />
              <Route path="tournaments/new" element={<TournamentFormPage />} />
              <Route path="tournaments/:id" element={<ManageTournamentPage />} />
              <Route path="tournaments/:id/edit" element={<TournamentFormPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
