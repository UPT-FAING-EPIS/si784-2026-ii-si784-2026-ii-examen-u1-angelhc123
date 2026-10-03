import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { matchesApi, tournamentsApi } from '../../api/services';
import { Alert, EmptyState, Field, Loading, Modal, StatCard, StatusBadge, Tabs } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { MatchCalendar } from '../../components/MatchList';
import StandingsTable from '../../components/StandingsTable';
import KnockoutBracket from '../../components/KnockoutBracket';
import { fixtureSchema, matchSchema, resultSchema } from '../../utils/schemas';
import {
  FORMAT_LABELS, REGISTRATION_STATUS, TOURNAMENT_STATUS, dateTimeInputToIso,
  formatDate, isoToDateInput, isoToDateTimeInput,
} from '../../utils/format';

export default function ManageTournamentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('registrations');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const tournament = useAsync(() => tournamentsApi.get(id), [id]);
  const matches = useAsync(() => matchesApi.list({ tournamentId: id }), [id]);

  if (tournament.loading && !tournament.data) return <Loading />;
  if (tournament.error) return <Alert>{tournament.error}</Alert>;

  const t = tournament.data;
  const pending = t.registrations.filter((r) => r.status === 'Pending').length;
  const approved = t.registrations.filter((r) => r.status === 'Approved');

  const reloadAll = () => {
    tournament.reload();
    matches.reload();
  };

  /** Ejecuta una acción mostrando éxito o error. */
  const run = async (action, success) => {
    setMsg({ type: '', text: '' });
    try {
      await action();
      if (success) setMsg({ type: 'success', text: success });
      reloadAll();
      return true;
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
      reloadAll();
      return false;
    }
  };

  const changeStatus = (status) => run(() => tournamentsApi.changeStatus(t.id, status), 'Estado actualizado.');

  const deleteTournament = async () => {
    if (!window.confirm(`¿Eliminar definitivamente "${t.name}" con todas sus inscripciones y partidos?`)) return;
    try {
      await tournamentsApi.remove(t.id);
      navigate('/organizer');
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  return (
    <>
      <div className="page-header">
        <Link to="/organizer" className="back">← Panel de organizador</Link>
      </div>
      <div className="detail-header card">
        <div>
          <div className="card__top">
            <span className="chip">{t.sport}</span>
            <StatusBadge map={TOURNAMENT_STATUS} value={t.status} />
          </div>
          <h1>{t.name}</h1>
          <p className="muted">
            {t.category} · {FORMAT_LABELS[t.format]} · {formatDate(t.startDate)} — {formatDate(t.endDate)} ·{' '}
            {approved.length}/{t.maxTeams} equipos
          </p>
        </div>
        <div className="actions">
          <select value={t.status} onChange={(e) => changeStatus(e.target.value)} aria-label="Estado del torneo">
            {Object.entries(TOURNAMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Link to={`/organizer/tournaments/${t.id}/edit`} className="btn btn--ghost">Editar</Link>
          <Link to={`/tournaments/${t.id}`} className="btn btn--ghost">Vista pública</Link>
          <button type="button" className="btn btn--danger" onClick={deleteTournament}>Eliminar</button>
        </div>
      </div>

      <Alert type={msg.type} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>

      <Tabs
        tabs={[
          { id: 'registrations', label: 'Inscripciones', count: pending || undefined },
          { id: 'matches', label: 'Fixture y partidos', count: matches.data?.length },
          { id: 'report', label: 'Reporte' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="card">
        {tab === 'registrations' && <RegistrationsTab tournament={t} run={run} />}
        {tab === 'matches' && (
          <MatchesTab tournament={t} matches={matches} approved={approved} run={run} />
        )}
        {tab === 'report' && <ReportTab tournament={t} matches={matches.data ?? []} />}
      </div>
    </>
  );
}

// ---------------- Inscripciones ----------------

function RegistrationsTab({ tournament: t, run }) {
  if (!t.registrations.length) return <EmptyState title="Ningún equipo se ha inscrito todavía." />;

  const setStatus = (r, status) =>
    run(() => tournamentsApi.setRegistrationStatus(t.id, r.id, status),
      `${r.teamName}: ${REGISTRATION_STATUS[status].label.toLowerCase()}.`);
  const remove = (r) => {
    if (window.confirm(`¿Eliminar la inscripción de ${r.teamName}?`))
      run(() => tournamentsApi.cancelRegistration(t.id, r.id), 'Inscripción eliminada.');
  };

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th className="left">Equipo</th><th>Fecha</th><th>Estado</th><th /></tr>
        </thead>
        <tbody>
          {t.registrations.map((r) => (
            <tr key={r.id}>
              <td className="left strong"><Link to={`/teams/${r.teamId}`}>{r.teamName}</Link></td>
              <td>{formatDate(r.registeredAt)}</td>
              <td><StatusBadge map={REGISTRATION_STATUS} value={r.status} /></td>
              <td className="row-actions">
                {r.status !== 'Approved' && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => setStatus(r, 'Approved')}>Aprobar</button>
                )}
                {r.status !== 'Rejected' && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStatus(r, 'Rejected')}>Rechazar</button>
                )}
                <button type="button" className="btn btn--ghost btn--sm danger" onClick={() => remove(r)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Fixture y partidos ----------------

function MatchesTab({ tournament: t, matches, approved, run }) {
  const [modal, setModal] = useState(null); // {type: 'result'|'reschedule'|'new'|'next', match?}
  const list = matches.data ?? [];
  const close = () => setModal(null);

  if (matches.loading) return <Loading />;

  const deleteFixture = () => {
    if (window.confirm('¿Eliminar todos los partidos del fixture?'))
      run(() => tournamentsApi.deleteFixture(t.id), 'Fixture eliminado.');
  };

  const actions = (m) => (
    <div className="row-actions">
      {m.status !== 'Cancelled' && (
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setModal({ type: 'result', match: m })}>
          {m.status === 'Played' ? 'Editar resultado' : 'Resultado'}
        </button>
      )}
      {m.status === 'Scheduled' && (
        <>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModal({ type: 'reschedule', match: m })}>
            Reprogramar
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm danger"
            onClick={() => window.confirm('¿Cancelar este partido?') && run(() => matchesApi.cancel(m.id), 'Partido cancelado.')}
          >
            Cancelar
          </button>
        </>
      )}
      {m.status !== 'Played' && (
        <button
          type="button"
          className="btn btn--ghost btn--sm danger"
          onClick={() => window.confirm('¿Eliminar este partido?') && run(() => matchesApi.remove(m.id), 'Partido eliminado.')}
        >
          Eliminar
        </button>
      )}
    </div>
  );

  return (
    <>
      {list.length === 0 ? (
        <FixtureGenerator tournament={t} approvedCount={approved.length} run={run} />
      ) : (
        <div className="toolbar">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setModal({ type: 'new' })}>
            + Programar partido
          </button>
          {t.format === 'Knockout' && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModal({ type: 'next' })}>
              Generar siguiente ronda
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--sm danger" onClick={deleteFixture}>
            Eliminar fixture
          </button>
        </div>
      )}

      {list.length > 0 && (
        <>
          {t.format === 'Knockout' && <KnockoutBracket matches={list} />}
          <MatchCalendar matches={list} renderActions={actions} />
        </>
      )}

      {modal?.type === 'result' && (
        <Modal title="Registrar resultado" onClose={close}>
          <ResultForm
            match={modal.match}
            knockout={t.format === 'Knockout'}
            onSubmit={async (d) => (await run(() => matchesApi.setResult(modal.match.id, d), 'Resultado registrado.')) && close()}
            onCancel={close}
          />
        </Modal>
      )}
      {modal?.type === 'reschedule' && (
        <Modal title="Reprogramar partido" onClose={close}>
          <RescheduleForm
            match={modal.match}
            onSubmit={async (d) => (await run(() => matchesApi.update(modal.match.id, d), 'Partido reprogramado.')) && close()}
            onCancel={close}
          />
        </Modal>
      )}
      {modal?.type === 'new' && (
        <Modal title="Programar partido" onClose={close}>
          <NewMatchForm
            tournament={t}
            teams={approved}
            nextRound={Math.max(1, ...list.map((m) => m.round))}
            onSubmit={async (d) => (await run(() => matchesApi.create(d), 'Partido programado.')) && close()}
            onCancel={close}
          />
        </Modal>
      )}
      {modal?.type === 'next' && (
        <Modal title="Generar siguiente ronda" onClose={close}>
          <FixtureForm
            submitLabel="Generar ronda"
            onSubmit={async (d) => (await run(() => tournamentsApi.nextRound(t.id, d), 'Siguiente ronda generada.')) && close()}
          />
        </Modal>
      )}
    </>
  );
}

function FixtureGenerator({ tournament: t, approvedCount, run }) {
  return (
    <div className="fixture-box">
      <h3>Generar fixture automáticamente</h3>
      <p className="muted">
        {t.format === 'RoundRobin'
          ? 'Se generará un calendario de todos contra todos (una vuelta) con los equipos aprobados.'
          : 'Se sorteará la primera ronda de eliminación directa con los equipos aprobados.'}{' '}
        Equipos aprobados: <b>{approvedCount}</b>.
      </p>
      {approvedCount < 2 ? (
        <Alert type="info">Necesitas al menos 2 equipos aprobados para generar el fixture.</Alert>
      ) : (
        <FixtureForm
          defaultDate={isoToDateInput(t.startDate)}
          submitLabel="Generar fixture"
          onSubmit={(d) => run(() => tournamentsApi.generateFixture(t.id, d), 'Fixture generado correctamente.')}
        />
      )}
    </div>
  );
}

function FixtureForm({ defaultDate = '', submitLabel, onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(fixtureSchema),
    defaultValues: { firstRoundDate: defaultDate, time: '15:00', daysBetweenRounds: 7, venue: '' },
  });

  const submit = (d) =>
    onSubmit({
      firstRoundDate: d.firstRoundDate ? dateTimeInputToIso(`${d.firstRoundDate}T${d.time || '15:00'}`) : null,
      daysBetweenRounds: Number(d.daysBetweenRounds),
      venue: d.venue || null,
    });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="row">
        <Field label="Fecha de la (primera) jornada" error={errors.firstRoundDate} htmlFor="fx-date" hint="Vacío = automática">
          <input id="fx-date" type="date" {...register('firstRoundDate')} />
        </Field>
        <Field label="Hora" error={errors.time} htmlFor="fx-time">
          <input id="fx-time" type="time" {...register('time')} />
        </Field>
        <Field label="Días entre jornadas" error={errors.daysBetweenRounds} htmlFor="fx-days">
          <input id="fx-days" type="number" min="1" max="60" {...register('daysBetweenRounds')} />
        </Field>
      </div>
      <Field label="Sede por defecto" error={errors.venue} htmlFor="fx-venue">
        <input id="fx-venue" placeholder="Ej. Estadio Municipal" {...register('venue')} />
      </Field>
      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Generando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ResultForm({ match: m, knockout, onSubmit, onCancel }) {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resultSchema),
    defaultValues: { homeScore: m.homeScore ?? 0, awayScore: m.awayScore ?? 0 },
  });

  const submit = (d) => {
    const data = { homeScore: Number(d.homeScore), awayScore: Number(d.awayScore) };
    if (knockout && data.homeScore === data.awayScore) {
      setError('En eliminación directa no se permiten empates (registre el resultado tras penales).');
      return undefined;
    }
    setError('');
    return onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Alert>{error}</Alert>
      <div className="score-form">
        <Field label={m.homeTeamName} error={errors.homeScore} htmlFor="hs">
          <input id="hs" type="number" min="0" max="999" {...register('homeScore')} />
        </Field>
        <span className="score-form__sep">-</span>
        <Field label={m.awayTeamName} error={errors.awayScore} htmlFor="as">
          <input id="as" type="number" min="0" max="999" {...register('awayScore')} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>Guardar resultado</button>
      </div>
    </form>
  );
}

function RescheduleForm({ match: m, onSubmit, onCancel }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { scheduledAt: isoToDateTimeInput(m.scheduledAt), venue: m.venue ?? '' },
  });

  const submit = (d) => {
    if (!d.scheduledAt) {
      setError('La fecha y hora son obligatorias.');
      return undefined;
    }
    if (d.venue.length > 120) {
      setError('La sede admite máximo 120 caracteres.');
      return undefined;
    }
    return onSubmit({ scheduledAt: dateTimeInputToIso(d.scheduledAt), venue: d.venue || null });
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Alert>{error}</Alert>
      <p className="muted">{m.homeTeamName} vs {m.awayTeamName}</p>
      <Field label="Fecha y hora" htmlFor="rs-date">
        <input id="rs-date" type="datetime-local" {...register('scheduledAt')} />
      </Field>
      <Field label="Sede" htmlFor="rs-venue">
        <input id="rs-venue" {...register('venue')} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>Guardar</button>
      </div>
    </form>
  );
}

function NewMatchForm({ tournament: t, teams, nextRound, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(matchSchema),
    defaultValues: { homeTeamId: '', awayTeamId: '', scheduledAt: '', round: nextRound, venue: '' },
  });

  const submit = (d) =>
    onSubmit({
      tournamentId: t.id,
      homeTeamId: Number(d.homeTeamId),
      awayTeamId: Number(d.awayTeamId),
      scheduledAt: dateTimeInputToIso(d.scheduledAt),
      round: Number(d.round),
      venue: d.venue || null,
    });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="row">
        <Field label="Equipo local *" error={errors.homeTeamId} htmlFor="nm-home">
          <select id="nm-home" {...register('homeTeamId')}>
            <option value="">Seleccione...</option>
            {teams.map((r) => <option key={r.teamId} value={r.teamId}>{r.teamName}</option>)}
          </select>
        </Field>
        <Field label="Equipo visitante *" error={errors.awayTeamId} htmlFor="nm-away">
          <select id="nm-away" {...register('awayTeamId')}>
            <option value="">Seleccione...</option>
            {teams.map((r) => <option key={r.teamId} value={r.teamId}>{r.teamName}</option>)}
          </select>
        </Field>
      </div>
      <div className="row">
        <Field label="Fecha y hora *" error={errors.scheduledAt} htmlFor="nm-date"
          hint={`Entre ${formatDate(t.startDate)} y ${formatDate(t.endDate)}`}>
          <input id="nm-date" type="datetime-local" {...register('scheduledAt')} />
        </Field>
        <Field label="Jornada *" error={errors.round} htmlFor="nm-round">
          <input id="nm-round" type="number" min="1" max="100" {...register('round')} />
        </Field>
      </div>
      <Field label="Sede" error={errors.venue} htmlFor="nm-venue">
        <input id="nm-venue" {...register('venue')} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>Programar</button>
      </div>
    </form>
  );
}

// ---------------- Reporte ----------------

function ReportTab({ tournament: t, matches }) {
  const report = useAsync(() => tournamentsApi.report(t.id), [t.id, matches.length]);
  const standings = useAsync(() => tournamentsApi.standings(t.id), [t.id, matches.length]);

  if (report.loading || standings.loading) return <Loading />;
  if (report.error) return <Alert>{report.error}</Alert>;
  const r = report.data;

  const exportCsv = () => {
    const header = ['Posición', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'];
    const rows = standings.data.map((s) =>
      [s.position, s.teamName, s.played, s.won, s.drawn, s.lost, s.goalsFor, s.goalsAgainst, s.goalDifference, s.points]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${t.name.replaceAll(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="report">
      <div className="toolbar no-print">
        <button type="button" className="btn btn--ghost btn--sm" onClick={exportCsv}>Exportar CSV</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => window.print()}>Imprimir / PDF</button>
      </div>
      <h2>Reporte: {r.tournamentName}</h2>
      <div className="stats">
        <StatCard label="Equipos inscritos" value={r.registeredTeams} sub={`${r.approvedTeams} aprobados · ${r.pendingRegistrations} pendientes`} />
        <StatCard label="Partidos" value={`${r.playedMatches}/${r.totalMatches}`} sub={`${r.scheduledMatches} por jugar`} />
        <StatCard label="Goles" value={r.totalGoals} sub={`${r.averageGoalsPerMatch} por partido`} />
        <StatCard label="Líder" value={r.leader?.teamName ?? '—'} sub={r.leader ? `${r.leader.points} pts` : ''} />
        <StatCard label="Más goleador" value={r.topScoringTeam ?? '—'} sub={r.topScoringTeam ? `${r.topScoringTeamGoals} goles` : ''} />
        <StatCard label="Mejor defensa" value={r.bestDefenseTeam ?? '—'} />
      </div>
      <h3>Tabla de posiciones</h3>
      <StandingsTable standings={standings.data} />
    </div>
  );
}
