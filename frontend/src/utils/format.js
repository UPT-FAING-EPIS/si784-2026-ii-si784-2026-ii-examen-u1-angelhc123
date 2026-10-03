export const SPORTS = ['Fútbol', 'Futsal', 'Básquet', 'Vóley', 'Tenis', 'eSports', 'Otro'];

export const FORMAT_LABELS = {
  RoundRobin: 'Todos contra todos',
  Knockout: 'Eliminación directa',
};

export const TOURNAMENT_STATUS = {
  Draft: { label: 'Borrador', tone: 'gray' },
  RegistrationOpen: { label: 'Inscripciones abiertas', tone: 'green' },
  InProgress: { label: 'En curso', tone: 'blue' },
  Finished: { label: 'Finalizado', tone: 'dark' },
};

export const REGISTRATION_STATUS = {
  Pending: { label: 'Pendiente', tone: 'amber' },
  Approved: { label: 'Aprobado', tone: 'green' },
  Rejected: { label: 'Rechazado', tone: 'red' },
};

export const MATCH_STATUS = {
  Scheduled: { label: 'Programado', tone: 'blue' },
  Played: { label: 'Jugado', tone: 'green' },
  Cancelled: { label: 'Cancelado', tone: 'red' },
};

export const ROLE_LABELS = { Player: 'Jugador / Capitán', Organizer: 'Organizador', Admin: 'Administrador' };

/** Fechas de torneo (solo día): se muestran en UTC para evitar desfases de zona horaria. */
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Fecha y hora local del partido. */
export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDayHeader(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

/** "2026-10-10" -> ISO UTC a medianoche */
export const dateInputToIso = (value) => (value ? `${value}T00:00:00Z` : null);

/** ISO -> "2026-10-10" (UTC) */
export const isoToDateInput = (iso) => (iso ? iso.slice(0, 10) : '');

/** "2026-10-10T15:30" (hora local) -> ISO UTC */
export const dateTimeInputToIso = (value) => (value ? new Date(value).toISOString() : null);

/** ISO -> "2026-10-10T15:30" en hora local, para inputs datetime-local */
export function isoToDateTimeInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
