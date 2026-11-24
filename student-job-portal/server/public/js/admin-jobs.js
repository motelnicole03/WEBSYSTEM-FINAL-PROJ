import { api, errorMessage } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, $$, fmtDate, html, notice, onClick, render } from './ui.js';

await mountPortal('admin', 'jobs');
render($('#head'), pageTitle('Job Management', 'Review new job postings and verify new companies.'));

let tab = 'jobs', jobs = [], companies = [];

async function load() {
  try {
    [jobs, companies] = await Promise.all([api.get('/opportunities/pending'), api.get('/admin/employers?status=pending')]);
    paint();
  } catch (e) { notice($('#message'), errorMessage(e)); }
}

function paint() {
  $$('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('[data-tab="jobs"] .count').textContent = jobs.length || '';
  $('[data-tab="companies"] .count').textContent = companies.length || '';

  render($('#list'), tab === 'jobs'
    ? (jobs.length ? html`${jobs.map((j) => html`<article class="item row-wrap between">
        <div class="small"><p class="t">${j.title}</p><p class="muted xs">${j.companyName} &middot; ${j.type} &middot; submitted ${fmtDate(j.createdAt)}</p></div>
        <div class="row"><a class="btn ghost sm" href="/jobs.html?id=${j.opportunityId}">View</a>
          <button class="btn primary sm" data-job="approve" data-id="${j.opportunityId}">Approve</button>
          <button class="btn ghost sm" data-job="reject" data-id="${j.opportunityId}">Reject</button></div></article>`)}`
        : html`<p class="small muted">No job postings are waiting for approval.</p>`)
    : (companies.length ? html`${companies.map((c) => html`<article class="item row-wrap between">
        <div class="small"><p class="t">${c.companyName}</p><p class="muted xs">${c.email}${c.industry ? ` · ${c.industry}` : ''}${c.contactPerson ? ` · ${c.contactPerson}` : ''} &middot; registered ${fmtDate(c.createdAt)}</p></div>
        <div class="row"><button class="btn primary sm" data-co="verify" data-id="${c.employerId}" >Verify</button>
          <button class="btn ghost sm" data-co="reject" data-id="${c.employerId}" data-name="${c.companyName}">Reject</button></div></article>`)}`
        : html`<p class="small muted">No companies are waiting for verification.</p>`));
}

async function act(fn) {
  notice($('#message'), '');
  try { await fn(); await load(); } catch (e) { notice($('#message'), errorMessage(e)); }
}

onClick(document, '[data-tab]', (b) => { tab = b.dataset.tab; paint(); });
onClick($('#list'), '[data-job]', (b) => {
  if (b.dataset.job === 'reject' && !confirm('Send this posting back to the employer as a draft?')) return;
  act(() => api.post(`/opportunities/${b.dataset.id}/${b.dataset.job}`));
});
onClick($('#list'), '[data-co]', (b) => {
  if (b.dataset.co === 'reject' && !confirm(`Reject ${b.dataset.name}?`)) return;
  act(() => api.post(`/admin/employers/${b.dataset.id}/${b.dataset.co}`));
});
load();
