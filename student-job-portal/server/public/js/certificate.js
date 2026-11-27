import { api, errorMessage } from './api.js';
import { requireRole } from './auth.js';
import { $, html, notice, query, render } from './ui.js';

await requireRole(['student', 'employer', 'admin']);

const id = Number(query().get('id'));
const long = (iso) => new Date(iso).toLocaleDateString([], { dateStyle: 'long' });

$('#back').addEventListener('click', () => (history.length > 1 ? history.back() : location.assign('/')));
$('#print').addEventListener('click', () => window.print());

try {
  if (!id) throw new Error('No certificate selected');
  const c = await api.get(`/internships/${id}/certificate`);
  const kind = c.opportunityType === 'ojt' ? 'on-the-job training' : 'internship';
  const period = c.startedAt && c.completedAt ? html` from <b>${long(c.startedAt)}</b> to <b>${long(c.completedAt)}</b>` : '';
  const hours = c.hoursRendered ? html`, rendering a total of <b>${c.hoursRendered} hours</b>` : '';
  document.title = `Certificate of Completion - ${c.firstName} ${c.lastName}`;

  render($('#cert'), html`<section class="certificate"><div class="frame">
    <p class="org">STUDENTCONNECT</p>
    <h1>Certificate of Completion</h1>
    <p class="lead">This is to certify that</p>
    <p class="name">${c.firstName} ${c.lastName}</p>
    <p class="body">a student of <b>${c.programName}</b> (${c.studentNumber}), has successfully completed
      an ${kind} as <b>${c.opportunityTitle}</b> at <b>${c.companyName}</b>${period}${hours}.</p>
    ${c.remarks ? html`<p class="remarks">&ldquo;${c.remarks}&rdquo;</p>` : ''}
    <div class="foot">
      <div class="sign"><div class="line">${c.contactPerson || c.companyName}</div><span class="muted">${c.contactPerson ? c.companyName : 'Authorized signatory'}</span></div>
      <div class="meta"><p>Issued on ${long(c.issuedAt)}</p><p>Certificate No. ${c.certificateNo}</p></div>
    </div></div></section>`);
  $('#print').hidden = false;
} catch (e) {
  notice($('#message'), errorMessage(e));
}
