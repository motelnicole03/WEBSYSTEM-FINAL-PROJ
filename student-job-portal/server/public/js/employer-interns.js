import { api, errorMessage } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, fmtDate, html, initial, internPill, notice, onClick, render } from './ui.js';

await mountPortal('employer', 'interns');
render($('#head'), pageTitle('Interns', 'Students you hired for an internship or OJT. Mark them as done, remove them, and issue a certificate of completion.'));

const TABS = [['all', 'All'], ['ongoing', 'Ongoing'], ['completed', 'Completed'], ['removed', 'Removed']];
let interns = [], tab = 'ongoing', certFor = null;

async function load() {
  try {
    interns = await api.get('/internships');
    // Open on the first tab that has someone in it
    if (!interns.some((i) => i.internshipStatus === tab)) tab = 'all';
    paint();
  } catch (e) { notice($('#message'), errorMessage(e)); }
}

const countOf = (key) => (key === 'all' ? interns.length : interns.filter((i) => i.internshipStatus === key).length);

function actions(i) {
  if (i.internshipStatus === 'ongoing') {
    return html`<button class="btn primary sm" data-done="${i.applicationId}">Mark as done</button>
      <button class="btn ghost sm" data-remove="${i.applicationId}" style="color:var(--admin-number)">Remove</button>`;
  }
  if (i.internshipStatus === 'completed') {
    return i.certificateId
      ? html`<a class="btn primary sm" href="/certificate.html?id=${i.applicationId}">View certificate</a>`
      : html`<button class="btn primary sm" data-cert="${i.applicationId}">Issue certificate</button>`;
  }
  return '';
}

function paint() {
  render($('#tabs'), html`${TABS.map(([key, label]) => html`<button class="tab${key === tab ? ' active' : ''}" data-tab="${key}">${label} (${countOf(key)})</button>`)}`);
  const visible = tab === 'all' ? interns : interns.filter((i) => i.internshipStatus === tab);

  render($('#list'), visible.length ? html`${visible.map((i) => html`<article class="item">
    <div class="row-wrap between">
      <div class="row grow">
        <span class="avatar">${initial(i.firstName)}</span>
        <span class="small" style="min-width:0"><span class="t truncate" style="display:block;font-weight:500">${i.firstName} ${i.lastName}</span>
          <span class="muted xs" style="display:block">${i.programName} · ${i.studentNumber}</span>
          <span class="muted xs" style="display:block">${i.opportunityTitle}${i.startedAt ? ` · started ${fmtDate(i.startedAt)}` : ''}${i.internshipEndedAt && i.internshipStatus !== 'ongoing' ? ` · ${i.internshipStatus === 'removed' ? 'removed' : 'finished'} ${fmtDate(i.internshipEndedAt)}` : ''}</span></span>
      </div>
      <div class="row-wrap">${internPill(i.internshipStatus)}${i.certificateId ? html`<span class="pill emerald">Certificate issued</span>` : ''}</div>
    </div>
    ${i.internshipStatus === 'removed' && i.internshipRemarks ? html`<p class="xs muted mt-sm">Reason: ${i.internshipRemarks}</p>` : ''}
    <div class="row-wrap mt">${actions(i)}<a class="btn ghost sm" href="/employer/student.html?id=${i.studentId}">View profile</a></div>
    ${certFor === i.applicationId ? html`<form class="card mt" data-cert-form="${i.applicationId}" style="background:var(--admin-bg)">
      <p class="xs muted" style="margin-bottom:.75rem">The certificate shows ${i.firstName}'s name, program, position, company and dates. Both fields below are optional.</p>
      <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))">
        <label class="field"><span>Hours rendered</span><input type="number" name="hours" min="1" max="5000" step="1" placeholder="e.g. 300"></label>
        <label class="field"><span>Remarks</span><input name="remarks" maxlength="500" placeholder="e.g. Excellent performance"></label></div>
      <div class="row-wrap mt-sm"><button class="btn primary sm">Issue certificate</button><button type="button" class="btn ghost sm" data-cert-cancel>Cancel</button></div></form>` : ''}
  </article>`)}`
    : html`<p class="small muted">${tab === 'all' ? 'No interns yet. Students you mark as hired on an internship or OJT posting appear here.' : `No ${tab} interns.`}</p>`);
}

async function act(fn) {
  notice($('#message'), '');
  try { await fn(); await load(); } catch (e) { notice($('#message'), errorMessage(e)); }
}
const find = (id) => interns.find((i) => i.applicationId === Number(id));

onClick($('#tabs'), '[data-tab]', (b) => { tab = b.dataset.tab; certFor = null; paint(); });
onClick($('#list'), '[data-done]', (b) => {
  const i = find(b.dataset.done);
  if (!confirm(`Mark ${i.firstName} ${i.lastName}'s internship as done?`)) return;
  act(async () => { await api.post(`/internships/${i.applicationId}/complete`); tab = 'completed'; });
});
onClick($('#list'), '[data-remove]', (b) => {
  const i = find(b.dataset.remove);
  const reason = prompt(`Remove ${i.firstName} ${i.lastName} from your interns? Add a short reason for the record (optional):`);
  if (reason !== null) act(() => api.post(`/internships/${i.applicationId}/remove`, { reason: reason.trim() || undefined }));
});
onClick($('#list'), '[data-cert]', (b) => { certFor = Number(b.dataset.cert); paint(); });
onClick($('#list'), '[data-cert-cancel]', () => { certFor = null; paint(); });
$('#list').addEventListener('submit', (e) => {
  const form = e.target.closest('[data-cert-form]');
  if (!form) return;
  e.preventDefault();
  const id = Number(form.dataset.certForm);
  const f = Object.fromEntries(new FormData(form));
  act(async () => {
    await api.post(`/internships/${id}/certificate`, { hoursRendered: f.hours ? Number(f.hours) : undefined, remarks: f.remarks?.trim() || undefined });
    certFor = null;
    location.href = `/certificate.html?id=${id}`;
  });
});

load();
