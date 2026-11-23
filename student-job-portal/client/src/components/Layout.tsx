import { Outlet, useLocation } from 'react-router-dom';
import ChatDock from './ChatDock';
import Footer from './Footer';
import Navbar from './Navbar';

export default function Layout() {
  // On the landing page the hero image runs behind a transparent navbar
  const overlay = useLocation().pathname === '/';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar overlay={overlay} />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <ChatDock />
    </div>
  );
}
