import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { matchesApi, teamsApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Alert, EmptyState, Field, Loading, Modal, Tabs } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import TeamForm from '../components/TeamForm';
import { MatchCalendar } from '../components/MatchList';
import { playerSchema } from '../utils/schemas';
import { formatDate, isoToDateInput, dateInputToIso } from '../utils/format';

export default function TeamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const team = useAsync(() => teamsApi.get(id), [id]);
  const matches = useAsync(() => matchesApi.list({ teamId: id }), [id]);
  const [tab, setTab] = useState('players');
  const [editing, setEditing] = useState(false);
  const [playerModal, setPlayerModal] = useState(null); // null | {} (nuevo) | player
  const [msg, setMsg] = useState({ type: '', text: '' });

  if (team.loading && !team.data) return <Loading />;
  if (team.error) return <Alert>{team.error}</Alert>;

  const t = team.data;
  const canManage = user.role === 'Admin' || user.id === t.ownerId;

  const updateTeam = async (data) => {
    await teamsApi.update(t.id, data);
    setEditing(false);
    setMsg({ type: 'success', text: 'Equipo actualizado.' });
    team.reload();
  };

  const deleteTeam = async () => {
    if (!window.confirm(`¿Eliminar el equipo "${t.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await teamsApi.remove(t.id);
      navigate('/teams');
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const savePlayer = async (data) => {
    if (playerModal?.id) await teamsApi.updatePlayer(t.id, playerModal.id, data);
    else await teamsApi.addPlayer(t.id, data);
    setPlayerModal(null);
    team.reload();
  };

  const removePlayer = async (p) => {
    if (!window.confirm(`¿Quitar a ${p.fullName} del equipo?`)) return;
    try {
      await teamsApi.removePlayer(t.id, p.id);
      team.reload();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  return (
    <>
      <div className="detail-header card">
        <div className="team-card">
          <div className="team-card__avatar team-card__avatar--lg">
            {t.logoUrl ? <img src={t.logoUrl} alt="" /> : t.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1>{t.name}</h1>
            <p className="muted">
              {t.city || 'Sin ciudad'} · Capitán: {t.ownerName}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="actions">
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>Editar</button>
            <button type="button" className="btn btn--danger" onClick={deleteTeam}>Eliminar</button>
          </div>
        )}
      </div>

      <Alert type={msg.type} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>

      <Tabs
        tabs={[
          { id: 'players', label: 'Jugadores', count: t.players.length },
          { id: 'matches', label: 'Partidos', count: matches.data?.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="card">
        {tab === 'players' && (
          <>
            {canManage && (
              <div className="toolbar">
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setPlayerModal({})}>
                  + Agregar jugador
                </button>
              </div>
            )}
            {t.players.length === 0 ? (
              <EmptyState title="El equipo no tiene jugadores registrados." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th className="left">Nombre</th>
                      <th>Posición</th>
                      <th>Nacimiento</th>
                      {canManage && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {t.players.map((p) => (
                      <tr key={p.id}>
                        <td className="strong">{p.jerseyNumber ?? '—'}</td>
                        <td className="left">{p.fullName}</td>
                        <td>{p.position || '—'}</td>
                        <td>{p.birthDate ? formatDate(p.birthDate) : '—'}</td>
                        {canManage && (
                          <td className="row-actions">
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPlayerModal(p)}>Editar</button>
                            <button type="button" className="btn btn--ghost btn--sm danger" onClick={() => removePlayer(p)}>Quitar</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {tab === 'matches' &&
          (matches.loading ? <Loading /> : <MatchCalendar matches={matches.data ?? []} showTournament highlightTeamIds={[t.id]} />)}
      </div>

      {editing && (
        <Modal title="Editar equipo" onClose={() => setEditing(false)}>
          <TeamForm initial={t} onSubmit={updateTeam} onCancel={() => setEditing(false)} />
        </Modal>
      )}
      {playerModal && (
        <Modal title={playerModal.id ? 'Editar jugador' : 'Nuevo jugador'} onClose={() => setPlayerModal(null)}>
          <PlayerForm initial={playerModal} onSubmit={savePlayer} onCancel={() => setPlayerModal(null)} />
        </Modal>
      )}
    </>
  );
}

function PlayerForm({ initial, onSubmit, onCancel }) {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      fullName: initial.fullName ?? '',
      jerseyNumber: initial.jerseyNumber ?? '',
      position: initial.position ?? '',
      birthDate: isoToDateInput(initial.birthDate),
    },
  });

  const submit = async (d) => {
    setError('');
    try {
      await onSubmit({
        fullName: d.fullName,
        jerseyNumber: d.jerseyNumber === '' || d.jerseyNumber === undefined ? null : Number(d.jerseyNumber),
        position: d.position || null,
        birthDate: d.birthDate ? dateInputToIso(d.birthDate) : null,
      });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Alert>{error}</Alert>
      <Field label="Nombre completo *" error={errors.fullName} htmlFor="p-name">
        <input id="p-name" {...register('fullName')} />
      </Field>
      <div className="row">
        <Field label="N° camiseta" error={errors.jerseyNumber} htmlFor="p-number">
          <input id="p-number" type="number" min="0" max="99" {...register('jerseyNumber')} />
        </Field>
        <Field label="Posición" error={errors.position} htmlFor="p-pos">
          <input id="p-pos" list="positions" {...register('position')} />
          <datalist id="positions">
            <option value="Arquero" /><option value="Defensa" /><option value="Mediocampista" /><option value="Delantero" />
          </datalist>
        </Field>
      </div>
      <Field label="Fecha de nacimiento" error={errors.birthDate} htmlFor="p-birth">
        <input id="p-birth" type="date" {...register('birthDate')} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
