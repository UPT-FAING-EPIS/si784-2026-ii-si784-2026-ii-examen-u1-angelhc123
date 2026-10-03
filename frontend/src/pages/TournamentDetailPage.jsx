import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { matchesApi, teamsApi, tournamentsApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Alert, EmptyState, Loading, StatCard, StatusBadge, Tabs } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { MatchCalendar } from '../components/MatchList';
import StandingsTable from '../components/StandingsTable';
import KnockoutBracket from '../components/KnockoutBracket';
import { FORMAT_LABELS, REGISTRATION_STATUS, TOURNAMENT_STATUS, formatDate } from '../utils/format';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState('info');

  const tournament = useAsync(() => tournamentsApi.get(id), [id]);
  const matches = useAsync(() => matchesApi.list({ tournamentId: id }), [id]);
  const standings = useAsync(() => tournamentsApi.standings(id), [id]);

  if (tournament.loading && !tournament.data) return <Loading />;
  if (tournament.error) return <Alert>{tournament.error}</Alert>;

  const t = tournament.data;
  const canManage = user && (user.role === 'Admin' || user.id === t.organizerId);
  const approved = t.registrations.filter((r) => r.status === 'Approved');
  const matchList = matches.data ?? [];

  const tabs = [
    { id: 'info', label: 'Información' },
    { id: 'teams', label: 'Equipos', count: approved.length },
    { id: 'calendar', label: 'Calendario', count: matchList.length },
    { id: 'standings', label: t.format === 'Knockout' ? 'Llaves' : 'Posiciones' },
    { id: 'stats', label: 'Estadísticas' },
  ];

  const refreshAll = () => {
    tournament.reload();
    standings.reload();
  };

  return (
    <>
      <div className="detail-header card">
        <div>
          <div className="card__top">
            <span className="chip">{t.sport}</span>
            <StatusBadge map={TOURNAMENT_STATUS} value={t.status} />
          </div>
          <h1>{t.name}</h1>
          <p className="muted">
            {t.category} · {FORMAT_LABELS[t.format]} · {formatDate(t.startDate)} — {formatDate(t.endDate)} · Organiza{' '}
            {t.organizerName}
          </p>
        </div>
        {canManage && (
          <Link to={`/organizer/tournaments/${t.id}`} className="btn btn--primary">
            Gestionar torneo
          </Link>
        )}
      </div>

      {isAuthenticated && t.status === 'RegistrationOpen' && (
        <RegisterTeamBox tournament={t} userId={user.id} onRegistered={refreshAll} />
      )}

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="card">
        {tab === 'info' && <InfoTab tournament={t} />}
        {tab === 'teams' && <TeamsTab registrations={t.registrations} />}
        {tab === 'calendar' &&
          (matches.loading ? <Loading /> : <MatchCalendar matches={matchList} />)}
        {tab === 'standings' &&
          (t.format === 'Knockout' ? (
            <KnockoutBracket matches={matchList} />
          ) : standings.loading ? (
            <Loading />
          ) : (
            <StandingsTable standings={standings.data} />
          ))}
        {tab === 'stats' && <StatsTab matches={matchList} standings={standings.data ?? []} />}
      </div>
    </>
  );
}

function InfoTab({ tournament: t }) {
  return (
    <div className="info">
      <dl className="info__list">
        <dt>Deporte</dt><dd>{t.sport}</dd>
        <dt>Categoría</dt><dd>{t.category}</dd>
        <dt>Formato</dt><dd>{FORMAT_LABELS[t.format]}</dd>
        <dt>Cupos</dt><dd>{t.maxTeams} equipos</dd>
        <dt>Fechas</dt><dd>{formatDate(t.startDate)} — {formatDate(t.endDate)}</dd>
      </dl>
      <h3>Descripción</h3>
      <p className="pre">{t.description || 'Sin descripción.'}</p>
      <h3>Reglamento</h3>
      <p className="pre">{t.rules || 'El organizador no ha publicado reglas.'}</p>
    </div>
  );
}

function TeamsTab({ registrations }) {
  if (!registrations.length) return <EmptyState title="Aún no hay equipos inscritos." />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th className="left">Equipo</th><th>Inscripción</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {registrations.map((r) => (
            <tr key={r.id}>
              <td className="left strong">{r.teamName}</td>
              <td>{formatDate(r.registeredAt)}</td>
              <td><StatusBadge map={REGISTRATION_STATUS} value={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsTab({ matches, standings }) {
  const played = matches.filter((m) => m.status === 'Played');
  const goals = played.reduce((s, m) => s + m.homeScore + m.awayScore, 0);
  const withGames = standings.filter((s) => s.played > 0);
  const top = [...withGames].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const defense = [...withGames].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const biggest = [...played].sort((a, b) => Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore))[0];

  return (
    <>
      <div className="stats">
        <StatCard label="Partidos jugados" value={`${played.length}/${matches.length}`} />
        <StatCard label="Goles totales" value={goals} />
        <StatCard label="Promedio por partido" value={played.length ? (goals / played.length).toFixed(2) : '0.00'} />
        <StatCard label="Más goleador" value={top?.teamName ?? '—'} sub={top ? `${top.goalsFor} goles` : ''} />
        <StatCard label="Mejor defensa" value={defense?.teamName ?? '—'} sub={defense ? `${defense.goalsAgainst} en contra` : ''} />
        <StatCard
          label="Mayor goleada"
          value={biggest ? `${biggest.homeScore} - ${biggest.awayScore}` : '—'}
          sub={biggest ? `${biggest.homeTeamName} vs ${biggest.awayTeamName}` : ''}
        />
      </div>
      {withGames.length > 0 && (
        <>
          <h3>Goles a favor por equipo</h3>
          <div className="bars">
            {[...withGames]
              .sort((a, b) => b.goalsFor - a.goalsFor)
              .map((s) => (
                <div key={s.teamId} className="bars__row">
                  <span className="bars__label">{s.teamName}</span>
                  <div className="bars__track">
                    <div className="bars__fill" style={{ width: `${(s.goalsFor / Math.max(1, top.goalsFor)) * 100}%` }} />
                  </div>
                  <span className="bars__value">{s.goalsFor}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </>
  );
}

function RegisterTeamBox({ tournament, userId, onRegistered }) {
  const myTeams = useAsync(() => teamsApi.list({ userId }), [userId]);
  const [teamId, setTeamId] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const registeredIds = new Set(tournament.registrations.map((r) => r.teamId));
  const mine = myTeams.data ?? [];
  const mineRegistered = tournament.registrations.filter((r) => mine.some((t) => t.id === r.teamId));
  const available = mine.filter((t) => !registeredIds.has(t.id));

  const submit = async (e) => {
    e.preventDefault();
    if (!teamId) {
      setMsg({ type: 'error', text: 'Seleccione un equipo.' });
      return;
    }
    setBusy(true);
    try {
      await tournamentsApi.register(tournament.id, Number(teamId));
      setMsg({ type: 'success', text: 'Inscripción enviada. Queda pendiente de aprobación del organizador.' });
      setTeamId('');
      onRegistered();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (myTeams.loading) return null;

  return (
    <div className="card register-box">
      <h3>Inscribir mi equipo</h3>
      <Alert type={msg.type} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>
      {mineRegistered.length > 0 && (
        <p className="muted small">
          Tus equipos inscritos:{' '}
          {mineRegistered.map((r) => `${r.teamName} (${REGISTRATION_STATUS[r.status].label})`).join(', ')}
        </p>
      )}
      {mine.length === 0 ? (
        <p className="muted">
          Aún no tienes equipos. <Link to="/teams">Crea uno aquí</Link>.
        </p>
      ) : available.length === 0 ? (
        <p className="muted">Todos tus equipos ya están inscritos en este torneo.</p>
      ) : (
        <form className="inline-form" onSubmit={submit}>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Equipo">
            <option value="">Seleccione un equipo...</option>
            {available.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Enviando...' : 'Inscribir'}
          </button>
        </form>
      )}
    </div>
  );
}
