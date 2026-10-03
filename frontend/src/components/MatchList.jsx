import { Link } from 'react-router-dom';
import { MATCH_STATUS, dayKey, formatDayHeader, formatTime } from '../utils/format';
import { EmptyState, StatusBadge } from './ui';

/** Lista de partidos agrupados por día (vista de calendario). */
export function MatchCalendar({ matches, showTournament = false, highlightTeamIds = [], renderActions }) {
  if (!matches.length) return <EmptyState title="No hay partidos programados." />;

  const groups = matches.reduce((acc, m) => {
    const key = dayKey(m.scheduledAt);
    (acc[key] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="calendar">
      {Object.keys(groups)
        .sort()
        .map((key) => (
          <section key={key} className="calendar__day">
            <h4 className="calendar__date">{formatDayHeader(key)}</h4>
            {groups[key].map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                showTournament={showTournament}
                highlight={highlightTeamIds}
                actions={renderActions?.(m)}
              />
            ))}
          </section>
        ))}
    </div>
  );
}

export function MatchRow({ match: m, showTournament, highlight = [], actions }) {
  const played = m.status === 'Played';
  const mark = (id) => (highlight.includes(id) ? ' match__team--mine' : '');
  const homeWin = played && m.homeScore > m.awayScore;
  const awayWin = played && m.awayScore > m.homeScore;

  return (
    <div className={`match${m.status === 'Cancelled' ? ' match--cancelled' : ''}`}>
      <div className="match__meta">
        <span className="match__time">{formatTime(m.scheduledAt)}</span>
        <span>Jornada {m.round}</span>
        {showTournament && (
          <Link to={`/tournaments/${m.tournamentId}`} className="match__tournament">
            {m.tournamentName}
          </Link>
        )}
      </div>
      <div className="match__board">
        <span className={`match__team match__team--home${mark(m.homeTeamId)}${homeWin ? ' match__team--win' : ''}`}>
          {m.homeTeamName}
        </span>
        <span className="match__score">{played ? `${m.homeScore} - ${m.awayScore}` : 'vs'}</span>
        <span className={`match__team${mark(m.awayTeamId)}${awayWin ? ' match__team--win' : ''}`}>{m.awayTeamName}</span>
      </div>
      <div className="match__side">
        {m.venue && <span className="match__venue">📍 {m.venue}</span>}
        <StatusBadge map={MATCH_STATUS} value={m.status} />
        {actions}
      </div>
    </div>
  );
}
