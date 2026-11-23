import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3 text-brand">
      <span className="text-3xl font-bold leading-none tracking-tight">SC</span>
      <span className="text-lg font-medium">StudentConnect</span>
    </Link>
  );
}
