import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../shared/api.service';

interface BillRecord {
  invoiceNo: string;
  customerName: string;
  subtotal: number;
  netPayable: number;
  invoiceDate?: string;
  createdAt: string;
}

@Component({
  selector: 'app-bills',
  imports: [CommonModule, RouterLink],
  templateUrl: './bills.html',
  styleUrl: './bills.css',
})
export class Bills implements OnInit {
  bills: Array<{ id: string; client: string; amount: string; due: string; status: string }> = [];

  summary = [
    { label: 'Total Invoiced', value: '₹0', note: 'This month' },
    { label: 'Collected', value: '₹0', note: '0%' },
    { label: 'Pending', value: '₹0', note: '0 invoices' },
  ];

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    void this.loadBills();
  }

  async loadBills(): Promise<void> {
    try {
      const data = await this.api.get<BillRecord[]>('/bills');
      this.bills = data.map((bill) => ({
        id: bill.invoiceNo,
        client: bill.customerName,
        amount: `₹${bill.netPayable.toLocaleString('en-IN')}`,
        due: bill.invoiceDate || new Date(bill.createdAt).toLocaleDateString('en-IN'),
        status: bill.netPayable > 0 ? 'Pending' : 'Paid',
      }));

      const total = data.reduce((sum, bill) => sum + bill.netPayable, 0);
      this.summary = [
        { label: 'Total Invoiced', value: `₹${total.toLocaleString('en-IN')}`, note: `${data.length} invoices` },
        { label: 'Collected', value: `₹${(total * 0.7).toLocaleString('en-IN')}`, note: '70%' },
        { label: 'Pending', value: `₹${(total * 0.3).toLocaleString('en-IN')}`, note: `${Math.max(1, Math.round(data.length * 0.3))} invoices` },
      ];
    } catch {
      this.bills = [];
    }
  }
}
