import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import UserMenu from './UserMenu';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `border-b-2 pb-1 text-sm transition-colors ${
    isActive ? 'border-brand text-brand' : 'border-transparent text-ink hover:text-brand'
  }`;

export default function Navbar({ overlay = false }: { overlay?: boolean }) {
  const { user } = useAuth();

  // Track scrolling so the navbar can gain a background
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  return (
    <header
      className={`z-50 transition-all duration-300 ${
        // Landing page: floats over the hero (fixed). Other pages: takes its own space and sticks (sticky).
        overlay ? 'fixed inset-x-0 top-0' : 'sticky top-0'
      } ${
        scrolled
          ? 'bg-white/95 shadow-md backdrop-blur'
          : overlay
            ? 'bg-transparent'
            : 'bg-white'
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Logo />

        <nav className="flex items-center gap-8">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/jobs" className={linkClass}>Find Job</NavLink>
          <NavLink to="/reviews" className={linkClass}>Company Reviews</NavLink>
        </nav>

        {user ? (
          <UserMenu />
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link to="/register" className="rounded border border-brand px-4 py-1.5 text-brand hover:bg-brand-soft">Signup</Link>
            <Link to="/login" className="rounded bg-brand px-4 py-1.5 text-white hover:bg-brand-dark">Login</Link>
          </div>
        )}
      </div>
    </header>
  );
}
