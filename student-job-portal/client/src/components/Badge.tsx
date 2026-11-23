/** The small red count on top of an icon. Hidden when the count is zero. */
export default function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}
