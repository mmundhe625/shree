import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { BillPayload } from './backend-store';

export type InvoiceRecord = BillPayload & {
  invoiceNo: string;
  createdAt: string;
};

function invoiceDateFolder(invoice: InvoiceRecord): string {
  const date = invoice.invoiceDate || invoice.createdAt.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : invoice.createdAt.slice(0, 10);
}

function currency(value: number | undefined): string {
  return `Rs. ${(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function saveInvoicePdf(invoice: InvoiceRecord, invoicesRoot = join(process.cwd(), 'invoices')): Promise<string> {
  const dateFolder = invoiceDateFolder(invoice);
  const folder = join(invoicesRoot, dateFolder);
  const filePath = join(folder, `${invoice.invoiceNo}.pdf`);
  mkdirSync(folder, { recursive: true });

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 50 });
    const output = createWriteStream(filePath);

    output.once('finish', () => resolve(filePath));
    output.once('error', reject);
    document.once('error', reject);
    document.pipe(output);

    document.fontSize(22).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
    document.moveDown();
    document.fontSize(11).font('Helvetica').text(`Invoice No: ${invoice.invoiceNo}`);
    document.text(`Invoice Date: ${invoice.invoiceDate || dateFolder}`);
    document.moveDown();
    document.font('Helvetica-Bold').text('Bill To');
    document.font('Helvetica').text(invoice.customerName);
    if (invoice.customerPhone) document.text(`Phone: ${invoice.customerPhone}`);
    if (invoice.siteName) document.text(`Site: ${invoice.siteName}`);
    if (invoice.siteAddress) document.text(`Address: ${invoice.siteAddress}`);
    document.moveDown();

    document.font('Helvetica-Bold').text('Description', 50, document.y, { continued: true, width: 260 });
    document.text('Qty', 310, document.y, { continued: true, width: 60, align: 'right' });
    document.text('Rate', 370, document.y, { continued: true, width: 80, align: 'right' });
    document.text('Amount', 450, document.y, { width: 95, align: 'right' });
    document.moveDown(0.5);

    document.font('Helvetica');
    for (const item of invoice.items || []) {
      const description = item.description || item.workType || item.type || 'Item';
      document.text(description, 50, document.y, { continued: true, width: 260 });
      document.text(String(item.qty ?? ''), 310, document.y, { continued: true, width: 60, align: 'right' });
      document.text(currency(item.rate), 370, document.y, { continued: true, width: 80, align: 'right' });
      document.text(currency(item.amount), 450, document.y, { width: 95, align: 'right' });
      document.moveDown(0.4);
    }

    document.moveDown();
    document.font('Helvetica-Bold').text(`Subtotal: ${currency(invoice.subtotal)}`, { align: 'right' });
    document.font('Helvetica').text(`Previous Balance: ${currency(invoice.previousBalance)}`, { align: 'right' });
    document.text(`Advance: ${currency(invoice.advance)}`, { align: 'right' });
    document.font('Helvetica-Bold').text(`Net Payable: ${currency(invoice.netPayable)}`, { align: 'right' });
    document.end();
  });
}