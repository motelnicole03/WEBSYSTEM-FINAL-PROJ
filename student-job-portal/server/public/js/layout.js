// Builds the shared page frames: the public site (navbar + footer) and the portals (sidebar + top bar).
import { homeFor, loadUser, requireRole } from './auth.js';
import { initChat } from './chat.js';
import { html, render } from './ui.js';
import { mountUserMenu } from './usermenu.js';

// ---------- public site ----------

const SITE_NAV = [
  ['/', 'Home', 'home'],
  ['/jobs.html', 'Find Job', 'jobs'],
  ['/coming-soon.html?title=Company%20Reviews&note=Reviews%20need%20their%20own%20database%20tables%20and%20endpoints%20first.', 'Company Reviews', 'reviews'],
];

/** Navbar and footer. `overlay` makes the navbar float transparently over the landing hero. */
export async function mountSite({ active, overlay = false } = {}) {
  const user = await loadUser();

  const header = document.getElementById('site-header');
  render(header, html`<header class="site-header${overlay ? ' overlay' : ''}">
    <div class="nav-inner">
      <a class="logo" href="/"><b>SC</b><span>StudentConnect</span></a>
      <nav class="nav-links">${SITE_NAV.map(([href, label, key]) => html`<a href="${href}" class="${key === active ? 'active' : ''}">${label}</a>`)}</nav>
      <div class="nav-actions" data-actions>
        ${user ? '' : html`<a class="btn sm" href="/register.html">Signup</a><a class="btn primary sm" href="/login.html">Login</a>`}
      </div>
    </div>
  </header>`);

  // The navbar gains a background once the page scrolls
  const bar = header.querySelector('.site-header');
  const onScroll = () => bar.classList.toggle('scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (user) {
    if (user.role !== 'admin') initChat(user);
    mountUserMenu(header.querySelector('[data-actions]'), user);
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    render(footer, html`<footer class="site-footer">
      <div class="footer-grid">
        <div><p style="font-size:1.5rem;font-weight:700">SC <span style="font-size:1rem;font-weight:500">StudentConnect</span></p>
          <p class="small" style="margin-top:.75rem;color:rgba(255,255,255,.8)">Connecting students with internships, OJT and entry-level jobs.</p></div>
        <div><h4>Students</h4><ul><li><a href="/jobs.html">Find a job</a></li><li><a href="/register.html">Create an account</a></li></ul></div>
        <div><h4>Employers</h4><ul><li><a href="/register.html?role=employer">Post an opportunity</a></li><li><a href="/login.html">Employer login</a></li></ul></div>
      </div>
      <p class="footer-bottom">&copy; ${new Date().getFullYear()} StudentConnect</p>
    </footer>`);
  }
  return user;
}

// ---------- portals ----------

const NAV = {
  employer: {
    label: 'EMPLOYER PORTAL',
    items: [
      ['/employer/index.html', 'Dashboard', 'dashboard'],
      ['/employer/jobs.html', 'Job Posts', 'jobs'],
      ['/employer/applicants.html', 'Applicants', 'applicants'],
      ['/employer/interviews.html', 'Interviews', 'interviews'],
      ['/employer/messages.html', 'Messages', 'messages'],
    ],
  },
  admin: {
    label: 'ADMIN PORTAL',
    items: [
      ['/admin/index.html', 'Dashboard', 'dashboard'],
      ['/admin/coming-soon.html?key=students&title=Student%20Management&note=Listing%20and%20suspending%20students%20needs%20new%20backend%20endpoints.', 'Student Management', 'students'],
      ['/admin/jobs.html', 'Job Management', 'jobs'],
      ['/admin/reports.html', 'Reports & Analytics', 'reports'],
      ['/admin/coming-soon.html?key=settings&title=Settings&note=Coming%20next.', 'Settings', 'settings'],
    ],
    help: ['/admin/coming-soon.html?key=help&title=Help%20Center&note=Coming%20next.', 'Help Center', 'help'],
  },
};

/**
 * Wraps the page in the red sidebar layout. The page needs:
 *   <aside id="sidebar"></aside> <div class="portal-body"><div id="topbar" class="portal-topbar"></div><main id="main" class="portal-main">...</main></div>
 * Returns the signed-in user (after checking the role).
 */
export async function mountPortal(portal, active) {
  const user = await requireRole([portal]);
  const config = NAV[portal];
  const link = ([href, label, key]) => html`<a href="${href}" class="${key === active ? 'active' : ''}">${label}</a>`;

  const aside = document.getElementById('sidebar');
  aside.className = 'sidebar closed';
  render(aside, html`<div class="brand-block"><b>StudentConnect</b><small>${config.label}</small></div>
    <nav>${config.items.map(link)}</nav>
    ${config.help ? html`<div class="help"><small>HELP & SUPPORT</small><nav style="padding:0">${link(config.help)}</nav></div>` : ''}`);

  // Phone: a top bar with a menu button opens the sidebar
  const bar = document.createElement('div');
  bar.className = 'mobile-bar';
  bar.innerHTML = '<b>StudentConnect</b><button type="button">Menu</button>';
  bar.querySelector('button').addEventListener('click', (e) => {
    const closed = aside.classList.toggle('closed');
    e.currentTarget.textContent = closed ? 'Menu' : 'Close';
  });
  document.body.prepend(bar);

  if (user.role !== 'admin') initChat(user);
  mountUserMenu(document.getElementById('topbar'), user);
  return user;
}

export { homeFor };
