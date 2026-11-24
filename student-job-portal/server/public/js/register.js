import { api, errorMessage, fieldErrors } from './api.js';
import { homeFor, register } from './auth.js';
import { mountSite } from './layout.js';
import { $, $$, html, notice, query, render } from './ui.js';

await mountSite({});

let role = query().get('role') === 'employer' ? 'employer' : 'student';
let programs = [];
try { programs = await api.get('/lookups/programs'); } catch { /* the dropdown stays empty */ }

const field = (name, label, { type = 'text', required = false, extra = '' } = {}) =>
  html`<label class="field"><span>${label}</span><input name="${name}" type="${type}" ${required ? 'required' : ''} ${extra}><small class="err" data-err="${name}"></small></label>`;

function paint() {
  $$('.seg button').forEach((b) => b.classList.toggle('active', b.dataset.role === role));
  render($('#fields'), role === 'student'
    ? html`<div class="form-grid" style="grid-template-columns:1fr 1fr">${field('firstName', 'First name', { required: true })}${field('lastName', 'Last name', { required: true })}</div>
      ${field('studentNumber', 'Student number', { required: true })}
      <label class="field"><span>Program</span><select name="programId" required><option value="">Select your program</option>${programs.map((p) => html`<option value="${p.programId}">${p.programName}</option>`)}</select></label>
      <label class="field"><span>Year level</span><select name="yearLevel">${[1, 2, 3, 4, 5].map((y) => html`<option value="${y}">${y}</option>`)}</select></label>`
    : html`${field('companyName', 'Company name', { required: true })}${field('industry', 'Industry')}${field('contactPerson', 'Contact person')}${field('address', 'Address')}
      <p class="notice">New employer accounts are verified by an admin before opportunities can be posted.</p>`);
}

$('.seg').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-role]');
  if (b) { role = b.dataset.role; paint(); }
});

$('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.currentTarget));
  const common = { role, email: form.email, password: form.password };
  const payload = role === 'student'
    ? { ...common, firstName: form.firstName, lastName: form.lastName, studentNumber: form.studentNumber, programId: Number(form.programId), yearLevel: Number(form.yearLevel) }
    : { ...common, companyName: form.companyName, industry: form.industry || undefined, contactPerson: form.contactPerson || undefined, address: form.address || undefined };

  const button = $('button[type="submit"]');
  button.disabled = true;
  $$('[data-err]').forEach((el) => (el.textContent = ''));
  notice($('#message'), '');
  try {
    const user = await register(payload);
    location.href = homeFor(user.role);
  } catch (err) {
    const errors = fieldErrors(err);
    for (const [name, text] of Object.entries(errors)) { const el = $(`[data-err="${name}"]`); if (el) el.textContent = text; }
    notice($('#message'), errorMessage(err));
    button.disabled = false;
  }
});

paint();
