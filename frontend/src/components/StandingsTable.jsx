import { EmptyState } from './ui';

export default function StandingsTable({ standings }) {
  if (!standings?.length) return <EmptyState title="Aún no hay equipos aprobados." />;

  return (
    <div className="table-wrap">
      <table className="table table--standings">
        <thead>
          <tr>
            <th>#</th>
            <th className="left">Equipo</th>
            <th title="Partidos jugados">PJ</th>
            <th title="Ganados">G</th>
            <th title="Empatados">E</th>
            <th title="Perdidos">P</th>
            <th title="Goles a favor">GF</th>
            <th title="Goles en contra">GC</th>
            <th title="Diferencia de goles">DG</th>
            <th title="Puntos">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.teamId} className={s.position === 1 && s.played > 0 ? 'leader' : ''}>
              <td>{s.position}</td>
              <td className="left strong">{s.teamName}</td>
              <td>{s.played}</td>
              <td>{s.won}</td>
              <td>{s.drawn}</td>
              <td>{s.lost}</td>
              <td>{s.goalsFor}</td>
              <td>{s.goalsAgainst}</td>
              <td>{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
              <td className="strong">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
