import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../shared/api.service';

interface BillRecord {
  invoiceNo: string;
  customerName: string;
  siteName?: string;
  netPayable: number;
  invoiceDate?: string;
  createdAt: string;
}

interface ClientRecord {
  name: string;
  company: string;
  location: string;
  balance: number;
  status: string;
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
  pendingAmount = 0;
  activeClients = 0;
  collectionRate = 0;
  isLoading = true;
  hasError = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    void this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    try {
      const [bills, clients] = await Promise.all([
        this.api.get<BillRecord[]>('/bills'),
        this.api.get<ClientRecord[]>('/clients'),
      ]);

      this.bills = bills;
      this.clients = clients;
      this.totalInvoiced = bills.reduce((total, bill) => total + bill.netPayable, 0);
      this.pendingAmount = bills.reduce((total, bill) => total + Math.max(0, bill.netPayable), 0);
      this.activeClients = clients.filter((client) => client.status === 'Active').length;
      this.collectionRate = this.totalInvoiced
        ? Math.round(((this.totalInvoiced - this.pendingAmount) / this.totalInvoiced) * 100)
        : 0;
    } catch {
      this.hasError = true;
    } finally {
      this.isLoading = false;
    }
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  formatDate(invoiceDate: string | undefined, createdAt: string): string {
    return invoiceDate || new Date(createdAt).toLocaleDateString('en-IN');
  }
}
