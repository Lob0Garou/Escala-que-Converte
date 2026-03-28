import { supabase } from './supabase';

const LOCAL_API_BASE_URL = 'http://localhost:8787';

const getDefaultApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_API_BASE_URL;
  }

  return '';
};

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || getDefaultApiBaseUrl();

const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

const getAccessToken = async () => {
  if (!supabase) {
    throw new Error('Supabase nao configurado no frontend para autenticar chamadas da Cloud API.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message || 'Falha ao recuperar a sessao atual.');
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Sessao ausente ou expirada para consumir a Cloud API.');
  }

  return token;
};

const parseResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
};

const request = async (path, options = {}) => {
  const token = await getAccessToken();
  const headers = new Headers(options.headers || {});

  headers.set('Authorization', `Bearer ${token}`);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Falha na Cloud API (${response.status})`;
    throw new Error(message);
  }

  return payload;
};

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  request,
};

export default apiClient;
