import { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Field({ label, error, ...input }: Props) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        {...input}
        className={`w-full rounded border px-3 py-2 outline-none focus:border-brand ${error ? 'border-brand' : 'border-line'}`}
      />
      {error && <span className="mt-1 block text-xs text-brand">{error}</span>}
    </label>
  );
}
