import { CommonModule } from '@angular/common';
import { afterNextRender, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../shared/api.service';

interface ClientRecord {
  id: string;
  name: string;
  company: string;
  phone: string;
  location: string;
  balance: number;
  status: string;
  lastActivity: string;
}

@Component({
  selector: 'app-client',
  imports: [CommonModule, FormsModule],
  templateUrl: './client.html',
  styleUrl: './client.css',
})
export class Client {
  summary = [
    {
      label: 'Active Clients',
      value: '0',
      note: 'Loaded from backend',
      icon: 'fa-solid fa-users',
      tone: 'amber',
      noteClass: 'card-note-green',
    },
    {
      label: 'Pending Follow-ups',
      value: '0',
      note: 'Awaiting review',
      icon: 'fa-solid fa-bell',
      tone: 'orange',
      noteClass: 'card-note-amber',
    },
    {
      label: 'Collections Due',
      value: '₹0',
      note: 'Updated from server',
      icon: 'fa-solid fa-wallet',
      tone: 'blue',
      noteClass: 'card-note-gray',
    },
  ];

  clients: ClientRecord[] = [];
  newClientName = '';
  newCompany = '';
  newPhone = '';
  newLocation = '';
  newBalance = 0;
  statusMessage = signal('');
  isSubmitting = signal(false);
  isLoading = signal(true);
  errorMessage = signal('');

  constructor(private readonly api: ApiService) {
    afterNextRender(() => void this.loadClients());
  }

  async loadClients(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const data = await this.api.get<ClientRecord[]>('/clients');
      this.clients = data;
      this.summary[0].value = String(data.filter((client) => client.status === 'Active').length);
      this.summary[1].value = String(data.filter((client) => client.status === 'Pending').length);
      this.summary[2].value = `₹${data.reduce((total, client) => total + client.balance, 0).toLocaleString('en-IN')}`;
    } catch {
      this.clients = [];
      this.errorMessage.set('Unable to load clients. Check that the backend is running.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async addClient(): Promise<void> {
    if (!this.newClientName.trim()) {
      this.statusMessage.set('Please enter a client name.');
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('Saving client to database...');
    try {
      const payload = {
        name: this.newClientName.trim(),
        company: this.newCompany.trim() || 'Unnamed Company',
        phone: this.newPhone.trim(),
        location: this.newLocation.trim(),
        balance: Number(this.newBalance || 0),
        status: 'Active',
        lastActivity: 'Just now',
      };

      await this.api.post<ClientRecord, typeof payload>('/clients', payload);
      await this.loadClients();

      this.statusMessage.set('Client saved successfully.');
      this.clearForm();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to save client');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  clearForm(): void {
    this.newClientName = '';
    this.newCompany = '';
    this.newPhone = '';
    this.newLocation = '';
    this.newBalance = 0;
  }
}
