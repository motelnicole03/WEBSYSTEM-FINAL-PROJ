import { api, downloadFile, errorMessage } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, html, notice, onClick, render } from './ui.js';

await mountPortal('admin', 'reports');
render($('#head'), pageTitle('Reports & Analytics'));

const isoDay = (d) => d.toISOString().slice(0, 10);
const show = (n, suffix = '') => (n === null || n === undefined ? '-' : `${n}${suffix}`);
const today = new Date();
$('#from').value = isoDay(new Date(today.getTime() - 90 * 86_400_000));
$('#to').value = isoDay(today);

const table = (title, head, rows) => html`<section class="card"><h3>${title}</h3>${rows.length
  ? html`<table class="data"><thead><tr>${head.map((h) => html`<th>${h}</th>`)}</tr></thead><tbody>${rows.map((r) => html`<tr>${r.map((c) => html`<td>${c}</td>`)}</tr>`)}</tbody></table>`
  : html`<p class="small muted">No data for this period.</p>`}</section>`;

async function load() {
  const from = $('#from').value, to = $('#to').value;
  if (!from || !to) return;
  $('#to').min = from; $('#from').max = to;
  notice($('#message'), '');
  try {
    const [o, b] = await Promise.all([api.get(`/analytics/admin/overview?from=${from}&to=${to}`), api.get(`/analytics/admin/breakdowns?from=${from}&to=${to}`)]);
    const stats = [
      ['Applications', o.applications.total], ['Students who applied', o.applications.applicants],
      ['Shortlist rate', show(o.applications.shortlistRatePercent, '%')], ['Hires', o.placements.hires],
      ['Placement rate', show(o.placements.placementRatePercent, '%')], ['Avg days to hire', show(o.speed.avgDaysToHire)],
      ['Avg days to first response', show(o.speed.avgDaysToFirstResponse)], ['Job views', o.applications.views],
    ];
    render($('#kpis'), html`${stats.map(([l, v]) => html`<div class="kpi"><p>${l}</p><strong>${v}</strong></div>`)}`);
    render($('#tables'), html`
      ${table('Placement by program', ['Program', 'Students', 'Applied', 'Placed', 'Rate'], b.placementsByProgram.map((p) => [p.programName, p.students, p.applicants, p.placed, show(p.placementRatePercent, '%')]))}
      ${table('Top employers', ['Company', 'Postings', 'Applications', 'Hires'], b.topEmployers.map((e) => [e.companyName, e.postings, e.applications, e.hires]))}
      ${table('Skill demand', ['Skill', 'Open postings', 'Students with it'], b.skillDemand.map((s) => [s.skillName, s.openDemand, s.studentsWithSkill]))}
      ${table('Most searched keywords', ['Keyword', 'Searches'], b.topSearches.map((s) => [s.term, s.searches]))}`);
  } catch (e) { notice($('#message'), errorMessage(e)); }
}

$('#from').addEventListener('change', load);
$('#to').addEventListener('change', load);
onClick(document, '[data-report]', (b) =>
  downloadFile(`/analytics/admin/reports/${b.dataset.report}?from=${$('#from').value}&to=${$('#to').value}`, `${b.dataset.report}-report.csv`)
    .catch((e) => notice($('#message'), errorMessage(e))));
load();
