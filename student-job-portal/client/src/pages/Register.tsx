import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Field from '../components/Field';
import { homeFor, useAuth } from '../context/AuthContext';
import { api, errorMessage, fieldErrors } from '../lib/api';

type Role = 'student' | 'employer';
interface Program { programId: number; programName: string }

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [role, setRole] = useState<Role>(params.get('role') === 'employer' ? 'employer' : 'student');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ programId: '', yearLevel: '1' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Program[]>('/lookups/programs').then(setPrograms).catch(() => {});
  }, []);

  const set = (key: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});

    const common = { role, email: form.email, password: form.password };
    const payload =
      role === 'student'
        ? {
            ...common,
            firstName: form.firstName,
            lastName: form.lastName,
            studentNumber: form.studentNumber,
            programId: Number(form.programId),
            yearLevel: Number(form.yearLevel),
          }
        : {
            ...common,
            companyName: form.companyName,
            industry: form.industry || undefined,
            contactPerson: form.contactPerson || undefined,
            address: form.address || undefined,
          };

    try {
      const user = await register(payload);
      navigate(homeFor(user.role), { replace: true });
    } catch (e) {
      setErrors(fieldErrors(e));
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const tab = (value: Role, label: string) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      className={`flex-1 rounded py-2 text-sm font-medium ${role === value ? 'bg-brand text-white' : 'text-brand hover:bg-brand-soft'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-md px-6 py-14">
      <h1 className="text-2xl font-semibold">Create your account</h1>

      <div className="mt-6 flex gap-2 rounded border border-brand p-1">
        {tab('student', "I'm a student")}
        {tab('employer', "I'm an employer")}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {role === 'student' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required value={form.firstName ?? ''} onChange={set('firstName')} error={errors.firstName} />
              <Field label="Last name" required value={form.lastName ?? ''} onChange={set('lastName')} error={errors.lastName} />
            </div>
            <Field label="Student number" required value={form.studentNumber ?? ''} onChange={set('studentNumber')} error={errors.studentNumber} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Program</span>
              <select required value={form.programId} onChange={set('programId')} className="w-full rounded border border-line bg-white px-3 py-2">
                <option value="">Select your program</option>
                {programs.map((p) => <option key={p.programId} value={p.programId}>{p.programName}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Year level</span>
              <select value={form.yearLevel} onChange={set('yearLevel')} className="w-full rounded border border-line bg-white px-3 py-2">
                {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </>
        ) : (
          <>
            <Field label="Company name" required value={form.companyName ?? ''} onChange={set('companyName')} error={errors.companyName} />
            <Field label="Industry" value={form.industry ?? ''} onChange={set('industry')} error={errors.industry} />
            <Field label="Contact person" value={form.contactPerson ?? ''} onChange={set('contactPerson')} error={errors.contactPerson} />
            <Field label="Address" value={form.address ?? ''} onChange={set('address')} error={errors.address} />
            <p className="rounded bg-brand-soft px-3 py-2 text-xs text-brand">
              New employer accounts are verified by an admin before opportunities can be posted.
            </p>
          </>
        )}

        <Field label="Email" type="email" required autoComplete="email" value={form.email ?? ''} onChange={set('email')} error={errors.email} />
        <Field label="Password" type="password" required minLength={8} autoComplete="new-password" value={form.password ?? ''} onChange={set('password')} error={errors.password} />

        {error && <p className="text-sm text-brand">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
          {busy ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="text-brand underline">Login</Link>
      </p>
    </div>
  );
}
