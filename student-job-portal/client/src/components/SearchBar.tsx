import { FormEvent, useState } from 'react';
import { PinIcon, SearchIcon } from './icons';

interface Props {
  initialQ?: string;
  initialLocation?: string;
  onSearch: (q: string, location: string) => void;
  buttonLabel?: string;
}

/** The job title / location search box from the hero. */
export default function SearchBar({ initialQ = '', initialLocation = '', onSearch, buttonLabel = 'Search' }: Props) {
  const [q, setQ] = useState(initialQ);
  const [location, setLocation] = useState(initialLocation);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(q.trim(), location.trim());
  };

  return (
    <form onSubmit={submit} className="flex w-full max-w-xl items-center gap-2 rounded-lg bg-white p-2 shadow-lg">
      <label className="flex flex-1 items-center gap-2 px-2 text-brand">
        <SearchIcon />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Job Title, Keywords ..."
          aria-label="Job title or keywords"
          className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted"
        />
      </label>
      <label className="flex flex-1 items-center gap-2 border-l border-line px-2 text-brand">
        <PinIcon />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Batangas City"
          aria-label="Location"
          className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted"
        />
      </label>
      <button type="submit" className="rounded bg-brand px-6 py-2 text-xs font-medium text-white hover:bg-brand-dark">
        {buttonLabel}
      </button>
    </form>
  );
}
