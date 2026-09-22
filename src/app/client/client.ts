import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
export class Client implements OnInit {
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
  statusMessage = '';
  isSubmitting = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    void this.loadClients();
  }

  async loadClients(): Promise<void> {
    try {
      const data = await this.api.get<ClientRecord[]>('/clients');
      this.clients = data;
      this.summary[0].value = String(data.filter((client) => client.status === 'Active').length);
      this.summary[1].value = String(data.filter((client) => client.status === 'Pending').length);
      this.summary[2].value = `₹${data.reduce((total, client) => total + client.balance, 0).toLocaleString('en-IN')}`;
    } catch {
      this.clients = [];
    }
  }

  async addClient(): Promise<void> {
    if (!this.newClientName.trim()) {
      this.statusMessage = 'Please enter a client name.';
      return;
    }

    this.isSubmitting = true;
    this.statusMessage = 'Saving client to database...';
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

      this.statusMessage = 'Client saved successfully.';
      this.newClientName = '';
      this.newCompany = '';
      this.newPhone = '';
      this.newLocation = '';
      this.newBalance = 0;
    } catch (error) {
      this.statusMessage = error instanceof Error ? error.message : 'Unable to save client';
    } finally {
      this.isSubmitting = false;
    }
  }
}
