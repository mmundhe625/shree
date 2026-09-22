import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../shared/api.service';

interface DashboardSummary {
  totalBills: number;
  totalClients: number;
  pendingBills: number;
}

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  assetType = 'Aggregate Supply';
  vendorName = '';
  invoiceDate = new Date().toISOString().slice(0, 10);
  materialQty = '0';
  unit = '';
  totalAmount = 0;

  ngOnInit1(): void {
    if (this.assetType === 'Aggregate Supply') {
      this.totalAmount = parseFloat(this.materialQty) * 3000; // Assuming a default rate of 3000 for simplicity
    } else {
      this.totalAmount = parseFloat(this.materialQty) * 0; // Assuming a default rate of 0 for simplicity
    }
  }

  ngOnInit2(): void {
    if (this.assetType === 'jcb hire') {
      this.totalAmount = parseFloat(this.materialQty) * 1200; // Assuming a default rate of 1200 for simplicity
    }
  }

  ngOnInit3(): void {
    if (this.assetType === 'Truck Hire') {
      this.totalAmount = parseFloat(this.materialQty) * 1000; // Assuming a default rate of 1000 for simplicity
    }
  }

  statusMessage = '';
  isSubmitting = false;
  summary: DashboardSummary | null = null;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    void this.loadSummary();
  }

  async loadSummary(): Promise<void> {
    try {
      this.summary = await this.api.get<DashboardSummary>('/dashboard');
    } catch {
      this.summary = { totalBills: 0, totalClients: 0, pendingBills: 0 };
    }
  }

  async billGen(): Promise<void> {
    this.isSubmitting = true;
    this.statusMessage = 'Sending invoice to backend...';

    try {
      const payload = {
        customerName: this.vendorName || 'Walk-in Customer',
        customerPhone: '',
        siteName: this.assetType,
        siteAddress: '',
        vehicleNo: '',
        orderNo: '',
        invoiceDate: this.invoiceDate,
        subtotal: this.totalAmount,
        previousBalance: 0,
        advance: 0,
        netPayable: this.totalAmount,
        items: [
          {
            type: 'Material',
            workDate: this.invoiceDate,
            workType: this.assetType,
            qty: this.materialQty,
            unit: this.unit,
            rate: this.totalAmount,
            amount: this.totalAmount,
            description: this.assetType,
          },
        ],
      };

      const data = await this.api.post<{invoiceNo: string}>('/bills', payload);
      this.statusMessage = `Invoice saved successfully. Invoice #${data.invoiceNo}`;
      await this.loadSummary();
    } catch (error) {
      this.statusMessage = error instanceof Error ? error.message : 'Unable to connect to backend';
    } finally {
      this.isSubmitting = false;
    }
  }
}
