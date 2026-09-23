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
  assetType = 'Material Supply';
  materialName = '';
  vendorName = '';
  invoiceDate = new Date().toISOString().slice(0, 10);
  materialQty = 0;
  unit = 'ton';
  rate = 0;
  totalAmount = 0;

  statusMessage = '';
  isSubmitting = false;
  summary: DashboardSummary | null = null;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.updateRateForAsset();
    this.calculateTotal();
    void this.loadSummary();
  }

  updateRateForAsset(): void {
    const defaultRates: Record<string, number> = {
      'Material Supply': 0,
      'JCB Hire': 1200,
      'Tipper Service': 1000,
    };
    const defaultUnits: Record<string, string> = {
      'Material Supply': 'ton',
      'JCB Hire': 'hrs',
      'Tipper Service': 'hrs',
    };
    this.rate = defaultRates[this.assetType] ?? 0;
    this.unit = defaultUnits[this.assetType] ?? '';
    if (this.assetType !== 'Material Supply') {
      this.materialName = '';
    }
    this.calculateTotal();
  }

  calculateTotal(): void {
    const quantity = Number(this.materialQty) || 0;
    const rate = Number(this.rate) || 0;
    this.totalAmount = Math.max(0, quantity * rate);
  }

  async loadSummary(): Promise<void> {
    try {
      this.summary = await this.api.get<DashboardSummary>('/dashboard');
    } catch {
      this.summary = { totalBills: 0, totalClients: 0, pendingBills: 0 };
    }
  }

  async billGen(): Promise<void> {
    if (this.assetType === 'Material Supply' && !this.materialName.trim()) {
      this.statusMessage = 'Please enter a material name.';
      return;
    }

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
            rate: this.rate,
            amount: this.totalAmount,
            description: this.assetType === 'Material Supply' ? this.materialName.trim() : this.assetType,
            materialName: this.assetType === 'Material Supply' ? this.materialName.trim() : '',
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
