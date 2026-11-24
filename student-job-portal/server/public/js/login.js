import { errorMessage } from './api.js';
import { homeFor, login } from './auth.js';
import { mountSite } from './layout.js';
import { $, notice, query } from './ui.js';

await mountSite({});

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = $('button', e.currentTarget);
  const form = new FormData(e.currentTarget);
  button.disabled = true;
  button.textContent = 'Logging in...';
  notice($('#message'), '');
  try {
    const user = await login(form.get('email'), form.get('password'));
    const next = query().get('next');
    // Only follow same-site paths, so a crafted link cannot send people elsewhere
    location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : homeFor(user.role);
  } catch (err) {
    notice($('#message'), errorMessage(err));
    button.disabled = false;
    button.textContent = 'Login';
  }
});
