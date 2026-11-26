// Employer "Edit profile": the logo and the company details. What is saved here shows on /employer/profile.html.
import { api, errorMessage, fieldErrors } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, $$, html, initials, notice, onClick, render } from './ui.js';

await mountPortal('employer', null);
render($('#head'), pageTitle('Edit profile', 'Changes to the logo are saved right away. Details are saved with the Save button.'));

const SIZES = ['1-10', '11-50', '51-200', '201-500', '501+'];
let profile;

const say = (id, text, ok = true) => { const el = $(id); el.textContent = text; el.className = `small ${ok ? '' : 'brand'}`; el.style.color = ok ? '#15803d' : ''; };

/** The round button in the top bar shows the logo, so keep it in step with what was just saved. */
function refreshTopbarAvatar() {
  const button = document.querySelector('#topbar .avatar-btn');
  if (!button) return;
  render(button, profile.logoUrl
    ? html`<img src="${profile.logoUrl}" alt="" style="display:block;width:100%;height:100%;border-radius:50%;object-fit:cover">`
    : html`${initials(profile.companyName)}`);
}

function paintLogo() {
  render($('#logo'), html`<div class="logo-row">
    <div class="co-logo">${profile.logoUrl ? html`<img src="${profile.logoUrl}" alt="Your company logo">` : initials(profile.companyName)}</div>
    <div>
      <div class="row">
        <label class="btn ghost sm" style="cursor:pointer">${profile.logoUrl ? 'Change logo' : 'Upload logo'}<input id="logo-file" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
        ${profile.logoUrl ? html`<button type="button" class="btn ghost sm muted" data-remove-logo>Remove</button>` : ''}
      </div>
      <p class="muted xs mt-sm">JPG, PNG or WEBP, up to 5 MB. A square image works best.</p>
      <p id="logo-msg" class="small"></p>
    </div>
  </div>`);
}

function paintDetails() {
  render($('#details'), html`<div class="form-grid">
      <label class="field"><span>Company name</span><input name="companyName" required maxlength="200" value="${profile.companyName}"><small class="err" data-err="companyName"></small></label>
      <label class="field"><span>Industry</span><input name="industry" maxlength="100" value="${profile.industry ?? ''}"><small class="err" data-err="industry"></small></label>
      <label class="field"><span>Company size</span><select name="companySize"><option value="">Not set</option>${SIZES.map((s) => html`<option value="${s}"${s === profile.companySize ? ' selected' : ''}>${s} employees</option>`)}</select></label>
      <label class="field"><span>Website</span><input name="website" inputmode="url" maxlength="255" placeholder="https://www.yourcompany.com" value="${profile.website ?? ''}"><small class="err" data-err="website"></small></label>
      <label class="field" style="grid-column:1/-1"><span>Address</span><input name="address" maxlength="500" value="${profile.address ?? ''}"><small class="err" data-err="address"></small></label>
      <label class="field"><span>Contact person</span><input name="contactPerson" maxlength="150" value="${profile.contactPerson ?? ''}"><small class="err" data-err="contactPerson"></small></label>
      <label class="field"><span>Phone</span><input name="phone" inputmode="tel" maxlength="30" value="${profile.phone ?? ''}"><small class="err" data-err="phone"></small></label>
      <label class="field"><span>Email</span><input value="${profile.email}" disabled></label>
      <label class="field" style="grid-column:1/-1"><span>About the company</span>
        <textarea name="about" rows="6" maxlength="2000" placeholder="What does your company do? What is it like to work there, and what kind of students are you looking for?">${profile.about ?? ''}</textarea>
        <small class="muted xs">Up to 2000 characters.</small><small class="err" data-err="about"></small></label>
    </div>
    <div class="row mt"><button class="btn primary sm">Save</button><a class="btn ghost sm" href="/employer/profile.html">View My Profile</a><span id="details-msg"></span></div>`);
}

// ---------- logo ----------
$('#logo').addEventListener('change', async (e) => {
  if (e.target.id !== 'logo-file') return;
  const file = e.target.files[0];
  e.target.value = ''; // lets the same file be picked again later
  if (!file) return;
  const form = new FormData();
  form.append('photo', file);
  try {
    profile = await api.postForm('/employers/me/logo', form);
    paintLogo(); refreshTopbarAvatar();
    say('#logo-msg', 'Logo updated.');
  } catch (err) { say('#logo-msg', errorMessage(err), false); }
});
onClick($('#logo'), '[data-remove-logo]', async () => {
  if (!confirm('Remove your company logo?')) return;
  try {
    profile = await api.delete('/employers/me/logo');
    paintLogo(); refreshTopbarAvatar();
    say('#logo-msg', 'Logo removed.');
  } catch (err) { say('#logo-msg', errorMessage(err), false); }
});

// ---------- details ----------
// An empty box clears the field. A website typed without http(s):// gets https:// added.
const clean = (v) => (String(v ?? '').trim() || null);
const withProtocol = (v) => { const t = clean(v); return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t; };

$('#details').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.currentTarget));
  $$('[data-err]', e.currentTarget).forEach((el) => (el.textContent = ''));
  try {
    profile = await api.patch('/employers/me', {
      companyName: String(f.companyName).trim(),
      industry: clean(f.industry),
      companySize: clean(f.companySize),
      website: withProtocol(f.website),
      address: clean(f.address),
      contactPerson: clean(f.contactPerson),
      phone: clean(f.phone),
      about: clean(f.about),
    });
    paintLogo(); refreshTopbarAvatar();
    say('#details-msg', 'Details saved.');
  } catch (err) {
    for (const [name, text] of Object.entries(fieldErrors(err))) { const el = $(`[data-err="${name}"]`); if (el) el.textContent = text; }
    say('#details-msg', errorMessage(err), false);
  }
});

try {
  profile = await api.get('/employers/me');
  paintLogo(); paintDetails();
} catch (e) { notice($('#message'), errorMessage(e)); }