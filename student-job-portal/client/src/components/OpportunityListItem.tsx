import { OpportunitySummary } from '../types';
import { BookmarkIcon, PinIcon } from './icons';

interface Props {
  opportunity: OpportunitySummary;
  selected: boolean;
  saved: boolean;
  onSelect: (id: number) => void;
  onToggleSave: (id: number) => void;
}

/** Compact card for the list on the Find Job page. */
export default function OpportunityListItem({ opportunity: o, selected, saved, onSelect, onToggleSave }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(o.opportunityId)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(o.opportunityId)}
      className={`cursor-pointer rounded-lg border-2 bg-white p-3 text-left transition-colors ${
        selected ? 'border-brand' : 'border-line hover:border-brand/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold leading-snug">{o.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation(); // saving should not change the selected card
            onToggleSave(o.opportunityId);
          }}
          aria-label={saved ? 'Remove from saved' : 'Save opportunity'}
          className="text-brand"
        >
          <BookmarkIcon filled={saved} width={16} height={16} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-soft text-xs font-semibold text-brand">
          {o.companyName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 text-[11px]">
          <p className="truncate font-medium">{o.companyName}</p>
          <p className="flex items-center gap-1 text-muted">
            <PinIcon width={10} height={10} />
            <span className="truncate">{o.location ?? 'Location not specified'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
