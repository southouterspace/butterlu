/** The Drive file names for one render, e.g. "2026-11-04 Etsy 3412 Aunt Sarah - print.pdf". */
export function renderFileNames(id: string, label: string | undefined, now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const cleaned = (label ?? '')
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .trim();
  const stem = `${day} ${cleaned || `frame ${id.slice(0, 8)}`}`;
  return { print: `${stem} - print.pdf`, proof: `PROOF ${stem} - not for printing.pdf` };
}
