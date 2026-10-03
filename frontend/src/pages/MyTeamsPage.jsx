import { useState } from 'react';
import { Link } from 'react-router-dom';
import { teamsApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Alert, EmptyState, Loading, Modal } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import TeamForm from '../components/TeamForm';

export default function MyTeamsPage() {
  const { user } = useAuth();
  const teams = useAsync(() => teamsApi.list({ userId: user.id }), [user.id]);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');

  const create = async (data) => {
    await teamsApi.create(data);
    setCreating(false);
    setNotice('Equipo creado correctamente.');
    teams.reload();
  };

  return (
    <>
      <div className="page-header page-header--row">
        <div>
          <h1>Mis equipos</h1>
          <p className="muted">Crea equipos, administra jugadores e inscríbelos en torneos.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
          + Nuevo equipo
        </button>
      </div>

      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      <Alert>{teams.error}</Alert>

      {teams.loading ? (
        <Loading />
      ) : teams.data?.length ? (
        <div className="grid">
          {teams.data.map((t) => (
            <Link key={t.id} to={`/teams/${t.id}`} className="card card--link team-card">
              <div className="team-card__avatar">
                {t.logoUrl ? <img src={t.logoUrl} alt="" /> : t.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="card__title">{t.name}</h3>
                <p className="muted small">
                  {t.city || 'Sin ciudad'} · {t.players.length} jugadores
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Todavía no tienes equipos">Crea tu primer equipo para inscribirte en torneos.</EmptyState>
      )}

      {creating && (
        <Modal title="Nuevo equipo" onClose={() => setCreating(false)}>
          <TeamForm onSubmit={create} onCancel={() => setCreating(false)} submitLabel="Crear equipo" />
        </Modal>
      )}
    </>
  );
}
