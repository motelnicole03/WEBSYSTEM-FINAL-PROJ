import { api, errorMessage } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle, STAGE_LABEL, verifyBanner } from './portal.js';
import { $, fmtDateTime, html, initial, notice, oppStatusPill, render } from './ui.js';

const user = await mountPortal('employer', 'dashboard');
render($('#head'), html`${pageTitle(`Good day, ${user.employer?.companyName ?? 'Employer'}!`, 'Overview of your hiring')}${verifyBanner(user)}`);

let overview, funnel, upcoming;
try {
  [overview, funnel, upcoming] = await Promise.all([
    api.get('/analytics/employer/overview'), api.get('/analytics/employer/funnel'), api.get('/interviews?upcoming=true'),
  ]);
} catch (e) { notice($('#message'), errorMessage(e)); }

if (overview) {
  const cards = [
    ['Active Job Posts', overview.postings.filter((p) => p.status === 'open').length],
    ['Total Applicants', overview.totals.applications],
    ['Upcoming Interviews', upcoming.length],
    ['Hires', overview.totals.hires],
  ];
  render($('#kpis'), html`${cards.map(([label, value]) => html`<div class="kpi"><p>${label}</p><strong>${value.toLocaleString()}</strong></div>`)}`);

  render($('#funnel'), html`<ul class="funnel">${funnel.funnel.map((f) => html`<li>
      <div class="row between xs"><span>${STAGE_LABEL[f.stage]}</span><span class="muted">${f.count}${f.percentOfSubmitted !== null ? ` · ${f.percentOfSubmitted}%` : ''}</span></div>
      <div class="bar"><div style="width:${f.percentOfSubmitted ?? 0}%"></div></div></li>`)}</ul>
    <p class="xs muted mt">Left the process: ${funnel.exits.map((e) => `${e.count} ${e.status}`).join(', ')}</p>`);

  render($('#upcoming'), upcoming.length ? html`<ul class="activity">${upcoming.slice(0, 5).map((i) => html`<li>
      <span class="avatar">${initial(i.firstName)}</span>
      <div class="small" style="min-width:0"><p class="truncate t" style="font-weight:500">${i.firstName} ${i.lastName}</p>
        <p class="truncate muted xs">${fmtDateTime(i.schedule)} · ${i.studentResponse}</p></div></li>`)}</ul>`
    : html`<p class="small muted">No interviews scheduled.</p>`);

  render($('#perf'), overview.postings.length ? html`<table class="data"><thead><tr><th>Posting</th><th>Status</th><th>Views</th><th>Applicants</th><th>Hires</th></tr></thead><tbody>
    ${overview.postings.map((p) => html`<tr><td>${p.title}</td><td>${oppStatusPill(p.status)}</td><td>${p.views}</td><td>${p.applications}</td><td>${p.hires}</td></tr>`)}</tbody></table>`
    : html`<p class="small muted">You have no postings yet. <a class="link" href="/employer/job-form.html">Post your first job</a>.</p>`);
}
