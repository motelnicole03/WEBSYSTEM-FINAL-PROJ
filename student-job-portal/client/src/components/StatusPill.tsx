const STYLES: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Submitted', className: 'bg-slate-100 text-slate-700' },
  under_review: { label: 'Under review', className: 'bg-blue-50 text-blue-700' },
  shortlisted: { label: 'Shortlisted', className: 'bg-indigo-50 text-indigo-700' },
  interview: { label: 'Interview', className: 'bg-amber-50 text-amber-700' },
  offered: { label: 'Offered', className: 'bg-emerald-50 text-emerald-700' },
  hired: { label: 'Hired', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Not selected', className: 'bg-red-50 text-red-700' },
  declined: { label: 'Declined', className: 'bg-slate-100 text-slate-500' },
  withdrawn: { label: 'Withdrawn', className: 'bg-slate-100 text-slate-500' },
};

export default function StatusPill({ status }: { status: string }) {
  const s = STYLES[status] ?? { label: status, className: 'bg-slate-100 text-slate-700' };
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.className}`}>{s.label}</span>;
}
