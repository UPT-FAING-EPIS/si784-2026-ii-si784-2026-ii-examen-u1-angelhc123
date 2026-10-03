import { useState } from 'react';
import { Link } from 'react-router-dom';
import { matchesApi, teamsApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Loading, StatCard, StatusBadge, EmptyState } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { MatchCalendar } from '../components/MatchList';
import { REGISTRATION_STATUS } from '../utils/format';

export default function DashboardPage() {
  const { user, isOrganizer } = useAuth();
  const teams = useAsync(() => teamsApi.list({ userId: user.id }), [user.id]);
  const matches = useAsync(() => matchesApi.list({ userId: user.id }), [user.id]);
  const [now] = useState(() => Date.now());

  if (teams.loading || matches.loading) return <Loading />;

  const myTeams = teams.data ?? [];
  const allMatches = matches.data ?? [];
  const upcoming = allMatches.filter((m) => m.status === 'Scheduled' && new Date(m.scheduledAt).getTime() >= now);
  const recent = allMatches.filter((m) => m.status === 'Played').slice(-5).reverse();
  const myTeamIds = myTeams.map((t) => t.id);

  const record = recent.reduce(
    (acc, m) => {
      const mineHome = myTeamIds.includes(m.homeTeamId);
      const my = mineHome ? m.homeScore : m.awayScore;
      const other = mineHome ? m.awayScore : m.homeScore;
      if (my > other) acc.w++;
      else if (my === other) acc.d++;
      else acc.l++;
      return acc;
    },
    { w: 0, d: 0, l: 0 },
  );

  return (
    <>
      <div className="page-header page-header--row">
        <div>
          <h1>Hola, {user.fullName.split(' ')[0]} 👋</h1>
          <p className="muted">Resumen de tus equipos, inscripciones y partidos.</p>
        </div>
        <div className="actions">
          <Link to="/teams" className="btn btn--primary">Gestionar equipos</Link>
          {isOrganizer && <Link to="/organizer" className="btn btn--ghost">Panel organizador</Link>}
        </div>
      </div>

      <div className="stats">
        <StatCard label="Mis equipos" value={myTeams.length} />
        <StatCard label="Jugadores registrados" value={myTeams.reduce((s, t) => s + t.players.length, 0)} />
        <StatCard label="Próximos partidos" value={upcoming.length} />
        <StatCard label="Últimos 5 (G-E-P)" value={`${record.w}-${record.d}-${record.l}`} />
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Próximos partidos</h2>
          <MatchCalendar matches={upcoming.slice(0, 8)} showTournament highlightTeamIds={myTeamIds} />
        </section>

        <section className="card">
          <h2>Mis inscripciones</h2>
          <MyRegistrations />
        </section>
      </div>

      {recent.length > 0 && (
        <section className="card">
          <h2>Resultados recientes</h2>
          <MatchCalendar matches={recent} showTournament highlightTeamIds={myTeamIds} />
        </section>
      )}
    </>
  );
}

function MyRegistrations() {
  const regs = useAsync(() => teamsApi.myRegistrations(), []);

  if (regs.loading) return <Loading />;
  if (!regs.data?.length)
    return (
      <EmptyState title="Sin inscripciones">
        <Link to="/tournaments">Busca un torneo</Link> e inscribe a tu equipo.
      </EmptyState>
    );

  return (
    <ul className="list">
      {regs.data.map((r) => (
        <li key={r.id} className="list__item">
          <div>
            <Link to={`/tournaments/${r.tournamentId}`} className="strong">{r.tournamentName}</Link>
            <div className="muted small">{r.teamName}</div>
          </div>
          <StatusBadge map={REGISTRATION_STATUS} value={r.status} />
        </li>
      ))}
    </ul>
  );
}
