import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-24 bg-brand text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-bold">SC <span className="text-base font-medium">StudentConnect</span></p>
          <p className="mt-3 text-sm text-white/80">
            Connecting students with internships, OJT and entry-level jobs.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Students</p>
          <ul className="space-y-2 text-white/80">
            <li><Link to="/jobs" className="hover:text-white">Find a job</Link></li>
            <li><Link to="/register" className="hover:text-white">Create an account</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Employers</p>
          <ul className="space-y-2 text-white/80">
            <li><Link to="/register?role=employer" className="hover:text-white">Post an opportunity</Link></li>
            <li><Link to="/login" className="hover:text-white">Employer login</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/20 py-4 text-center text-xs text-white/70">
        &copy; {new Date().getFullYear()} StudentConnect
      </p>
    </footer>
  );
}
