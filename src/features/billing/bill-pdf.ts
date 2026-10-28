/**
 * A catalog bill as a one-page PDF, written by hand so no PDF library is needed.
 * Plain Helvetica text on an A4 page. Helvetica has no rupee sign, so amounts
 * read "Rs 1,234.56"; anything else outside plain ASCII in a name is replaced.
 */
import { BillLine, paiseToRupees, periodLabel } from './catalog-billing.pricing';

export interface BillForPdf {
  number: string;
  period: string;
  status: string;
  generatedAt: Date;
  lines: BillLine[];
  subtotalPaise: number;
  gstEnabled: boolean;
  gstRateBp: number;
  gstPaise: number;
  totalPaise: number;
  client: { companyName: string; email: string; contactName?: string | null };
}

const ascii = (s: string) => s.replace(/₹/g, 'Rs ').replace(/[^\x20-\x7E]/g, '?');
const esc = (s: string) => ascii(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function rs(paise: number) {
  const [whole, frac] = paiseToRupees(paise).split('.');
  // Indian grouping: 12,34,567.00
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `Rs ${grouped}.${frac}`;
}

// Helvetica / Helvetica-Bold glyph widths (per 1000 em) for characters 32-126,
// from the standard font metrics, so right-aligned amounts line up exactly.
const D = Array(10).fill(556);
const HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, ...D, 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278,
  556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const HELVETICA_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, ...D, 333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333,
  611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

/** Width of `text` in points, as the PDF will draw it. */
function width(text: string, size: number, bold = false) {
  const table = bold ? HELVETICA_BOLD : HELVETICA;
  let w = 0;
  for (const ch of ascii(text)) w += table[ch.charCodeAt(0) - 32] ?? 556;
  return (w / 1000) * size;
}

export function billPdf(bill: BillForPdf): Buffer {
  const ops: string[] = [];
  const text = (x: number, y: number, s: string, size = 10, bold = false) =>
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(s)}) Tj ET`);
  const right = (xRight: number, y: number, s: string, size = 10, bold = false) => text(xRight - width(s, size, bold), y, s, size, bold);
  const rule = (y: number) => ops.push(`0.8 G 50 ${y} m 545 ${y} l S 0 G`);

  let y = 790;
  text(50, y, 'ScaleEzy', 20, true);
  right(545, y, `Bill ${bill.number}`, 12, true);
  y -= 18;
  text(50, y, 'Catalog generation - monthly bill', 10);
  right(545, y, `Status: ${bill.status.charAt(0) + bill.status.slice(1).toLowerCase()}`, 10);
  y -= 34;

  text(50, y, 'Billed to', 9, true);
  text(330, y, 'Period', 9, true);
  y -= 14;
  text(50, y, bill.client.companyName, 11);
  text(330, y, periodLabel(bill.period), 11);
  y -= 14;
  text(330, y, `Made on ${bill.generatedAt.toISOString().slice(0, 10)}`, 10);
  if (bill.client.contactName) { text(50, y, bill.client.contactName, 10); y -= 13; }
  text(50, y, bill.client.email, 10);
  y -= 34;

  text(50, y, 'Item', 9, true);
  right(380, y, 'Quantity', 9, true);
  right(460, y, 'Price', 9, true);
  right(545, y, 'Amount', 9, true);
  y -= 8; rule(y); y -= 16;

  if (!bill.lines.length) { text(50, y, 'No catalogs or colour variants were delivered this month.', 10); y -= 18; }
  for (const line of bill.lines) {
    text(50, y, line.description, 10);
    right(380, y, String(line.quantity), 10);
    right(460, y, rs(line.unitPaise), 10);
    right(545, y, rs(line.amountPaise), 10);
    y -= 18;
  }
  rule(y + 8); y -= 10;

  right(460, y, 'Subtotal', 10); right(545, y, rs(bill.subtotalPaise), 10); y -= 16;
  if (bill.gstEnabled) {
    right(460, y, `GST ${bill.gstRateBp / 100}%`, 10); right(545, y, rs(bill.gstPaise), 10); y -= 16;
  }
  right(460, y, 'Total', 11, true); right(545, y, rs(bill.totalPaise), 11, true); y -= 40;

  text(50, y, 'Only fully delivered runs are charged. A run that failed, was cancelled or delivered fewer views is free.', 8);
  y -= 12;
  text(50, y, 'Amounts in Indian rupees.' + (bill.gstEnabled ? ' GST is added on top of the prices.' : ''), 8);

  const content = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
