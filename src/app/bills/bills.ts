import { afterNextRender, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../shared/api.service';

interface BillRecord {
  invoiceNo: string;
  customerName: string;
  subtotal?: number;
  previousBalance?: number;
  netPayable: number;
  approvalStatus: 'Pending' | 'Approved';
  invoiceDate?: string;
  createdAt: string;
}

interface BillRow {
  id: string;
  client: string;
  total: number;
  outstanding: number;
  date: string;
  status: 'Paid' | 'Half-paid' | 'Unpaid';
  approvalStatus: 'Pending' | 'Approved';
}

@Component({
  selector: 'app-bills',
  imports: [CommonModule, RouterLink],
  templateUrl: './bills.html',
  styleUrl: './bills.css',
})
export class Bills {
  bills: BillRow[] = [];
  isLoading = signal(true);
  errorMessage = signal('');
  payingInvoice = signal('');
  approvingInvoice = signal('');

  summary = [
    { label: 'Total Invoiced', value: '₹0', note: 'This month' },
    { label: 'Collected', value: '₹0', note: '0%' },
    { label: 'Pending', value: '₹0', note: '0 invoices' },
  ];

  constructor(private readonly api: ApiService) {
    afterNextRender(() => void this.loadBills());
  }

  async loadBills(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const data = await this.api.get<BillRecord[]>('/bills');
      this.bills = data.map((bill) => ({
        id: bill.invoiceNo,
        client: bill.customerName,
        total: this.totalFor(bill),
        outstanding: Math.max(0, bill.netPayable),
        date: bill.invoiceDate || new Date(bill.createdAt).toLocaleDateString('en-IN'),
        status: this.statusFor(bill),
        approvalStatus: bill.approvalStatus,
      }));

      const total = this.totalInvoiced(data);
      const outstanding = this.outstandingTotal(data);
      const collected = Math.max(0, total - outstanding);
      this.summary = [
        { label: 'Total Invoiced', value: `₹${total.toLocaleString('en-IN')}`, note: `${data.length} invoices` },
        { label: 'Collected', value: `₹${collected.toLocaleString('en-IN')}`, note: `${total ? Math.round((collected / total) * 100) : 0}%` },
        { label: 'Pending', value: `₹${outstanding.toLocaleString('en-IN')}`, note: `${data.filter((bill) => bill.netPayable > 0).length} invoices` },
      ];
    } catch {
      this.bills = [];
      this.errorMessage.set('Unable to load bills. Check that the backend is running.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async markPaid(bill: BillRow): Promise<void> {
    this.payingInvoice.set(bill.id);
    this.errorMessage.set('');
    try {
      await this.api.post(`/bills/${encodeURIComponent(bill.id)}/pay`, {});
      await this.loadBills();
    } catch {
      this.errorMessage.set(`Unable to mark ${bill.id} as paid.`);
    } finally {
      this.payingInvoice.set('');
    }
  }

  async approveBill(bill: BillRow): Promise<void> {
    this.approvingInvoice.set(bill.id);
    this.errorMessage.set('');
    try {
      await this.api.post(`/bills/${encodeURIComponent(bill.id)}/approve`, {});
      await this.loadBills();
    } catch {
      this.errorMessage.set(`Unable to approve ${bill.id}.`);
    } finally {
      this.approvingInvoice.set('');
    }
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  private totalFor(bill: BillRecord): number {
    return Math.max(0, bill.subtotal ?? bill.netPayable);
  }

  private statusFor(bill: BillRecord): BillRow['status'] {
    const total = this.totalFor(bill);
    if (bill.netPayable <= 0) return 'Paid';
    return bill.netPayable < total ? 'Half-paid' : 'Unpaid';
  }

  private totalInvoiced(data: BillRecord[]): number {
    return data.reduce((sum, bill) => sum + this.totalFor(bill), 0);
  }

  private outstandingTotal(data: BillRecord[]): number {
    return data.reduce((sum, bill) => sum + Math.max(0, bill.netPayable), 0);
  }
}
