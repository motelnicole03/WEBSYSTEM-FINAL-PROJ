import { Link, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext';
import { useDropdown } from '../lib/useDropdown';
import { useUnreadCounts } from '../lib/useUnreadCounts';
import MessagesMenu from './MessagesMenu';
import NotificationBell from './NotificationBell';

/** What a signed-in user sees on the right of the navbar: bell, messages, avatar menu. */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { open, setOpen, toggle, ref } = useDropdown();

  const canMessage = user?.role === 'student' || user?.role === 'employer';
  const counts = useUnreadCounts(canMessage);

  if (!user) return null;

  const name = user.student
    ? `${user.student.firstName} ${user.student.lastName}`
    : (user.employer?.companyName ?? 'Administrator');
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  // The student menu from the design. Employers and admins get a shorter one.
  const items =
    user.role === 'student'
      ? [
          { to: '/applications', label: 'My Applications' },
          { to: '/saved', label: 'Saved Internships' },
          { to: '/profile', label: 'My Profile' },
        ]
      : [{ to: homeFor(user.role), label: user.role === 'employer' ? 'Dashboard' : 'Admin' }];

  const signOut = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  return (
    <div className="flex items-center gap-1">
      <NotificationBell unread={counts.notifications} onUnreadChange={counts.setNotifications} />

      {canMessage && <MessagesMenu unread={counts.messages} />}

      <div ref={ref} className="relative ml-1">
        <button
          onClick={toggle}
          aria-label="Account menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white ring-2 ring-transparent hover:ring-brand/30"
        >
          {initials}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-xl">
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            {items.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-brand-soft">
                {item.label}
              </Link>
            ))}
            <button onClick={signOut} className="block w-full border-t border-line px-4 py-2.5 text-left text-sm text-brand hover:bg-brand-soft">
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
