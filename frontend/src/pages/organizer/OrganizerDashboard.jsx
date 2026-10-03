import { Link } from 'react-router-dom';
import { tournamentsApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { Alert, EmptyState, Loading, StatCard, StatusBadge } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { FORMAT_LABELS, TOURNAMENT_STATUS, formatDate } from '../../utils/format';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const filter = user.role === 'Admin' ? {} : { organizerId: user.id };
  const list = useAsync(() => tournamentsApi.list(filter), [user.id]);

  const data = list.data ?? [];
  const count = (status) => data.filter((t) => t.status === status).length;

  return (
    <>
      <div className="page-header page-header--row">
        <div>
          <h1>Panel de organizador</h1>
          <p className="muted">Gestiona tus torneos, inscripciones, partidos y reportes.</p>
        </div>
        <Link to="/organizer/tournaments/new" className="btn btn--primary">+ Crear torneo</Link>
      </div>

      <div className="stats">
        <StatCard label="Torneos" value={data.length} />
        <StatCard label="Inscripciones abiertas" value={count('RegistrationOpen')} />
        <StatCard label="En curso" value={count('InProgress')} />
        <StatCard label="Finalizados" value={count('Finished')} />
      </div>

      <Alert>{list.error}</Alert>
      <div className="card">
        {list.loading ? (
          <Loading />
        ) : !data.length ? (
          <EmptyState title="Aún no has creado torneos">
            <Link to="/organizer/tournaments/new">Crea tu primer torneo</Link>.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="left">Torneo</th>
                  <th>Formato</th>
                  <th>Fechas</th>
                  <th>Equipos</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id}>
                    <td className="left">
                      <div className="strong">{t.name}</div>
                      <div className="muted small">{t.sport} · {t.category}</div>
                    </td>
                    <td>{FORMAT_LABELS[t.format]}</td>
                    <td className="small">{formatDate(t.startDate)}<br />{formatDate(t.endDate)}</td>
                    <td>{t.approvedTeams}/{t.maxTeams}</td>
                    <td><StatusBadge map={TOURNAMENT_STATUS} value={t.status} /></td>
                    <td className="row-actions">
                      <Link to={`/organizer/tournaments/${t.id}`} className="btn btn--primary btn--sm">Gestionar</Link>
                      <Link to={`/tournaments/${t.id}`} className="btn btn--ghost btn--sm">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
