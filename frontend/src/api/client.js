const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5269').replace(/\/$/, '');
const TOKEN_KEY = 'torneo.token';

let unauthorizedHandler = null;

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor(message, status, fieldErrors = null) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toErrorMessage(data, status) {
  if (data?.errors) {
    return Object.values(data.errors).flat().join(' ');
  }
  if (data?.detail) return data.detail;
  if (status === 401) return 'Debe iniciar sesión.';
  if (status === 403) return 'No tiene permisos para realizar esta acción.';
  if (status === 404) return 'Recurso no encontrado.';
  return data?.title || `Error inesperado (${status}).`;
}

export async function request(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.', 0);
  }

  const data = parseBody(await res.text());

  if (!res.ok) {
    if (res.status === 401 && token && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(toErrorMessage(data, res.status), res.status, data?.errors ?? null);
  }
  return data;
}

export function toQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}
