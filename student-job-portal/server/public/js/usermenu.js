// The right side of the navbar for signed-in users: notifications, messages and the avatar menu.
import { api } from './api.js';
import { logout } from './auth.js';
import { openChat } from './chat.js';
import { attachDropdown, esc, html, icons, initial, initials, onClick, render, timeAgo } from './ui.js';

function displayName(user) {
  if (user.student) return `${user.student.firstName} ${user.student.lastName}`;
  return user.employer?.companyName ?? 'Administrator';
}

function menuItems(user) {
  if (user.role === 'student') {
    return [
      ['/applications.html', 'My Applications'],
      ['/saved.html', 'Saved Internships'],
      ['/profile.html', 'My Profile'],
    ];
  }
  return user.role === 'employer' ? [['/employer/index.html', 'Dashboard']] : [['/admin/index.html', 'Admin dashboard']];
}

// The round button in the navbar: the student's photo if they have one, otherwise their initials
function avatarContent(user, name) {
  const url = user.student?.photoUrl;
  return url
    ? html`<img src="${url}" alt="" style="display:block;width:100%;height:100%;border-radius:50%;object-fit:cover">`
    : initials(name);
}

const setBadge = (badge, count) => {
  badge.hidden = count <= 0;
  badge.textContent = count > 9 ? '9+' : String(count);
};

export function mountUserMenu(container, user) {
  const canMessage = user.role === 'student' || user.role === 'employer';
  const name = displayName(user);

  render(container, html`<div class="user-menu">
    <div class="dropdown" data-bell>
      <button class="icon-btn" aria-label="Notifications" aria-expanded="false">${icons.bell()}<span class="badge" hidden></span></button>
      <div class="dd-panel" hidden>
        <div class="dd-head"><span>Notifications</span><button class="link xs" data-read-all hidden>Mark all as read</button></div>
        <ul class="dd-list" data-list></ul>
      </div>
    </div>
    ${canMessage ? html`<div class="dropdown" data-msg>
      <button class="icon-btn" aria-label="Messages" aria-expanded="false">${icons.message()}<span class="badge" hidden></span></button>
      <div class="dd-panel" hidden>
        <div class="dd-head"><span>Messages</span></div>
        <ul class="dd-list" data-list></ul>
      </div>
    </div>` : ''}
    <div class="dropdown" data-account>
      <button class="avatar-btn" style="padding:0;overflow:hidden" aria-label="Account menu" aria-expanded="false">${avatarContent(user, name)}</button>
      <div class="dd-panel narrow" hidden>
        <div style="padding:.75rem 1rem;border-bottom:1px solid var(--line)">
          <p class="bold small truncate">${name}</p><p class="muted xs truncate">${user.email}</p>
        </div>
        ${menuItems(user).map(([href, label]) => html`<a class="dd-link" href="${href}">${label}</a>`)}
        <button class="dd-link logout" data-logout>Logout</button>
      </div>
    </div>
  </div>`);

  const bell = setupBell(container.querySelector('[data-bell]'));
  const msg = canMessage ? setupMessages(container.querySelector('[data-msg]'), user) : null;
  // The avatar button opens the account menu (the bell and messages wire themselves up in their own setup functions)
  const account = container.querySelector('[data-account]');
  attachDropdown(account.querySelector('.avatar-btn'), account.querySelector('.dd-panel'));
  container.querySelector('[data-logout]').addEventListener('click', logout);

  // Unread counts: now, every 30 seconds, and whenever a chat window marks messages as read
  async function refreshCounts() {
    try {
      bell.setCount((await api.get('/notifications/unread-count')).unread);
      if (msg) msg.setCount((await api.get('/messages/unread-count')).unread);
    } catch { /* keep the old numbers */ }
  }
  refreshCounts();
  setInterval(refreshCounts, 30000);
  document.addEventListener('sc:unread-changed', refreshCounts);
}

function setupBell(root) {
  const button = root.querySelector('button.icon-btn');
  const panel = root.querySelector('.dd-panel');
  const list = root.querySelector('[data-list]');
  const readAll = root.querySelector('[data-read-all]');
  const badge = root.querySelector('.badge');
  let unread = 0;

  const setCount = (n) => { unread = n; setBadge(badge, n); readAll.hidden = n <= 0; };

  async function load() {
    try {
      const items = await api.get('/notifications?limit=8');
      render(list, items.length === 0
        ? html`<li class="dd-empty">No notifications yet.</li>`
        : html`${items.map((n) => html`<li><button class="dd-item${n.isRead ? '' : ' unread'}" data-id="${n.notificationId}" data-read="${n.isRead}">
            <span class="dot${n.isRead ? '' : ' on'}"></span>
            <span>${n.message}<span class="muted" style="display:block;font-size:.6875rem">${timeAgo(n.createdAt)}</span></span>
          </button></li>`)}`);
    } catch { render(list, html`<li class="dd-empty">Could not load notifications.</li>`); }
  }

  attachDropdown(button, panel, load);

  onClick(list, '.dd-item', async (item) => {
    if (item.dataset.read === 'true') return;
    item.dataset.read = 'true';
    item.classList.remove('unread');
    item.querySelector('.dot').classList.remove('on');
    setCount(Math.max(0, unread - 1));
    await api.post(`/notifications/${item.dataset.id}/read`).catch(() => {});
  });
  readAll.addEventListener('click', async () => {
    list.querySelectorAll('.dd-item').forEach((i) => { i.dataset.read = 'true'; i.classList.remove('unread'); i.querySelector('.dot').classList.remove('on'); });
    setCount(0);
    await api.post('/notifications/read-all').catch(() => {});
  });

  return { setCount };
}

function setupMessages(root, user) {
  const button = root.querySelector('button.icon-btn');
  const panel = root.querySelector('.dd-panel');
  const list = root.querySelector('[data-list]');
  const badge = root.querySelector('.badge');
  const isStudent = user.role === 'student';
  let conversations = [];
  let timer = null;

  const otherName = (c) => (isStudent ? c.companyName : `${c.firstName} ${c.lastName}`);

  async function load() {
    try {
      conversations = await api.get('/messages/inbox');
      render(list, conversations.length === 0
        ? html`<li class="dd-empty">No conversations yet. ${isStudent ? 'Employers can message you after you apply.' : 'Message an applicant from the Applicants page.'}</li>`
        : html`${conversations.map((c) => html`<li><button class="dd-item" data-app="${c.applicationId}" style="align-items:center">
            <span class="avatar">${initial(otherName(c))}</span>
            <span class="grow">
              <span style="display:flex;justify-content:space-between;gap:.5rem"><span class="truncate" style="font-size:.875rem;font-weight:${c.unread ? 600 : 500}">${otherName(c)}</span><span class="muted" style="font-size:.6875rem;flex:none">${timeAgo(c.lastSentAt)}</span></span>
              <span class="muted truncate" style="display:block;font-size:.6875rem">${c.opportunityTitle}</span>
              <span class="truncate" style="display:block;font-size:.75rem;font-weight:${c.unread ? 600 : 400};color:${c.unread ? 'var(--ink)' : 'var(--muted)'}">${c.lastFromMe ? 'You: ' : ''}${c.lastBody}</span>
            </span>
            ${c.unread > 0 ? html`<span class="dot on" style="margin-top:0"></span>` : ''}
          </button></li>`)}`);
    } catch { render(list, html`<li class="dd-empty">Could not load messages.</li>`); }
  }

  const close = attachDropdown(button, panel, () => {
    load();
    clearInterval(timer);
    timer = setInterval(() => (panel.hidden ? clearInterval(timer) : load()), 10000); // refresh while open
  });

  onClick(list, '.dd-item', (item) => {
    const c = conversations.find((x) => x.applicationId === Number(item.dataset.app));
    if (!c) return;
    openChat({ applicationId: c.applicationId, name: otherName(c), subtitle: c.opportunityTitle });
    close();
  });

  return { setCount: (n) => setBadge(badge, n) };
}
