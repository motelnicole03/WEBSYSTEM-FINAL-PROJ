import { api, downloadFile, errorMessage, fieldErrors } from './api.js';
import { requireRole } from './auth.js';
import { mountSite } from './layout.js';
import { $, $$, fmtDate, html, onClick, render } from './ui.js';

await requireRole(['student']);
await mountSite({});

let profile, programs = [], allSkills = [], resumes = [];
const selected = new Set();

const say = (id, text, ok = true) => { const el = $(id); el.textContent = text; el.className = `small ${ok ? '' : 'brand'}`; el.style.color = ok ? '#15803d' : ''; };
const formatSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

async function loadAll() {
  [profile, resumes, programs, allSkills] = await Promise.all([
    api.get('/students/me'), api.get('/resumes'), api.get('/lookups/programs'), api.get('/lookups/skills'),
  ]);
  selected.clear();
  profile.skills.forEach((s) => selected.add(s.skillId));
  paint();
}

function paintHeader() {
  const { percent, missing } = profile.profileCompleteness;
  render($('#completeness'), html`<div class="row between small"><span class="bold">Profile ${percent}% complete</span><span class="xs muted">${missing.length ? `To do: ${missing.join(', ')}` : 'All set!'}</span></div>
    <div class="progress mt-sm"><div style="width:${percent}%"></div></div>`);
}

function paintDetails() {
  render($('#details'), html`<div class="form-grid">
      <label class="field"><span>First name</span><input name="firstName" required value="${profile.firstName}"><small class="err" data-err="firstName"></small></label>
      <label class="field"><span>Last name</span><input name="lastName" required value="${profile.lastName}"><small class="err" data-err="lastName"></small></label>
      <label class="field"><span>Email</span><input value="${profile.email}" disabled></label>
      <label class="field"><span>Student number</span><input value="${profile.studentNumber}" disabled></label>
      <label class="field"><span>Program</span><select name="programId">${programs.map((p) => html`<option value="${p.programId}"${p.programId === profile.programId ? ' selected' : ''}>${p.programName}</option>`)}</select></label>
      <label class="field"><span>Year level</span><select name="yearLevel">${[1, 2, 3, 4, 5].map((y) => html`<option value="${y}"${y === profile.yearLevel ? ' selected' : ''}>${y}</option>`)}</select></label>
      <label class="field"><span>Available to start</span><input type="date" name="availability" value="${profile.availability ?? ''}"><small class="err" data-err="availability"></small></label>
    </div>
    <div class="row mt"><button class="btn primary sm">Save</button><span id="details-msg"></span></div>`);
}

function paintSkills() {
  render($('#skills'), html`<div class="chips">${allSkills.map((s) => html`<button type="button" class="chip" data-skill="${s.skillId}" aria-pressed="${selected.has(s.skillId)}">${s.skillName}</button>`)}</div>
    <div class="row mt"><button class="btn primary sm">Save</button><span id="skills-msg"></span></div>`);
}

function paintResumes() {
  render($('#resume-list'), resumes.length ? html`<ul style="margin-top:1rem">${resumes.map((r) => html`<li class="row-wrap between" style="padding:.75rem 0;border-top:1px solid var(--line)">
      <div style="min-width:0" class="small"><p class="truncate" style="font-weight:500">${r.fileName}${r.isDefault ? html` <span class="pill" style="background:var(--brand-soft);color:var(--brand);font-size:.6875rem">Default</span>` : ''}</p>
        <p class="muted xs">${formatSize(r.fileSize)} &middot; uploaded ${fmtDate(r.uploadedAt)}</p></div>
      <div class="row">
        <button class="btn ghost sm" data-download="${r.resumeId}">Download</button>
        ${r.isDefault ? '' : html`<button class="btn ghost sm" data-default="${r.resumeId}">Make default</button>`}
        <button class="btn ghost sm muted" data-delete="${r.resumeId}">Delete</button>
      </div></li>`)}</ul>` : html`<p class="muted small mt">No resumes yet.</p>`);
}

function paint() { paintHeader(); paintDetails(); paintSkills(); paintResumes(); }

// ---------- details ----------
$('#details').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.currentTarget));
  $$('[data-err]', e.currentTarget).forEach((el) => (el.textContent = ''));
  try {
    profile = await api.patch('/students/me', {
      firstName: f.firstName, lastName: f.lastName, programId: Number(f.programId), yearLevel: Number(f.yearLevel),
      availability: f.availability || null, // an empty date clears it
    });
    paintHeader();
    say('#details-msg', 'Details saved.');
  } catch (err) {
    for (const [name, text] of Object.entries(fieldErrors(err))) { const el = $(`[data-err="${name}"]`); if (el) el.textContent = text; }
    say('#details-msg', errorMessage(err), false);
  }
});

// ---------- skills ----------
onClick($('#skills'), '[data-skill]', (b) => {
  const id = Number(b.dataset.skill);
  if (selected.has(id)) selected.delete(id); else selected.add(id);
  b.setAttribute('aria-pressed', String(selected.has(id)));
});
$('#skills').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    profile = await api.put('/students/me/skills', { skillIds: [...selected] });
    paintHeader();
    say('#skills-msg', 'Skills saved.');
  } catch (err) { say('#skills-msg', errorMessage(err), false); }
});

// ---------- resumes ----------
async function resumeAction(fn, okText) {
  say('#resume-msg', '');
  try {
    await fn();
    [resumes, profile] = await Promise.all([api.get('/resumes'), api.get('/students/me')]);
    paintResumes(); paintHeader();
    if (okText) say('#resume-msg', okText);
  } catch (err) { say('#resume-msg', errorMessage(err), false); }
}

$('#resume-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = ''; // lets the same file be picked again later
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  form.append('isDefault', resumes.length === 0 ? 'true' : 'false'); // the first resume becomes the default
  resumeAction(() => api.postForm('/resumes', form), 'Resume uploaded.');
});
onClick($('#resume-list'), '[data-download]', (b) => {
  const r = resumes.find((x) => x.resumeId === Number(b.dataset.download));
  resumeAction(() => downloadFile(`/resumes/${r.resumeId}/download`, r.fileName));
});
onClick($('#resume-list'), '[data-default]', (b) => resumeAction(() => api.post(`/resumes/${b.dataset.default}/default`)));
onClick($('#resume-list'), '[data-delete]', (b) => {
  const r = resumes.find((x) => x.resumeId === Number(b.dataset.delete));
  if (confirm(`Delete ${r.fileName}?`)) resumeAction(() => api.delete(`/resumes/${r.resumeId}`), 'Resume deleted.');
});

try { await loadAll(); } catch (e) { render($('#completeness'), html`<p class="brand">${errorMessage(e)}</p>`); }
