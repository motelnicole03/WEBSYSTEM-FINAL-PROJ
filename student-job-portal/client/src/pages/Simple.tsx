import { Link } from 'react-router-dom';

export function Reviews() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">Company Reviews</h1>
      <p className="mt-3 text-sm text-muted">Coming soon. Reviews need their own database tables and endpoints first.</p>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-brand underline">Back to home</Link>
    </div>
  );
}

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-muted">{note}</p>
    </div>
  );
}
