import { CommonModule } from '@angular/common';
import { afterNextRender, Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../shared/api.service';

interface BillRecord {
  invoiceNo: string;
  customerName: string;
  siteName?: string;
  subtotal?: number;
  netPayable: number;
  invoiceDate?: string;
  createdAt: string;
}

interface OutstandingSummary {
  label: string;
  company: string;
  amount: number;
}

interface ClientRecord {
  name: string;
  company: string;
  location: string;
  balance: number;
  status: string;
}

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  bills: BillRecord[] = [];
  clients: ClientRecord[] = [];
  totalInvoiced = 0;
  totalRevenue = 0;
  pendingAmount = 0;
  activeClients = 0;
  collectionRate = 0;
  isLoading = signal(true);
  hasError = signal(false);
  updatingInvoice = '';

  constructor(
    private readonly api: ApiService,
  ) {
    afterNextRender(() => void this.loadDashboard());
  }

  ngOnInit(): void {}

  async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    this.hasError.set(false);
    try {
      const [bills, clients] = await Promise.all([
        this.api.get<BillRecord[]>('/bills'),
        this.api.get<ClientRecord[]>('/clients'),
      ]);

      this.bills = bills;
      this.clients = clients;
      this.totalInvoiced = bills.reduce((total, bill) => total + bill.netPayable, 0);
      this.totalRevenue = bills.reduce((total, bill) => total + (bill.subtotal ?? bill.netPayable), 0);
      this.pendingAmount = bills.reduce((total, bill) => total + Math.max(0, bill.netPayable), 0);
      this.activeClients = clients.filter((client) => client.status === 'Active').length;
      this.collectionRate = this.totalInvoiced
        ? Math.round(((this.totalInvoiced - this.pendingAmount) / this.totalInvoiced) * 100)
        : 0;
    } catch {
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  formatDate(invoiceDate: string | undefined, createdAt: string): string {
    return invoiceDate || new Date(createdAt).toLocaleDateString('en-IN');
  }

  get contractSlices(): PieSlice[] {
    const pending = this.outstandingBills.length;
    return [
      { label: 'Pending', value: pending, color: '#d86632' },
      { label: 'Paid', value: this.bills.length - pending, color: '#29805b' },
    ];
  }

  get outstandingBills(): BillRecord[] {
    return this.bills.filter((bill) => bill.netPayable > 0);
  }

  get outstandingByClient(): OutstandingSummary[] {
    const companyByName = new Map(this.clients.map((client) => [client.name, client.company]));
    const totals = new Map<string, OutstandingSummary>();
    for (const bill of this.outstandingBills) {
      const label = bill.customerName || 'Walk-in Customer';
      const current = totals.get(label) ?? { label, company: companyByName.get(label) || '', amount: 0 };
      current.amount += bill.netPayable;
      totals.set(label, current);
    }
    return [...totals.values()].sort((first, second) => second.amount - first.amount);
  }

  billStatus(bill: BillRecord): string {
    return bill.subtotal && bill.netPayable < bill.subtotal ? 'Half-paid' : 'Unpaid';
  }

  async markBillPaid(bill: BillRecord): Promise<void> {
    this.updatingInvoice = bill.invoiceNo;
    try {
      await this.api.post(`/bills/${encodeURIComponent(bill.invoiceNo)}/pay`, {});
      await this.loadDashboard();
    } catch {
      this.hasError.set(true);
    } finally {
      this.updatingInvoice = '';
    }
  }

  get outstandingSlices(): PieSlice[] {
    const collected = Math.max(0, this.totalInvoiced - this.pendingAmount);
    return [
      { label: 'Outstanding', value: this.pendingAmount, color: '#d86632' },
      { label: 'Collected', value: collected, color: '#29805b' },
    ];
  }

  get revenueSlices(): PieSlice[] {
    const revenueByMonth = new Map<string, { label: string; value: number; sortKey: number }>();
    for (const bill of this.bills) {
      const dateValue = bill.invoiceDate || bill.createdAt;
      const date = new Date(dateValue);
      const isValidDate = !Number.isNaN(date.getTime());
      const key = isValidDate ? `${date.getFullYear()}-${date.getMonth()}` : 'unknown';
      const label = isValidDate
        ? date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        : 'Unknown month';
      const revenue = bill.subtotal ?? bill.netPayable;
      const current = revenueByMonth.get(key) ?? { label, value: 0, sortKey: isValidDate ? date.getTime() : 0 };
      current.value += Math.max(0, revenue);
      revenueByMonth.set(key, current);
    }

    const colors = ['#263b34', '#d86632', '#d9a441', '#5d8b78', '#c55a2c', '#4e6873', '#8b6f47', '#7c5272'];
    return [...revenueByMonth.values()]
      .filter((month) => month.value > 0)
      .sort((first, second) => first.sortKey - second.sortKey)
      .map((month, index) => ({ label: month.label, value: month.value, color: colors[index % colors.length] }));
  }

  chartBackground(slices: PieSlice[]): string {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    if (!total) {
      return 'conic-gradient(#eeeae4 0 100%)';
    }

    let start = 0;
    const stops = slices.map((slice) => {
      const end = start + (slice.value / total) * 100;
      const stop = `${slice.color} ${start}% ${end}%`;
      start = end;
      return stop;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  chartPercentage(slice: PieSlice[], value: number): number {
    const total = slice.reduce((sum, item) => sum + item.value, 0);
    return total ? Math.round((value / total) * 100) : 0;
  }
}
