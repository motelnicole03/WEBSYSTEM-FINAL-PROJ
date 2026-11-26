// An applicant's profile, as an employer sees it. Reached from "View profile" on the Applicants page.
import { api, downloadFile, errorMessage, viewFile } from './api.js';
import { mountPortal } from './layout.js';
import { $, fmtDate, html, initials, notice, onClick, query, render, statusPill } from './ui.js';

await mountPortal('employer', 'applicants');

// Browsers can only show PDFs in a tab; other files (such as DOCX) stay download-only
const isPdf = (name) => /\.pdf$/i.test(name ?? '');
// The availability date arrives as YYYY-MM-DD; reading it as local time avoids an off-by-one-day shift
const longDate = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' });

let student = null;
const say = (text) => { $('#file-msg').textContent = text; $('#file-msg').className = 'small brand'; };

function paintCard(s) {
  const name = `${s.firstName} ${s.lastName}`;
  render($('#student-card'), html`
    <div class="co-logo round">${s.photoUrl ? html`<img src="${s.photoUrl}" alt="Profile photo of ${name}">` : initials(name)}</div>
    <div class="co-info">
      <h2>${name}</h2>
      <p class="bold small" style="color:var(--admin)">${s.programName} &middot; Year ${s.yearLevel}</p>
      <p class="muted small">${s.email} &middot; ${s.studentNumber}</p>
      <p class="muted small">${s.availability ? html`Available to start: ${longDate(s.availability)}` : 'Start date not set'}</p>
    </div>`);
}

function paintAbout(s) {
  render($('#about'), s.bio
    ? html`<p class="co-text">${s.bio}</p>`
    : html`<p class="muted small">This student has not written a bio yet.</p>`);
}

function paintSkills(s) {
  render($('#skills'), s.skills.length
    ? html`<div class="chips">${s.skills.map((k) => html`<span class="chip tag">${k.skillName}</span>`)}</div>`
    : html`<p class="muted small">No skills added yet.</p>`);
}

function paintApplications(s) {
  render($('#applications'), html`${s.applications.map((a) => html`<div class="co-position" style="align-items:flex-start;flex-wrap:wrap">
      <div style="min-width:0">
        <a class="link" href="/employer/applicants.html?opportunityId=${a.opportunityId}">${a.opportunityTitle}</a>
        <span class="muted xs" style="display:block">Applied ${fmtDate(a.submittedAt)}</span>
        <div class="row-wrap mt-sm">${a.files.length ? a.files.map((f) => html`<span class="row">
          ${isPdf(f.fileName) ? html`<button class="btn ghost sm" data-view="${a.applicationId}:${f.fileId}">View ${f.fileType}: ${f.fileName}</button>` : ''}
          <button class="btn ghost sm" data-file="${a.applicationId}:${f.fileId}">Download ${f.fileType}: ${f.fileName}</button></span>`)
          : html`<span class="xs muted">No files attached.</span>`}</div>
      </div>
      ${statusPill(a.currentStatus)}</div>`)}`);
}

const fileOf = (key) => {
  const [appId, fileId] = key.split(':').map(Number);
  const file = student.applications.find((a) => a.applicationId === appId).files.find((f) => f.fileId === fileId);
  return { appId, fileId, file };
};
onClick($('#applications'), '[data-view]', (b) => {
  const { appId, fileId } = fileOf(b.dataset.view);
  say('');
  viewFile(`/applications/${appId}/files/${fileId}`).catch((e) => say(errorMessage(e)));
});
onClick($('#applications'), '[data-file]', (b) => {
  const { appId, fileId, file } = fileOf(b.dataset.file);
  say('');
  downloadFile(`/applications/${appId}/files/${fileId}`, file.fileName).catch((e) => say(errorMessage(e)));
});

const id = Number(query().get('id'));
if (!Number.isInteger(id) || id <= 0) {
  notice($('#message'), 'No student was selected.');
} else {
  try {
    student = await api.get(`/students/${id}`);
    document.title = `${student.firstName} ${student.lastName} | StudentConnect`;
    paintCard(student); paintAbout(student); paintSkills(student); paintApplications(student);
  } catch (e) {
    notice($('#message'), errorMessage(e));
  }
}