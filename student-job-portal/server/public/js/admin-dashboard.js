import { api, errorMessage } from './api.js';
import { barChart } from './barchart.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, html, notice, raw, render, timeAgo } from './ui.js';

await mountPortal('admin', 'dashboard');
render($('#head'), pageTitle('Good day, Admin!', 'Overview of your workforce'));

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOT = { student: '#82262f', application: '#82262f', hire: '#48996e', job: '#4676de', company: '#e28f53' };

const now = new Date();
const months = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
  return { key: d.toISOString().slice(0, 10), label: SHORT[d.getUTCMonth()] };
});
const from = months[0].key;
const to = now.toISOString().slice(0, 10);

try {
  const [overview, trends, activity] = await Promise.all([
    api.get(`/analytics/admin/overview?from=${from}&to=${to}`),
    api.get(`/analytics/admin/trends?interval=month&from=${from}&to=${to}`),
    api.get('/analytics/admin/activity?limit=6'),
  ]);

  const pending = overview.opportunities.pendingApproval + overview.employers.pendingVerification;
  const cards = [
    ['Total Students', overview.students.total],
    ['Registered Companies', overview.employers.verified + overview.employers.pendingVerification],
    ['Active Job Posts', overview.opportunities.open],
    ['Pending Approvals', pending, '/admin/jobs.html'],
  ];
  render($('#kpis'), html`${cards.map(([label, value, href]) => href
    ? html`<a class="kpi" href="${href}"><p>${label}</p><strong>${value.toLocaleString()}</strong></a>`
    : html`<div class="kpi"><p>${label}</p><strong>${value.toLocaleString()}</strong></div>`)}`);

  // "Total Students" at the end of each month = today's total minus everyone who registered after it
  const registrations = months.map((m) => trends.series.find((s) => s.period === m.key)?.newStudents ?? 0);
  const totals = registrations.map((_, i) => overview.students.total - registrations.slice(i + 1).reduce((a, b) => a + b, 0));
  render($('#chart'), html`${raw(barChart(months.map((m) => m.label), [
    { name: 'New Registration', color: '#82262f', values: registrations },
    { name: 'Total Students', color: '#ddacb3', values: totals },
  ]))}`);

  render($('#activity'), activity.length ? html`<ul class="activity">${activity.map((a) => html`<li>
      <span class="ring" style="background:${raw(DOT[a.kind] ?? '#82262f')}1f"><i style="background:${raw(DOT[a.kind] ?? '#82262f')}"></i></span>
      <div class="small" style="min-width:0"><p class="t truncate" style="font-weight:500">${a.title}</p>
        <p class="muted xs truncate">${a.detail} &middot; ${timeAgo(a.at)}</p></div></li>`)}</ul>`
    : html`<p class="small muted">Nothing has happened yet.</p>`);
} catch (e) { notice($('#message'), errorMessage(e)); }
