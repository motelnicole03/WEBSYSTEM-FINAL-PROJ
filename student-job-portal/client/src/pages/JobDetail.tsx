import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';

interface Detail {
  opportunityId: number;
  type: string;
  title: string;
  description: string | null;
  requirements: string | null;
  location: string | null;
  workSetup: string | null;
  allowanceSalary: number | null;
  slots: number;
  deadline: string | null;
  companyName: string;
  skills?: { id: number; name: string }[];
}

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Detail>(`/opportunities/${id}`).then(setJob).catch((e) => setError(errorMessage(e)));
  }, [id]);

  const apply = async () => {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    setBusy(true);
    setMessage(null);
    try {
      await api.post('/applications', { opportunityId: Number(id), coverLetter: coverLetter.trim() || undefined });
      setMessage({ ok: true, text: 'Application sent. You can track it from your account.' });
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="p-10 text-center text-brand">{error}</p>;
  if (!job) return <p className="p-10 text-center text-muted">Loading...</p>;

  const facts = [
    ['Type', job.type],
    ['Work setup', job.workSetup],
    ['Location', job.location],
    ['Allowance / salary', job.allowanceSalary != null ? `PHP ${job.allowanceSalary.toLocaleString()}` : null],
    ['Slots', String(job.slots)],
    ['Deadline', job.deadline ? new Date(job.deadline).toLocaleDateString() : null],
  ].filter(([, value]) => value);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/jobs" className="text-sm text-brand">&larr; Back to jobs</Link>
      <h1 className="mt-4 text-2xl font-semibold">{job.title}</h1>
      <p className="text-sm text-muted">{job.companyName}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-line p-4 text-sm sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-medium capitalize">{value}</dd>
          </div>
        ))}
      </dl>

      {job.description && <Section title="About the role" text={job.description} />}
      {job.requirements && <Section title="Requirements" text={job.requirements} />}
      {job.skills && job.skills.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {job.skills.map((s) => (
            <span key={s.id} className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand">{s.name}</span>
          ))}
        </div>
      )}

      {user?.role !== 'employer' && user?.role !== 'admin' && (
        <div className="mt-10 rounded-lg border border-line p-5">
          <h2 className="font-semibold">Apply</h2>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Cover letter (optional)"
            rows={4}
            className="mt-3 w-full rounded border border-line p-3 text-sm outline-none focus:border-brand"
          />
          <button onClick={apply} disabled={busy} className="mt-3 rounded bg-brand px-6 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-60">
            {user ? 'Submit application' : 'Log in to apply'}
          </button>
          {message && <p className={`mt-3 text-sm ${message.ok ? 'text-green-700' : 'text-brand'}`}>{message.text}</p>}
        </div>
      )}
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <section className="mt-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{text}</p>
    </section>
  );
}
