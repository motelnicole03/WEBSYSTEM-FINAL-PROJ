import { useAuth } from '../context/AuthContext';

// Placeholder. The employer dashboard is built next, from the Figma screens.
export default function EmployerHome() {
  const { user } = useAuth();
  const status = user?.employer?.verificationStatus;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Welcome, {user?.employer?.companyName}</h1>
      {status === 'verified' ? (
        <p className="mt-3 text-sm text-muted">Your company is verified. The employer dashboard is coming next.</p>
      ) : (
        <p className="mt-3 rounded bg-brand-soft px-4 py-3 text-sm text-brand">
          Your company is <strong>{status}</strong>. An admin needs to verify it before you can post opportunities.
        </p>
      )}
    </div>
  );
}
