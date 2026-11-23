/**
 * Shows plain text from the database as paragraphs and bullet lists.
 * Lines starting with "-", "*" or a bullet become list items; blank lines separate blocks.
 * A short line ending with ":" becomes a bold sub-heading ("Key Responsibilities:").
 */
export default function RichText({ text }: { text: string }) {
  const blocks: { type: 'p' | 'ul' | 'h'; lines: string[] }[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: 'p', lines: [] }); // blank line closes the current block
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const last = blocks[blocks.length - 1];

    if (bullet) {
      if (last?.type === 'ul') last.lines.push(bullet[1]);
      else blocks.push({ type: 'ul', lines: [bullet[1]] });
    } else if (line.endsWith(':') && line.length < 60) {
      blocks.push({ type: 'h', lines: [line] });
    } else if (last?.type === 'p') {
      last.lines.push(line);
    } else {
      blocks.push({ type: 'p', lines: [line] });
    }
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {blocks
        .filter((b) => b.lines.length > 0)
        .map((b, i) =>
          b.type === 'ul' ? (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {b.lines.map((l, j) => <li key={j}>{l}</li>)}
            </ul>
          ) : b.type === 'h' ? (
            <p key={i} className="pt-2 font-medium text-ink">{b.lines[0]}</p>
          ) : (
            <p key={i}>{b.lines.join(' ')}</p>
          ),
        )}
    </div>
  );
}
