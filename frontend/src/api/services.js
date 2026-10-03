import { request, toQuery } from './client';

export const authApi = {
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  me: () => request('/auth/me'),
};

export const tournamentsApi = {
  list: (filters = {}) => request(`/tournaments${toQuery(filters)}`),
  get: (id) => request(`/tournaments/${id}`),
  create: (data) => request('/tournaments', { method: 'POST', body: data }),
  update: (id, data) => request(`/tournaments/${id}`, { method: 'PUT', body: data }),
  changeStatus: (id, status) => request(`/tournaments/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id) => request(`/tournaments/${id}`, { method: 'DELETE' }),

  registrations: (id) => request(`/tournaments/${id}/registrations`),
  register: (id, teamId) => request(`/tournaments/${id}/registrations`, { method: 'POST', body: { teamId } }),
  setRegistrationStatus: (id, registrationId, status) =>
    request(`/tournaments/${id}/registrations/${registrationId}`, { method: 'PUT', body: { status } }),
  cancelRegistration: (id, registrationId) =>
    request(`/tournaments/${id}/registrations/${registrationId}`, { method: 'DELETE' }),

  generateFixture: (id, data) => request(`/tournaments/${id}/fixture`, { method: 'POST', body: data }),
  nextRound: (id, data) => request(`/tournaments/${id}/fixture/next-round`, { method: 'POST', body: data }),
  deleteFixture: (id) => request(`/tournaments/${id}/fixture`, { method: 'DELETE' }),

  standings: (id) => request(`/tournaments/${id}/standings`),
  report: (id) => request(`/tournaments/${id}/report`),
};

export const teamsApi = {
  list: (filters = {}) => request(`/teams${toQuery(filters)}`),
  get: (id) => request(`/teams/${id}`),
  myRegistrations: () => request('/teams/registrations'),
  create: (data) => request('/teams', { method: 'POST', body: data }),
  update: (id, data) => request(`/teams/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/teams/${id}`, { method: 'DELETE' }),
  addPlayer: (id, data) => request(`/teams/${id}/players`, { method: 'POST', body: data }),
  updatePlayer: (id, playerId, data) => request(`/teams/${id}/players/${playerId}`, { method: 'PUT', body: data }),
  removePlayer: (id, playerId) => request(`/teams/${id}/players/${playerId}`, { method: 'DELETE' }),
};

export const matchesApi = {
  list: (filters = {}) => request(`/matches${toQuery(filters)}`),
  get: (id) => request(`/matches/${id}`),
  create: (data) => request('/matches', { method: 'POST', body: data }),
  update: (id, data) => request(`/matches/${id}`, { method: 'PUT', body: data }),
  setResult: (id, data) => request(`/matches/${id}/result`, { method: 'PUT', body: data }),
  cancel: (id) => request(`/matches/${id}/cancel`, { method: 'PATCH' }),
  remove: (id) => request(`/matches/${id}`, { method: 'DELETE' }),
};
