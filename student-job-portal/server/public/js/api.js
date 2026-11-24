// The only file that talks to the backend. Pages never call fetch directly.

const TOKEN_KEY = 'sc_token';

export const token = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } // storage can be blocked
  },
  set(value) {
    try { localStorage.setItem(TOKEN_KEY, value); } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details; // [{ field, message }] for validation errors
  }
}

function authHeaders() {
  const t = token.get();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function send(path, options) {
  try {
    return await fetch(`/api${path}`, options);
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }
}

async function request(method, path, body) {
  const headers = authHeaders();
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await send(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });

  if (response.status === 204) return undefined;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.error ?? 'Something went wrong', data?.details);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),

  /** Multipart upload (files). The browser sets the Content-Type itself. */
  async postForm(path, form) {
    const response = await send(path, { method: 'POST', headers: authHeaders(), body: form });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, data?.error ?? 'Upload failed', data?.details);
    return data;
  },
};

/** Downloads a file that needs the login token, then saves it through the browser. */
export async function downloadFile(path, fileName) {
  const response = await send(path, { headers: authHeaders() });
  if (!response.ok) throw new ApiError(response.status, 'Could not download the file');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Turns a validation error into { field: message } to show under inputs. */
export function fieldErrors(error) {
  if (!(error instanceof ApiError) || !error.details) return {};
  return Object.fromEntries(error.details.map((d) => [d.field, d.message]));
}

export const errorMessage = (error) => (error instanceof Error ? error.message : 'Something went wrong');
