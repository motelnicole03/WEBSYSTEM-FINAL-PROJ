import { api, errorMessage, fieldErrors } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, $$, html, notice, onClick, query, render, toLocalInput } from './ui.js';

await mountPortal('employer', 'jobs');
const id = query().get('id');
const editing = !!id;
render($('#head'), pageTitle(editing ? 'Edit posting' : 'New posting', 'Fill in the details students will see.'));

const selected = new Set();
let status = 'draft';
let programs = [], skills = [];
let d = {};
try {
  [programs, skills] = await Promise.all([api.get('/lookups/programs'), api.get('/lookups/skills')]);
  if (editing) {
    d = await api.get(`/opportunities/${id}`);
    status = d.status;
    d.skills.forEach((s) => selected.add(s.id));
  }
} catch (e) { notice($('#message'), errorMessage(e)); }

const err = (k) => html`<small class="err" data-err="${k}"></small>`;
const sel = (a, b) => (a === b ? ' selected' : '');
render($('#form'), html`
  <section class="card"><h3>Basics</h3><div class="form-grid">
    <label class="field" style="grid-column:1/-1"><span>Title</span><input name="title" required minlength="3" value="${d.title ?? ''}" placeholder="IT Support Student Trainee">${err('title')}</label>
    <label class="field"><span>Type</span><select name="type">${['internship', 'ojt', 'job'].map((t) => html`<option value="${t}"${sel(t, d.type ?? 'internship')}>${t === 'ojt' ? 'OJT' : t[0].toUpperCase() + t.slice(1)}</option>`)}</select></label>
    <label class="field"><span>Work setup</span><select name="workSetup"><option value="">Not specified</option>${['onsite', 'remote', 'hybrid'].map((t) => html`<option value="${t}"${sel(t, d.workSetup)}>${t[0].toUpperCase() + t.slice(1)}</option>`)}</select></label>
    <label class="field"><span>Location</span><input name="location" value="${d.location ?? ''}" placeholder="Batangas City, Philippines">${err('location')}</label>
    <label class="field"><span>Allowance / salary (PHP)</span><input name="allowanceSalary" type="number" min="0" value="${d.allowanceSalary ?? ''}">${err('allowanceSalary')}</label>
    <label class="field"><span>Slots</span><input name="slots" type="number" min="1" value="${d.slots ?? 1}">${err('slots')}</label>
    <label class="field"><span>Deadline</span><input name="deadline" type="datetime-local" value="${toLocalInput(d.deadline)}">${err('deadline')}</label>
    <label class="field" style="grid-column:1/-1"><span>Open to program</span><select name="programId"><option value="">All programs</option>${programs.map((p) => html`<option value="${p.programId}"${sel(p.programId, d.programId)}>${p.programName}</option>`)}</select></label>
  </div></section>
  <section class="card mt"><h3>Description</h3>
    <p class="xs muted">Tip: start a line with <code>-</code> for a bullet, and end a short line with a colon for a heading, like "Key Responsibilities:".</p>
    <label class="field mt-sm"><span>About the role</span><textarea name="description" rows="6">${d.description ?? ''}</textarea>${err('description')}</label>
    <label class="field"><span>Requirements / qualifications</span><textarea name="requirements" rows="6">${d.requirements ?? ''}</textarea>${err('requirements')}</label></section>
  <section class="card mt"><h3>Skills</h3><div class="chips" id="skills">${skills.map((s) => html`<button type="button" class="chip" data-skill="${s.skillId}" aria-pressed="${selected.has(s.skillId)}">${s.skillName}</button>`)}</div></section>
  <div class="row-wrap mt">
    <button class="btn ghost" data-submit="no">${editing ? 'Save changes' : 'Save as draft'}</button>
    ${!editing || status === 'draft' ? html`<button type="button" class="btn primary" data-submit="yes">Save and submit for approval</button>` : ''}
    <a class="xs muted" href="/employer/jobs.html">Cancel</a>
  </div>`);

onClick($('#form'), '[data-skill]', (b) => {
  const sid = Number(b.dataset.skill);
  if (selected.has(sid)) selected.delete(sid); else selected.add(sid);
  b.setAttribute('aria-pressed', String(selected.has(sid)));
});

let submitAfter = false;
onClick($('#form'), '[data-submit]', (b) => { submitAfter = b.dataset.submit === 'yes'; if (submitAfter) $('#form').requestSubmit(); });

$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.currentTarget));
  const payload = {
    type: f.type, title: f.title,
    description: f.description || undefined, requirements: f.requirements || undefined,
    location: f.location || undefined, workSetup: f.workSetup || undefined,
    allowanceSalary: f.allowanceSalary ? Number(f.allowanceSalary) : undefined,
    slots: Number(f.slots) || 1,
    deadline: f.deadline ? new Date(f.deadline).toISOString() : undefined,
    programId: f.programId ? Number(f.programId) : undefined,
    skillIds: [...selected],
  };
  const buttons = $$('button', e.currentTarget);
  buttons.forEach((b) => (b.disabled = true));
  $$('[data-err]').forEach((el) => (el.textContent = ''));
  notice($('#message'), '');
  try {
    let oppId = id;
    if (editing) await api.patch(`/opportunities/${id}`, payload);
    else oppId = String((await api.post('/opportunities', payload)).opportunityId);
    if (submitAfter && (status === 'draft' || !editing)) await api.post(`/opportunities/${oppId}/submit`);
    location.href = '/employer/jobs.html';
  } catch (err2) {
    for (const [name, text] of Object.entries(fieldErrors(err2))) { const el = $(`[data-err="${name}"]`); if (el) el.textContent = text; }
    notice($('#message'), errorMessage(err2));
    buttons.forEach((b) => (b.disabled = false));
    submitAfter = false;
  }
});
