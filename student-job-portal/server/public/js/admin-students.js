import { api, errorMessage } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, cap, fmtDate, html, initial, internPill, notice, onClick, render, statusPill } from './ui.js';

await mountPortal('admin', 'students');
render($('#head'), pageTitle('Student Management', 'All students and the status of their internship.'));

const TABS = [['', 'All'], ['ongoing', 'Ongoing'], ['completed', 'Completed'], ['removed', 'Removed'], ['none', 'No internship']];
let students = [], status = '', search = '', openId = null, timer;
const details = new Map();

async function load() {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  try {
    students = await api.get(`/admin/students${params.size ? `?${params}` : ''}`);
    notice($('#message'), '');
    paint();
  } catch (e) { notice($('#message'), errorMessage(e)); }
}

function paintTabs() {
  render($('#tabs'), html`${TABS.map(([key, label]) => html`<button class="tab${key === status ? ' active' : ''}" data-tab="${key}">${label}</button>`)}`);
}

function detail(d) {
  if (!d) return html`<p class="muted">Loading...</p>`;
  return html`<p class="xs muted">${d.email} · ${d.programName} · Year ${d.yearLevel}</p>
    <p class="xs bold mt-sm">Applications (${d.applications.length})</p>
    ${d.applications.length ? html`<table class="data mt-sm"><thead><tr><th>Position</th><th>Company</th><th>Applied</th><th>Application</th><th>Internship</th><th></th></tr></thead><tbody>
      ${d.applications.map((a) => html`<tr><td>${a.opportunityTitle}</td><td>${a.companyName}</td><td>${fmtDate(a.submittedAt)}</td><td>${statusPill(a.currentStatus)}</td>
        <td>${a.internshipStatus ? internPill(a.internshipStatus) : html`<span class="muted xs">-</span>`}${a.internshipRemarks && a.internshipStatus === 'removed' ? html`<span class="xs muted" style="display:block">${a.internshipRemarks}</span>` : ''}</td>
        <td>${a.certificateId ? html`<a class="btn ghost sm" href="/certificate.html?id=${a.applicationId}">Certificate</a>` : ''}</td></tr>`)}</tbody></table>`
      : html`<p class="xs muted">This student has not applied to anything yet.</p>`}`;
}

function paint() {
  paintTabs();
  render($('#list'), students.length ? html`${students.map((s) => {
    const open = openId === s.studentId;
    return html`<article class="item" style="padding:0">
      <button class="row-wrap between" data-toggle="${s.studentId}" aria-expanded="${open}" style="width:100%;padding:1rem;background:none;border:0;text-align:left">
        <span class="row grow" style="min-width:0"><span class="avatar">${initial(s.firstName)}</span>
          <span class="small" style="min-width:0"><span class="t truncate" style="display:block;font-weight:500">${s.firstName} ${s.lastName}</span>
            <span class="muted xs truncate" style="display:block">${s.studentNumber} · ${s.programName} · Year ${s.yearLevel}</span>
            <span class="muted xs truncate" style="display:block">${s.internshipStatus ? `${s.opportunityTitle} at ${s.companyName}` : `${s.applicationsCount} application${s.applicationsCount === 1 ? '' : 's'}`}</span></span></span>
        <span class="row-wrap">${s.accountStatus !== 'active' ? html`<span class="pill amber">${cap(s.accountStatus)}</span>` : ''}${s.certificateId ? html`<span class="pill emerald">Certificate issued</span>` : ''}${internPill(s.internshipStatus)}</span>
      </button>
      ${open ? html`<div class="small" style="border-top:1px solid var(--line);padding:1rem">${detail(details.get(s.studentId))}</div>` : ''}</article>`;
  })}` : html`<p class="small muted">No students match.</p>`);
}

onClick($('#tabs'), '[data-tab]', (b) => { status = b.dataset.tab; openId = null; load(); });
onClick($('#list'), '[data-toggle]', async (b) => {
  const id = Number(b.dataset.toggle);
  openId = openId === id ? null : id;
  paint();
  if (openId && !details.has(id)) {
    try { details.set(id, await api.get(`/admin/students/${id}`)); paint(); } catch (e) { notice($('#message'), errorMessage(e)); }
  }
});
$('#search').addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => { search = e.target.value.trim(); openId = null; load(); }, 250);
});

load();
