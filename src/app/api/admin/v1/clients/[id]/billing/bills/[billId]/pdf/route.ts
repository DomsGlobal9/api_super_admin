import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { asAdmin, notFound } from '@/features/billing/catalog-billing.http';
import { billPdf } from '@/features/billing/bill-pdf';
import { BillLine } from '@/features/billing/catalog-billing.pricing';

/** The bill as a PDF to send to the client. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; billId: string }> }) {
  return asAdmin(async () => {
    const { id, billId } = await params;
    const bill = await prisma.catalogBill.findFirst({
      where: { id: billId, clientId: id },
      include: { client: { select: { companyName: true, email: true, contactName: true } } },
    });
    if (!bill) return notFound('That bill was not found.');
    const pdf = billPdf({ ...bill, lines: bill.lines as unknown as BillLine[] });
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${bill.number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
