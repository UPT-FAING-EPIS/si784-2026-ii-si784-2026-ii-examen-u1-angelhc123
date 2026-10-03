import { useState } from 'react';
import { matchesApi, tournamentsApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Alert, Loading } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { MatchCalendar } from '../components/MatchList';

export default function CalendarPage() {
  const { user, isAuthenticated } = useAuth();
  const [tournamentId, setTournamentId] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [period, setPeriod] = useState('upcoming');

  const tournaments = useAsync(() => tournamentsApi.list(), []);
  const matches = useAsync(() => {
    const now = new Date().toISOString();
    return matchesApi.list({
      tournamentId,
      userId: onlyMine && user ? user.id : undefined,
      from: period === 'upcoming' ? now : undefined,
      to: period === 'past' ? now : undefined,
    });
  }, [tournamentId, onlyMine, period, user?.id]);

  return (
    <>
      <div className="page-header">
        <h1>Calendario de partidos</h1>
        <p className="muted">Fechas, sedes y resultados de todos los torneos.</p>
      </div>

      <div className="filters card">
        <select value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} aria-label="Torneo">
          <option value="">Todos los torneos</option>
          {tournaments.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periodo">
          <option value="upcoming">Próximos</option>
          <option value="past">Resultados anteriores</option>
          <option value="all">Todos</option>
        </select>
        {isAuthenticated && (
          <label className="checkbox">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Solo mis equipos
          </label>
        )}
      </div>

      <Alert>{matches.error}</Alert>
      <div className="card">
        {matches.loading ? <Loading /> : <MatchCalendar matches={matches.data ?? []} showTournament />}
      </div>
    </>
  );
}
