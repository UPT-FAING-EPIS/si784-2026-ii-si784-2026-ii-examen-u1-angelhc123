import { EmptyState } from './ui';

function roundName(round, totalRounds, matchesInRound) {
  if (matchesInRound === 1 && round === totalRounds) return 'Final';
  if (matchesInRound === 2) return 'Semifinal';
  if (matchesInRound === 4) return 'Cuartos de final';
  if (matchesInRound === 8) return 'Octavos de final';
  return `Ronda ${round}`;
}

export default function KnockoutBracket({ matches }) {
  if (!matches.length) return <EmptyState title="El cuadro aún no ha sido generado." />;

  const rounds = matches.reduce((acc, m) => {
    (acc[m.round] ??= []).push(m);
    return acc;
  }, {});
  const keys = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const total = keys.at(-1);

  return (
    <div className="bracket">
      {keys.map((r) => (
        <div key={r} className="bracket__round">
          <h4>{roundName(r, total, rounds[r].length)}</h4>
          {rounds[r].map((m) => {
            const played = m.status === 'Played';
            return (
              <div key={m.id} className="bracket__match">
                <div className={played && m.homeScore > m.awayScore ? 'win' : ''}>
                  <span>{m.homeTeamName}</span>
                  <b>{played ? m.homeScore : ''}</b>
                </div>
                <div className={played && m.awayScore > m.homeScore ? 'win' : ''}>
                  <span>{m.awayTeamName}</span>
                  <b>{played ? m.awayScore : ''}</b>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
