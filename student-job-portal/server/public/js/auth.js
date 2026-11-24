import { api, token } from './api.js';

let current = null;
let loaded = false;

/** Who is logged in (or null). Reads the saved token once per page. */
export async function loadUser() {
  if (loaded) return current;
  loaded = true;
  if (!token.get()) return null;
  try {
    current = await api.get('/auth/me');
  } catch {
    token.clear(); // expired or invalid token
    current = null;
  }
  return current;
}

async function finish(result) {
  token.set(result.token);
  loaded = false;
  return loadUser();
}

export const login = async (email, password) => finish(await api.post('/auth/login', { email, password }));
export const register = async (payload) => finish(await api.post('/auth/register', payload));

export function logout() {
  token.clear();
  location.href = '/';
}

/** Where each role lands after logging in. */
export const homeFor = (role) => (role === 'employer' ? '/employer/index.html' : role === 'admin' ? '/admin/index.html' : '/');

/** Page guard: returns the user, or sends the visitor to the login page. */
export async function requireRole(roles) {
  const user = await loadUser();
  if (!user) {
    location.replace(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
    return new Promise(() => {}); // stop the page script while the browser redirects
  }
  if (!roles.includes(user.role)) {
    location.replace(homeFor(user.role));
    return new Promise(() => {});
  }
  return user;
}
