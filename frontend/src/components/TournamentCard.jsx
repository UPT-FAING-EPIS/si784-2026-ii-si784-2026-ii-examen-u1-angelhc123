import { Link } from 'react-router-dom';
import { FORMAT_LABELS, TOURNAMENT_STATUS, formatDate } from '../utils/format';
import { StatusBadge } from './ui';

export default function TournamentCard({ tournament: t, to }) {
  const pct = Math.min(100, Math.round((t.approvedTeams / t.maxTeams) * 100));
  return (
    <Link to={to ?? `/tournaments/${t.id}`} className="card card--link">
      <div className="card__top">
        <span className="chip">{t.sport}</span>
        <StatusBadge map={TOURNAMENT_STATUS} value={t.status} />
      </div>
      <h3 className="card__title">{t.name}</h3>
      <p className="muted">
        {t.category} · {FORMAT_LABELS[t.format]}
      </p>
      <p className="card__dates">
        📅 {formatDate(t.startDate)} — {formatDate(t.endDate)}
      </p>
      <div className="progress" aria-label="Equipos aprobados">
        <div className="progress__bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="muted small">
        {t.approvedTeams}/{t.maxTeams} equipos · Organiza {t.organizerName}
      </p>
    </Link>
  );
}
