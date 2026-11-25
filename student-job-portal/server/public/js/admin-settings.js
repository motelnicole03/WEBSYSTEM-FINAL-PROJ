// Admin Settings: my account, programs and skills, and help & support.
import { api, errorMessage, fieldErrors } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, $$, fmtDate, html, onClick, render } from './ui.js';

const user = await mountPortal('admin', 'settings');
render($('#head'), pageTitle('Settings', 'Manage your admin account, the lists people choose from, and get help.'));

const CATEGORY = {
  not_working: 'Something is not working',
  wrong_info: 'Wrong or missing information',
  account: 'Account or login issue',
  suggestion: 'Suggestion',
  other: 'Other',
};

let programs = [], skills = [], reports = [];

const say = (sel, text, ok = true) => { const el = $(sel); el.textContent = text; el.className = `small ${ok ? '' : 'brand'}`; el.style.color = ok ? '#15803d' : ''; };
const clearErrors = (form) => $$('[data-err]', form).forEach((el) => (el.textContent = ''));
const showErrors = (form, err) => {
  for (const [name, text] of Object.entries(fieldErrors(err))) { const el = $(`[data-err="${name}"]`, form); if (el) el.textContent = text; }
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- my account ----------
render($('#who'), html`<div><p class="muted xs">Signed in as</p><p class="bold">${user.email}</p></div>
  <div><p class="muted xs">Role</p><span class="pill gray">Admin</span></div>`);

$('#pw').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const f = Object.fromEntries(new FormData(form));
  clearErrors(form); say('#pw-msg', '');
  if (f.newPassword !== f.confirmPassword) { $('[data-err="confirmPassword"]', form).textContent = 'The passwords do not match'; return; }
  try {
    await api.post('/settings/password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
    form.reset();
    say('#pw-msg', 'Password updated.');
  } catch (err) {
    showErrors(form, err);
    say('#pw-msg', errorMessage(err), false);
  }
});

// ---------- programs ----------
function paintPrograms() {
  render($('#programs'), programs.length
    ? html`${programs.map((p) => html`<div class="set-row">
        <div class="small"><p>${p.programName}</p><p class="muted xs">${plural(p.studentCount, 'student')}</p></div>
        ${p.studentCount > 0
          ? html`<button class="btn ghost sm" disabled>In use</button>`
          : html`<button class="btn ghost sm" data-del-program="${p.programId}">Delete</button>`}
      </div>`)}`
    : html`<p class="muted small">No programs yet.</p>`);
}

$('#program-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const name = String(new FormData(form).get('name') ?? '').trim();
  if (!name) return say('#program-msg', 'Enter a program name.', false);
  try {
    await api.post('/settings/programs', { name });
    form.reset();
    programs = await api.get('/settings/programs'); paintPrograms();
    say('#program-msg', `Added “${name}”.`);
  } catch (err) { say('#program-msg', errorMessage(err), false); }
});

onClick($('#programs'), '[data-del-program]', async (b) => {
  const p = programs.find((x) => x.programId === Number(b.dataset.delProgram));
  if (!confirm(`Delete the program “${p.programName}”?`)) return;
  try {
    await api.delete(`/settings/programs/${p.programId}`);
    programs = await api.get('/settings/programs'); paintPrograms();
    say('#program-msg', `Deleted “${p.programName}”.`);
  } catch (err) { say('#program-msg', errorMessage(err), false); }
});

// ---------- skills ----------
function paintSkills() {
  render($('#skills'), skills.length
    ? html`<div class="chips">${skills.map((s) => html`<span class="chip tag" style="display:inline-flex;align-items:center;gap:.4rem;padding-right:.35rem">${s.skillName}<button type="button" class="x" aria-label="Remove ${s.skillName}" data-del-skill="${s.skillId}">&times;</button></span>`)}</div>`
    : html`<p class="muted small">No skills yet.</p>`);
}

$('#skill-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const name = String(new FormData(form).get('name') ?? '').trim();
  if (!name) return say('#skill-msg', 'Enter a skill name.', false);
  try {
    await api.post('/settings/skills', { name });
    form.reset();
    skills = await api.get('/settings/skills'); paintSkills();
    say('#skill-msg', `Added “${name}”.`);
  } catch (err) { say('#skill-msg', errorMessage(err), false); }
});

onClick($('#skills'), '[data-del-skill]', async (b) => {
  const s = skills.find((x) => x.skillId === Number(b.dataset.delSkill));
  const used = s.studentCount + s.jobCount > 0
    ? `\n\nIt is used by ${plural(s.studentCount, 'student')} and ${plural(s.jobCount, 'job post')}. It will be removed from them.` : '';
  if (!confirm(`Delete the skill “${s.skillName}”?${used}`)) return;
  try {
    await api.delete(`/settings/skills/${s.skillId}`);
    skills = await api.get('/settings/skills'); paintSkills();
    say('#skill-msg', `Deleted “${s.skillName}”.`);
  } catch (err) { say('#skill-msg', errorMessage(err), false); }
});

// ---------- help & support ----------
render($('#report-category'), html`${Object.entries(CATEGORY).map(([value, label]) => html`<option value="${value}">${label}</option>`)}`);

function paintReports() {
  render($('#reports'), reports.length
    ? html`${reports.map((r) => html`<div class="set-row">
        <div class="small" style="min-width:0"><p class="truncate">${CATEGORY[r.category] ?? r.category}</p>
          <p class="muted xs truncate">${r.description}</p><p class="muted xs">Sent ${fmtDate(r.createdAt)}</p></div>
        <span class="pill ${r.status === 'resolved' ? 'green' : 'amber'}">${r.status === 'resolved' ? 'Resolved' : 'Open'}</span>
      </div>`)}`
    : html`<p class="muted small">You have not sent any reports yet.</p>`);
}

$('#report-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const f = Object.fromEntries(new FormData(form));
  clearErrors(form); say('#report-msg', '');
  try {
    await api.post('/settings/reports', { category: f.category, page: String(f.page ?? '').trim() || null, description: f.description });
    form.reset();
    reports = await api.get('/settings/reports'); paintReports();
    say('#report-msg', 'Report sent. Thank you!');
  } catch (err) {
    showErrors(form, err);
    say('#report-msg', errorMessage(err), false);
  }
});

// ---------- blocked & removed ----------
const STATUS = { active: ['green', 'Active'], pending: ['amber', 'Pending'], suspended: ['amber', 'Blocked'], inactive: ['gray', 'Removed'] };
const statusPill = (status) => { const [tone, label] = STATUS[status] ?? STATUS.active; return html`<span class="pill ${tone}">${label}</span>`; };
const typeLabel = (a) => (a.role === 'employer' ? 'Company' : 'Student');
const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '');
const whenLong = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const isRestricted = (a) => a.status === 'suspended' || a.status === 'inactive';

let restricted = [], found = [], lastQuery = '', rfilter = 'all';
let activity = [], afilter = 'all';

const accountActions = (a) => (isRestricted(a)
  ? html`<button class="btn ghost sm" data-restore="${a.userId}">${a.status === 'suspended' ? 'Unblock' : 'Restore'}</button>`
  : html`<button class="btn ghost sm" data-block="${a.userId}">Block</button><button class="btn ghost sm" data-remove="${a.userId}">Remove</button>`);

function paintFound() {
  render($('#find-results'), !lastQuery ? html`` : found.length
    ? html`${found.map((a) => html`<div class="set-row">
        <div class="small"><p>${a.name} <span class="muted xs">&middot; ${typeLabel(a)}</span></p>
          <p class="muted xs">${a.email}${a.studentNumber ? ` · ${a.studentNumber}` : ''}</p></div>
        <div class="row">${statusPill(a.status)}${accountActions(a)}</div>
      </div>`)}`
    : html`<p class="muted small">No matching accounts.</p>`);
}

function paintRestricted() {
  const shown = restricted.filter((a) => rfilter === 'all' || a.role === rfilter || a.status === rfilter);
  render($('#restricted'), shown.length
    ? html`${shown.map((a) => html`<div class="set-row" style="align-items:flex-start">
        <div class="small" style="min-width:0;flex:1"><p><b>${a.name}</b> <span class="muted xs">&middot; ${typeLabel(a)}</span></p>
          <p class="muted xs">${a.email}</p>
          ${a.restrictionReason ? html`<p class="muted xs">Reason: ${a.restrictionReason}</p>` : ''}</div>
        <div class="small" style="width:8rem">${statusPill(a.status)}<p class="muted xs" style="margin-top:.25rem">${shortDate(a.restrictedAt)}</p></div>
        ${accountActions(a)}
      </div>`)}`
    : html`<p class="muted small">Nothing here.</p>`);
}

const lookup = (id) => [...found, ...restricted].find((a) => a.userId === Number(id));

async function refreshModeration() {
  restricted = await api.get('/moderation/restricted');
  paintRestricted();
  if (lastQuery) { found = await api.get(`/moderation/search?q=${encodeURIComponent(lastQuery)}`); paintFound(); }
  await loadActivity();
}

// The pressed state of a row of filter chips
function wireFilter(box, key, onChange) {
  onClick(box, `[data-${key}]`, (button) => {
    $$(`[data-${key}]`, box).forEach((el) => el.setAttribute('aria-pressed', String(el === button)));
    onChange(button.dataset[key]);
  });
}
wireFilter($('#restricted-filters'), 'rfilter', (value) => { rfilter = value; paintRestricted(); });

$('#find-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
  if (q.length < 2) return say('#find-msg', 'Type at least 2 characters.', false);
  say('#find-msg', '');
  try {
    lastQuery = q;
    found = await api.get(`/moderation/search?q=${encodeURIComponent(q)}`);
    paintFound();
  } catch (err) { say('#find-msg', errorMessage(err), false); }
});

// Block and Remove ask for a reason first
const dialog = $('#reason-dialog');
let pending = null; // { userId, action: 'block' | 'remove', name }

function askReason(account, action) {
  pending = { userId: account.userId, action, name: account.name };
  $('#reason-title').textContent = `${action === 'block' ? 'Block' : 'Remove'} ${account.name}?`;
  $('#reason-sub').textContent = `${action === 'block' ? 'They cannot sign in until you unblock them.' : 'They cannot sign in, and you can restore the account later.'}${account.role === 'employer' ? ' Their job posts are hidden from students.' : ''}`;
  $('#reason-form').reset();
  $('#reason-err').textContent = '';
  dialog.showModal();
}

$('#reason-cancel').addEventListener('click', () => dialog.close());
$('#reason-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const reason = String(new FormData(e.currentTarget).get('reason') ?? '').trim();
  if (reason.length < 3) { $('#reason-err').textContent = 'Please give a short reason.'; return; }
  try {
    await api.post(`/moderation/accounts/${pending.userId}/${pending.action}`, { reason });
    dialog.close();
    await refreshModeration();
    say('#find-msg', `${pending.name} was ${pending.action === 'block' ? 'blocked' : 'removed'}.`);
  } catch (err) { $('#reason-err').textContent = errorMessage(err); }
});

for (const box of [$('#find-results'), $('#restricted')]) {
  onClick(box, '[data-block]', (b) => askReason(lookup(b.dataset.block), 'block'));
  onClick(box, '[data-remove]', (b) => askReason(lookup(b.dataset.remove), 'remove'));
  onClick(box, '[data-restore]', async (b) => {
    const a = lookup(b.dataset.restore);
    if (!confirm(`${a.status === 'suspended' ? 'Unblock' : 'Restore'} ${a.name}?`)) return;
    try {
      await api.post(`/moderation/accounts/${a.userId}/restore`);
      await refreshModeration();
      say('#find-msg', `${a.name} can sign in again.`);
    } catch (err) { say('#find-msg', errorMessage(err), false); }
  });
}

// ---------- my activity ----------
const ACTION = {
  approved: ['green', 'Approved'], rejected: ['red', 'Rejected'], blocked: ['amber', 'Blocked'],
  unblocked: ['green', 'Unblocked'], removed: ['gray', 'Removed'], restored: ['green', 'Restored'],
};
const TARGET = { company: ['Company', 'company'], student: ['Student', 'student'], job: ['Job post', 'job post'] };

function paintActivity() {
  render($('#activity-list'), activity.length
    ? html`${activity.map((a) => {
        const [tone, label] = ACTION[a.action] ?? ['gray', a.action];
        const [typeName, noun] = TARGET[a.targetType] ?? [a.targetType, 'item'];
        return html`<div class="set-row" style="align-items:flex-start">
          <div class="muted xs" style="width:9rem;flex:none;padding-top:.15rem">${whenLong(a.createdAt)}</div>
          <div class="small" style="flex:1;min-width:12rem">
            <span class="pill ${tone}">${label}</span> <span class="muted xs">${typeName}</span>
            <p style="margin-top:.35rem">You ${a.action} the ${noun} <b>${a.targetLabel}</b></p>
            ${a.details ? html`<p class="muted xs">${a.targetType === 'job' ? 'Posted by' : 'Reason:'} ${a.details}</p>` : ''}
          </div></div>`;
      })}`
    : html`<p class="muted small">No activity for this filter yet.</p>`);
}

async function loadActivity() {
  try {
    activity = await api.get(`/moderation/activity?type=${afilter}&days=${$('#activity-days').value}`);
    paintActivity();
  } catch (err) { render($('#activity-list'), html`<p class="brand small">${errorMessage(err)}</p>`); }
}
wireFilter($('#activity-filters'), 'afilter', (value) => { afilter = value; loadActivity(); });
$('#activity-days').addEventListener('change', loadActivity);

// ---------- load ----------
try {
  [programs, skills, reports, restricted, activity] = await Promise.all([
    api.get('/settings/programs'), api.get('/settings/skills'), api.get('/settings/reports'),
    api.get('/moderation/restricted'), api.get('/moderation/activity?type=all&days=30'),
  ]);
  paintPrograms(); paintSkills(); paintReports(); paintRestricted(); paintActivity();
} catch (err) { say('#program-msg', errorMessage(err), false); }