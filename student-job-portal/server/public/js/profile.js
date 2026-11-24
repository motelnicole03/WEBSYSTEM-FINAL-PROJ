// "My Profile": a read-only view of the student's profile. Editing happens on /profile-edit.html.
import { api, downloadFile, errorMessage } from './api.js';
import { requireRole } from './auth.js';
import { mountSite } from './layout.js';
import { $, html, initials, onClick, render } from './ui.js';

await requireRole(['student']);
await mountSite({});

let resumes = [];

const formatSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
// The availability date arrives as YYYY-MM-DD; reading it as local time avoids an off-by-one-day shift
const longDate = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' });

function paintCard(p) {
  const name = `${p.firstName} ${p.lastName}`;
  render($('#profile-card'), html`
    <div class="profile-photo">${p.photoUrl ? html`<img src="${p.photoUrl}" alt="Profile photo of ${name}">` : initials(name)}</div>
    <div class="profile-info">
      <h1 class="bold">${name}</h1>
      <p class="brand bold small">${p.programName} &middot; Year ${p.yearLevel}</p>
      <p class="muted small">${p.email} &middot; ${p.studentNumber}</p>
      <p class="muted small">${p.availability ? html`Available to start: ${longDate(p.availability)}` : 'Start date not set'}</p>
    </div>
    <a class="btn primary" href="/profile-edit.html">Edit profile</a>`);
}

function paintCompleteness(p) {
  const { percent, missing } = p.profileCompleteness;
  // Only nag while something is missing
  render($('#completeness'), percent >= 100 ? html`` : html`<div class="panel mt">
    <div class="row between small"><span class="bold">Profile ${percent}% complete</span><span class="xs muted">To do: ${missing.join(', ')}</span></div>
    <div class="progress mt-sm"><div style="width:${percent}%"></div></div></div>`);
}

function paintAbout(p) {
  render($('#about'), p.bio
    ? html`<p class="bio-text small">${p.bio}</p>`
    : html`<p class="muted small">You have not written anything yet. <a class="link" href="/profile-edit.html">Add a short bio</a> so employers can get to know you.</p>`);
}

function paintSkills(p) {
  render($('#skills'), p.skills.length
    ? html`<div class="chips">${p.skills.map((s) => html`<span class="chip tag">${s.skillName}</span>`)}</div>`
    : html`<p class="muted small">No skills added yet. <a class="link" href="/profile-edit.html">Add your skills</a>.</p>`);
}

function paintResumes() {
  const sorted = [...resumes].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)); // default resume first
  render($('#resume-list'), sorted.length
    ? html`${sorted.map((r) => html`<div class="resume-item">
        <div style="min-width:0" class="small"><p class="truncate" style="font-weight:500">${r.fileName}${r.isDefault ? html` <span class="pill" style="background:var(--brand-soft);color:var(--brand);font-size:.6875rem">Default</span>` : ''}</p>
          <p class="muted xs">${formatSize(r.fileSize)}</p></div>
        <button class="btn ghost sm" data-download="${r.resumeId}">Download</button>
      </div>`)}`
    : html`<p class="muted small">No resume yet. <a class="link" href="/profile-edit.html#resume">Upload your resume</a>.</p>`);
}

onClick($('#resume-list'), '[data-download]', async (b) => {
  const r = resumes.find((x) => x.resumeId === Number(b.dataset.download));
  try { await downloadFile(`/resumes/${r.resumeId}/download`, r.fileName); } catch (err) { $('#resume-msg').textContent = errorMessage(err); }
});

try {
  const [profile, list] = await Promise.all([api.get('/students/me'), api.get('/resumes')]);
  resumes = list;
  paintCard(profile); paintCompleteness(profile); paintAbout(profile); paintSkills(profile); paintResumes();
} catch (e) {
  render($('#message'), html`<p class="brand">${errorMessage(e)}</p>`);
}