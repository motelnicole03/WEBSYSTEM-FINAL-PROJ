// Student Settings: profile (view and edit), notification switches, and help & support.
import { api, errorMessage, fieldErrors } from './api.js';
import { requireRole } from './auth.js';
import { mountSite } from './layout.js';
import { $, $$, html, initials, onClick, render } from './ui.js';

await requireRole(['student']);
await mountSite({});

const CATEGORY = {
  not_working: 'Something is not working',
  wrong_info: 'Wrong or missing information',
  account: 'Account or login issue',
  suggestion: 'Suggestion',
  other: 'Other',
};
// The notifications a student can switch on or off (the server sends only the ones that apply)
const NOTIFICATIONS = [
  { type: 'status_change', group: 'Applications', label: 'Status updates on my applications' },
  { type: 'interview', group: 'Interviews', label: 'Interview invitations and schedule changes' },
  { type: 'message', group: 'Messages', label: 'New messages from employers' },
];

let profile = null, allSkills = [], editing = false;
let available = [], muted = new Set();
const selected = new Set();

const say = (sel, text, ok = true) => {
  const el = $(sel);
  if (!el) return;
  el.textContent = text;
  el.className = `small ${ok ? '' : 'brand'}`;
  el.style.color = ok ? '#15803d' : '';
};
const clearErrors = (form) => $$('[data-err]', form).forEach((el) => (el.textContent = ''));
const showErrors = (form, err) => {
  for (const [name, text] of Object.entries(fieldErrors(err))) { const el = $(`[data-err="${name}"]`, form); if (el) el.textContent = text; }
};
const fullName = () => `${profile.firstName} ${profile.lastName}`;
const avatar = () => html`<div class="gavatar">${profile.photoUrl ? html`<img src="${profile.photoUrl}" alt="Your profile photo">` : initials(fullName())}</div>`;

// The round picture in the navbar follows the new photo straight away
function updateNavbarAvatar() {
  const button = document.querySelector('.avatar-btn');
  if (!button) return;
  render(button, profile.photoUrl
    ? html`<img src="${profile.photoUrl}" alt="" style="display:block;width:100%;height:100%;border-radius:50%;object-fit:cover">`
    : html`${initials(fullName())}`);
}

// ---------- profile ----------
function paintProfile() {
  render($('#profile-card'), editing ? editView() : readView());
  if (editing) paintPhoto();
}

function readView() {
  return html`<div class="ghead"><h2 class="gtitle">Profile</h2><button class="lnk-btn" data-edit>Edit</button></div>
    <p class="glbl">Profile picture</p><div class="grow">${avatar()}</div>
    <p class="glbl">Name</p><p class="gtxt dark">${fullName()} &middot; ${profile.programName}, Year ${profile.yearLevel}</p>
    <p class="glbl">About me</p>
    ${profile.bio ? html`<p class="gtxt keep">${profile.bio}</p>` : html`<p class="gtxt">You have not written anything yet. Press Edit to add a short bio.</p>`}
    <p class="glbl">Skills</p>
    ${profile.skills.length
      ? html`<div class="chips">${profile.skills.map((s) => html`<span class="chip tag">${s.skillName}</span>`)}</div>`
      : html`<p class="gtxt">No skills added yet.</p>`}
    <p id="profile-msg" class="small mt-sm"></p>`;
}

function editView() {
  return html`<div class="ghead"><h2 class="gtitle">Profile</h2><button class="lnk-btn" data-cancel>Cancel</button></div>
    <p class="glbl">Profile picture</p><div id="photo-area"></div>
    <form id="edit-form" novalidate>
      <p class="glbl">About me</p>
      <textarea name="bio" rows="4" maxlength="500" aria-label="About me" style="width:100%" placeholder="Tell employers a little about yourself: your course, your interests, what kind of internship you are looking for.">${profile.bio ?? ''}</textarea>
      <small class="muted xs">Up to 500 characters.</small><small class="err" data-err="bio"></small>
      <p class="glbl">Skills</p>
      <div class="chips">${allSkills.map((s) => html`<button type="button" class="chip" data-skill="${s.skillId}" aria-pressed="${String(selected.has(s.skillId))}">${s.skillName}</button>`)}</div>
      <p class="glbl" style="margin-top:1.75rem">Change password</p>
      <div class="form-grid">
        <label class="field"><span>Current password</span><input type="password" name="currentPassword" autocomplete="current-password"><small class="err" data-err="currentPassword"></small></label>
        <label class="field"><span>New password</span><input type="password" name="newPassword" autocomplete="new-password"><small class="err" data-err="newPassword"></small></label>
        <label class="field"><span>Confirm new password</span><input type="password" name="confirmPassword" autocomplete="new-password"><small class="err" data-err="confirmPassword"></small></label>
      </div>
      <small class="muted xs">At least 8 characters. Leave blank to keep your current password.</small>
      <div class="row-wrap mt-lg"><button class="btn primary">Save changes</button><button type="button" class="btn ghost" data-cancel>Cancel</button><span id="save-msg" class="small"></span></div>
    </form>`;
}

// The picture is saved as soon as it is chosen, so it has its own small area that repaints alone
function paintPhoto() {
  render($('#photo-area'), html`<div class="grow">${avatar()}
    <label class="lnk-btn" style="cursor:pointer">${profile.photoUrl ? 'Change' : 'Upload'}<input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
    ${profile.photoUrl ? html`<button type="button" class="lnk-btn muted" data-remove-photo>Remove</button>` : ''}</div>
    <p class="gtxt mt-sm">JPG, PNG or WEBP, up to 5 MB. Saved right away.</p><p id="photo-msg" class="small"></p>`);
}

const startEditing = () => { selected.clear(); profile.skills.forEach((s) => selected.add(s.skillId)); editing = true; paintProfile(); };
const stopEditing = () => { editing = false; paintProfile(); };

onClick($('#profile-card'), '[data-edit]', startEditing);
onClick($('#profile-card'), '[data-cancel]', stopEditing);
onClick($('#profile-card'), '[data-skill]', (button) => {
  const id = Number(button.dataset.skill);
  if (selected.has(id)) selected.delete(id); else selected.add(id);
  button.setAttribute('aria-pressed', String(selected.has(id)));
});

$('#profile-card').addEventListener('change', async (e) => {
  if (e.target.id !== 'photo-file') return;
  const file = e.target.files[0];
  e.target.value = ''; // lets the same file be picked again later
  if (!file) return;
  const form = new FormData();
  form.append('photo', file);
  try {
    profile = await api.postForm('/students/me/photo', form);
    paintPhoto(); updateNavbarAvatar();
    say('#photo-msg', 'Photo updated.');
  } catch (err) { say('#photo-msg', errorMessage(err), false); }
});

onClick($('#profile-card'), '[data-remove-photo]', async () => {
  if (!confirm('Remove your profile photo?')) return;
  try {
    profile = await api.delete('/students/me/photo');
    paintPhoto(); updateNavbarAvatar();
    say('#photo-msg', 'Photo removed.');
  } catch (err) { say('#photo-msg', errorMessage(err), false); }
});

$('#profile-card').addEventListener('submit', async (e) => {
  if (e.target.id !== 'edit-form') return;
  e.preventDefault();
  const form = e.target;
  const f = Object.fromEntries(new FormData(form));
  clearErrors(form); say('#save-msg', '');

  // A new password needs all three boxes. Empty boxes mean "keep my password".
  const wantsPassword = Boolean(f.currentPassword || f.newPassword || f.confirmPassword);
  if (wantsPassword) {
    const problem = (name, text) => { $(`[data-err="${name}"]`, form).textContent = text; return true; };
    const bad = (!f.currentPassword && problem('currentPassword', 'Enter your current password'))
      || (!f.newPassword && problem('newPassword', 'Enter a new password'))
      || (f.newPassword !== f.confirmPassword && problem('confirmPassword', 'The passwords do not match'));
    if (bad) return;
  }

  try {
    // The password goes first: if the current password is wrong, nothing else is saved
    if (wantsPassword) await api.post('/settings/password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
    await api.patch('/students/me', { bio: (f.bio ?? '').trim() || null }); // an empty bio clears it
    profile = await api.put('/students/me/skills', { skillIds: [...selected] });
    editing = false;
    paintProfile();
    say('#profile-msg', 'Saved.');
  } catch (err) {
    showErrors(form, err);
    say('#save-msg', errorMessage(err), false);
  }
});

// ---------- notifications ----------
function paintNotifications() {
  const rows = NOTIFICATIONS.filter((n) => available.includes(n.type));
  render($('#notif-card'), html`<h2 class="gtitle">Notifications</h2>
    <p class="glbl" style="margin-top:.75rem">In-app</p>
    <p class="gtxt">These settings apply to the notifications you get under the bell icon.</p>
    ${rows.map((n) => html`<p class="glbl" style="margin-top:1.25rem;font-size:.9375rem">${n.group}</p>
      <div class="srow"><span>${n.label}</span>
        <button class="sw" role="switch" aria-checked="${String(!muted.has(n.type))}" aria-label="${n.label}" data-notif="${n.type}"></button></div>`)}
    <p id="notif-msg" class="small mt-sm"></p>`);
}

onClick($('#notif-card'), '[data-notif]', async (button) => {
  const type = button.dataset.notif;
  const wasOn = button.getAttribute('aria-checked') === 'true';
  const next = new Set(muted);
  if (wasOn) next.add(type); else next.delete(type);
  button.setAttribute('aria-checked', String(!wasOn)); // show the change at once
  try {
    const result = await api.put('/settings/notifications', { muted: [...next] });
    muted = new Set(result.muted);
    say('#notif-msg', 'Saved.');
  } catch (err) {
    button.setAttribute('aria-checked', String(wasOn)); // the server said no, so put it back
    say('#notif-msg', errorMessage(err), false);
  }
});

// ---------- help & support ----------
render($('#report-category'), html`${Object.entries(CATEGORY).map(([value, label]) => html`<option value="${value}">${label}</option>`)}`);

$('#report-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const f = Object.fromEntries(new FormData(form));
  clearErrors(form); say('#report-msg', '');
  try {
    await api.post('/settings/reports', { category: f.category, page: null, description: f.description });
    form.reset();
    say('#report-msg', 'Report sent. Thank you!');
  } catch (err) {
    showErrors(form, err);
    say('#report-msg', errorMessage(err), false);
  }
});

// ---------- load ----------
try {
  let prefs;
  [profile, allSkills, prefs] = await Promise.all([api.get('/students/me'), api.get('/lookups/skills'), api.get('/settings/notifications')]);
  available = prefs.available;
  muted = new Set(prefs.muted);
  paintProfile();
  paintNotifications();
} catch (err) {
  render($('#message'), html`<p class="brand">${errorMessage(err)}</p>`);
}