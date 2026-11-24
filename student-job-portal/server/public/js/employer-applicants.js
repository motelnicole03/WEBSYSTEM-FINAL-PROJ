import { api, downloadFile, errorMessage } from './api.js';
import { openChat } from './chat.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, cap, fmtDate, fmtDateTime, html, initial, notice, onClick, query, render, statusPill } from './ui.js';

await mountPortal('employer', 'applicants');
render($('#head'), pageTitle('Applicants', 'Review applications and move them through the hiring steps.'));

// What an employer may do next, from each status (mirrors the server rules)
const NEXT = {
  submitted: [['under_review', 'Start review']], under_review: [['shortlisted', 'Shortlist']],
  interview: [['offered', 'Make offer']], offered: [['hired', 'Mark as hired']],
};
const CAN_REJECT = ['submitted', 'under_review', 'shortlisted', 'interview', 'offered'];
const STATUSES = ['submitted', 'under_review', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'declined', 'withdrawn'];

let postings = [], list = [], filter = '', openId = null, scheduleFor = null;
const details = new Map();
let opportunityId = Number(query().get('opportunityId')) || null;

try {
  postings = await api.get('/opportunities/mine');
  if (!opportunityId) opportunityId = (postings.find((p) => p.applicationsCount > 0) ?? postings[0])?.opportunityId ?? null;
} catch (e) { notice($('#message'), errorMessage(e)); }

function paintFilters() {
  render($('#filters'), html`<label class="field" style="margin:0"><span>Posting</span><select id="posting">${postings.map((p) => html`<option value="${p.opportunityId}"${p.opportunityId === opportunityId ? ' selected' : ''}>${p.title} (${p.applicationsCount})</option>`)}</select></label>
    <label class="field" style="margin:0"><span>Status</span><select id="status"><option value="">All</option>${STATUSES.map((s) => html`<option value="${s}"${s === filter ? ' selected' : ''}>${cap(s)}</option>`)}</select></label>`);
}

async function loadList() {
  if (!opportunityId) { render($('#list'), html`<p class="small muted">Create a posting first. Applicants will appear here.</p>`); return; }
  try {
    list = await api.get(`/applications/opportunity/${opportunityId}${filter ? `?status=${filter}` : ''}`);
    paintList();
  } catch (e) { notice($('#message'), errorMessage(e)); }
}

function paintList() {
  const title = postings.find((p) => p.opportunityId === opportunityId)?.title ?? '';
  render($('#list'), list.length ? html`${list.map((a) => {
    const open = openId === a.applicationId;
    const d = details.get(a.applicationId);
    return html`<article class="item" style="padding:0">
      <div class="row-wrap between" style="padding:1rem">
        <button class="row grow" data-toggle="${a.applicationId}" style="text-align:left;background:none;border:0;cursor:pointer;min-width:0" aria-expanded="${open}">
          <span class="avatar">${initial(a.firstName)}</span>
          <span class="small" style="min-width:0"><span class="t truncate" style="display:block;font-weight:500">${a.firstName} ${a.lastName}</span>
            <span class="muted xs truncate" style="display:block">${a.programName} · Year ${a.yearLevel} · applied ${fmtDate(a.submittedAt)}</span></span>
        </button>${statusPill(a.currentStatus)}</div>
      ${open ? html`<div class="small" style="border-top:1px solid var(--line);padding:1rem">
        ${!d ? html`<p class="muted">Loading...</p>` : html`
          <p class="xs muted">${a.studentEmail} · ${a.studentNumber}</p>
          ${d.coverLetter ? html`<div class="mt-sm"><p class="xs bold">Cover letter</p><p style="white-space:pre-line">${d.coverLetter}</p></div>` : ''}
          <div class="row-wrap mt-sm">${d.files.length ? d.files.map((f) => html`<button class="btn ghost sm" data-file="${a.applicationId}:${f.fileId}">Download ${f.fileType}: ${f.fileName}</button>`) : html`<span class="xs muted">No files attached.</span>`}</div>
          <div class="mt-sm"><p class="xs bold">History</p><ul class="xs muted">${d.history.map((h) => html`<li>${fmtDateTime(h.changedAt)} · ${cap(h.status)}${h.changedByRole ? ` by ${h.changedByRole}` : ''}${h.remarks ? ` (${h.remarks})` : ''}</li>`)}</ul></div>`}
        <div class="row-wrap mt">
          ${(NEXT[a.currentStatus] ?? []).map(([s, label]) => html`<button class="btn primary sm" data-move="${s}" data-id="${a.applicationId}">${label}</button>`)}
          ${a.currentStatus === 'shortlisted' || a.currentStatus === 'interview' ? html`<button class="btn primary sm" data-schedule="${a.applicationId}">${a.currentStatus === 'shortlisted' ? 'Schedule interview' : 'Schedule another round'}</button>` : ''}
          <button class="btn ghost sm" data-chat="${a.applicationId}">Message</button>
          ${CAN_REJECT.includes(a.currentStatus) ? html`<button class="btn ghost sm" data-reject="${a.applicationId}" style="color:var(--admin-number)">Reject</button>` : ''}
        </div>
        ${scheduleFor === a.applicationId ? html`<form class="card mt" data-schedule-form="${a.applicationId}" style="background:var(--admin-bg)">
          <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))">
            <label class="field"><span>Date and time</span><input type="datetime-local" name="when" required></label>
            <label class="field"><span>Mode</span><select name="mode"><option value="online">Online</option><option value="onsite">Onsite</option><option value="phone">Phone</option></select></label>
            <label class="field"><span>Link / venue / notes</span><input name="where"></label></div>
          <button class="btn primary sm">Send interview invite</button></form>` : ''}
      </div>` : ''}</article>`;
  })}` : html`<p class="small muted">No applicants for this posting${filter ? ' with that status' : ''}.</p>`);
  $('#list').dataset.title = title;
}

async function openApplicant(id) {
  openId = openId === id ? null : id;
  scheduleFor = null;
  paintList();
  if (openId && !details.has(id)) {
    try { details.set(id, await api.get(`/applications/${id}`)); paintList(); } catch (e) { notice($('#message'), errorMessage(e)); }
  }
}

async function run(id, fn) {
  notice($('#message'), '');
  try { await fn(); details.delete(id); await loadList(); if (openId) openApplicant_reload(id); } catch (e) { notice($('#message'), errorMessage(e)); }
}
async function openApplicant_reload(id) {
  try { details.set(id, await api.get(`/applications/${id}`)); paintList(); } catch { /* keep the list as is */ }
}

const root = $('#list');
onClick(root, '[data-toggle]', (b) => openApplicant(Number(b.dataset.toggle)));
onClick(root, '[data-move]', (b) => { const id = Number(b.dataset.id); run(id, () => api.patch(`/applications/${id}/status`, { status: b.dataset.move })); });
onClick(root, '[data-reject]', (b) => {
  const id = Number(b.dataset.reject);
  const a = list.find((x) => x.applicationId === id);
  const reason = prompt(`Reject ${a.firstName} ${a.lastName}? Add a short note for the record (optional):`);
  if (reason !== null) run(id, () => api.patch(`/applications/${id}/status`, { status: 'rejected', remarks: reason.trim() || undefined }));
});
onClick(root, '[data-chat]', (b) => {
  const a = list.find((x) => x.applicationId === Number(b.dataset.chat));
  openChat({ applicationId: a.applicationId, name: `${a.firstName} ${a.lastName}`, subtitle: root.dataset.title });
});
onClick(root, '[data-file]', (b) => {
  const [appId, fileId] = b.dataset.file.split(':');
  const f = details.get(Number(appId)).files.find((x) => x.fileId === Number(fileId));
  downloadFile(`/applications/${appId}/files/${fileId}`, f.fileName).catch((e) => notice($('#message'), errorMessage(e)));
});
onClick(root, '[data-schedule]', (b) => { const id = Number(b.dataset.schedule); scheduleFor = scheduleFor === id ? null : id; paintList(); });
root.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-schedule-form]');
  if (!form) return;
  e.preventDefault();
  const id = Number(form.dataset.scheduleForm);
  const f = Object.fromEntries(new FormData(form));
  run(id, async () => {
    await api.post('/interviews', { applicationId: id, schedule: new Date(f.when).toISOString(), mode: f.mode, linkOrVenue: f.where || undefined });
    scheduleFor = null;
  });
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'posting') { opportunityId = Number(e.target.value); openId = null; history.replaceState(null, '', `?opportunityId=${opportunityId}`); loadList(); }
  if (e.target.id === 'status') { filter = e.target.value; openId = null; loadList(); }
});

paintFilters();
await loadList();
