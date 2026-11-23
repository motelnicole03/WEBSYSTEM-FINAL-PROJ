import { Link } from 'react-router-dom';
import { OpportunitySummary } from '../types';
import { BookmarkIcon, PinIcon } from './icons';

interface Props {
  opportunity: OpportunitySummary;
  saved: boolean;
  onToggleSave: (id: number) => void;
  onApply: (id: number) => void;
}

export default function OpportunityCard({ opportunity: o, saved, onToggleSave, onApply }: Props) {
  return (
    <article className="flex flex-col rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{o.title}</h3>
        <button
          onClick={() => onToggleSave(o.opportunityId)}
          aria-label={saved ? 'Remove from saved' : 'Save opportunity'}
          className="text-brand"
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {/* No logo column in the database yet, so show the company initial */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-brand-soft text-base font-semibold text-brand">
          {o.companyName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 text-xs">
          <p className="truncate font-medium">{o.companyName}</p>
          <p className="flex items-center gap-1 text-muted">
            <PinIcon width={12} height={12} />
            <span className="truncate">{o.location ?? 'Location not specified'}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 text-xs">
        <Link to={`/jobs/${o.opportunityId}`} className="rounded border border-line px-4 py-1.5 text-brand hover:bg-brand-soft">
          View Details
        </Link>
        <button onClick={() => onApply(o.opportunityId)} className="rounded bg-brand px-4 py-1.5 text-white hover:bg-brand-dark">
          Apply Now
        </button>
      </div>
    </article>
  );
}
