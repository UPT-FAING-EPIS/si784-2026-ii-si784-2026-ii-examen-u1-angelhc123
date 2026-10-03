import { useEffect, useState } from 'react';
import { tournamentsApi } from '../api/services';
import { Alert, EmptyState, Loading } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import TournamentCard from '../components/TournamentCard';
import { SPORTS, TOURNAMENT_STATUS } from '../utils/format';

export default function TournamentsPage() {
  const [filters, setFilters] = useState({ search: '', sport: '', status: '' });
  const [debounced, setDebounced] = useState(filters);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(id);
  }, [filters]);

  const { data, loading, error } = useAsync(() => tournamentsApi.list(debounced), [debounced]);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="page-header">
        <h1>Torneos</h1>
        <p className="muted">Explora los torneos disponibles e inscribe a tu equipo.</p>
      </div>

      <div className="filters card">
        <input placeholder="Buscar por nombre o categoría..." value={filters.search} onChange={set('search')} aria-label="Buscar" />
        <select value={filters.sport} onChange={set('sport')} aria-label="Deporte">
          <option value="">Todos los deportes</option>
          {SPORTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.status} onChange={set('status')} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(TOURNAMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <Alert>{error}</Alert>
      {loading && !data ? (
        <Loading />
      ) : data?.length ? (
        <div className="grid">{data.map((t) => <TournamentCard key={t.id} tournament={t} />)}</div>
      ) : (
        <EmptyState title="No se encontraron torneos">Pruebe con otros filtros.</EmptyState>
      )}
    </>
  );
}
