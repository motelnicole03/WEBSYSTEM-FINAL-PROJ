// Adds a "show password" eye button to every password box on the page, including boxes drawn later.
// ui.js loads this file, so every page gets the eye without any change to its HTML.
// It is wrapped in try/catch: if it ever fails, the page itself must keep working.

const EYE = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2"/><path d="M6.7 6.7C3.9 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

const STYLE = `
.pw-wrap { position: relative; display: block; }
.field > .pw-wrap { margin-bottom: 0; font-weight: 400; }
.pw-wrap > input.pw-input { padding-right: 2.75rem; }
.pw-eye { position: absolute; top: 50%; right: .35rem; display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; margin-top: -1rem; padding: 0; border: 0; border-radius: .375rem; background: none; color: var(--muted); cursor: pointer; }
.pw-eye:hover { color: var(--brand); }
.pw-eye:focus-visible { outline: 2px solid var(--brand); outline-offset: 1px; }`;

// Shows or hides what is typed, and keeps the button's label and icon in step
function setShown(input, button, shown) {
  input.type = shown ? 'text' : 'password';
  button.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
  button.setAttribute('aria-pressed', String(shown));
  button.innerHTML = shown ? EYE_OFF : EYE;
}

function enhance(input) {
  if (input.dataset.eye || !input.parentNode) return; // already done, or not on the page
  input.dataset.eye = '1';
  input.classList.add('pw-input');

  const wrap = document.createElement('span');
  wrap.className = 'pw-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const button = document.createElement('button');
  button.type = 'button'; // never submits the form
  button.className = 'pw-eye';
  setShown(input, button, false);
  button.addEventListener('click', () => {
    setShown(input, button, input.type === 'password');
    input.focus();
  });
  wrap.appendChild(button);

  // Hide the password again once the form is sent or cleared
  const hide = () => setShown(input, button, false);
  input.form?.addEventListener('submit', hide);
  input.form?.addEventListener('reset', hide);
}

function scan() {
  document.querySelectorAll('input[type="password"]:not([data-eye])').forEach(enhance);
}

try {
  if (typeof document !== 'undefined') {
    if (!document.getElementById('pw-eye-style')) {
      const style = document.createElement('style');
      style.id = 'pw-eye-style';
      style.textContent = STYLE;
      document.head.appendChild(style);
    }
    scan();
    // Forms that a page draws later (like the Settings forms) get the eye too
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  }
} catch (error) {
  console.error('password-toggle failed', error);
}