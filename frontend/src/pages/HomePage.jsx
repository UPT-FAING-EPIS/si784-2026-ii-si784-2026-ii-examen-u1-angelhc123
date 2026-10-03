import { Link } from 'react-router-dom';
import { tournamentsApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import TournamentCard from '../components/TournamentCard';

export default function HomePage() {
  const { isAuthenticated, isOrganizer } = useAuth();
  const { data, loading } = useAsync(() => tournamentsApi.list({ status: 'RegistrationOpen' }), []);

  return (
    <>
      <section className="hero">
        <h1>Organiza y compite en torneos deportivos en línea</h1>
        <p>
          Crea torneos, inscribe a tu equipo, genera fixtures automáticamente y sigue resultados, calendarios y
          estadísticas en tiempo real.
        </p>
        <div className="hero__actions">
          <Link to="/tournaments" className="btn btn--primary">Ver torneos</Link>
          {!isAuthenticated && <Link to="/register" className="btn btn--light">Crear cuenta gratis</Link>}
          {isOrganizer && <Link to="/organizer/tournaments/new" className="btn btn--light">Crear torneo</Link>}
        </div>
      </section>

      <section className="features">
        <div className="feature"><span>📝</span><h3>Inscripciones</h3><p>Registra equipos y jugadores en segundos.</p></div>
        <div className="feature"><span>⚙️</span><h3>Fixture automático</h3><p>Todos contra todos o eliminación directa.</p></div>
        <div className="feature"><span>📅</span><h3>Calendario</h3><p>Consulta fechas, sedes y resultados.</p></div>
        <div className="feature"><span>📊</span><h3>Estadísticas</h3><p>Tabla de posiciones y reportes.</p></div>
      </section>

      <div className="section-header">
        <h2>Inscripciones abiertas</h2>
        <Link to="/tournaments">Ver todos →</Link>
      </div>
      {loading ? (
        <Loading />
      ) : (
        <div className="grid">
          {data?.slice(0, 6).map((t) => <TournamentCard key={t.id} tournament={t} />)}
          {!data?.length && <p className="muted">No hay torneos con inscripciones abiertas.</p>}
        </div>
      )}
    </>
  );
}
