import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBill, createClient, loadStore, saveStore } from './backend-store';

describe('backend store', () => {
  it('creates bills and clients and persists them', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'shree-prasad-'));
    const dataFile = join(tempDir, 'data.json');

    const initial = loadStore(dataFile);
    expect(initial.bills).toHaveLength(0);

    const createdBill = createBill(dataFile, {
      customerName: 'Asha Builders',
      siteName: 'Material Supply',
      subtotal: 2500,
      netPayable: 2500,
      items: [{ description: 'Sand', qty: 10, unit: 'ton', rate: 250, amount: 2500 }],
    });

    const createdClient = createClient(dataFile, {
      name: 'Ravi Rao',
      company: 'Ravi Infra',
      phone: '+91 90000 00000',
      location: 'Pune',
      balance: 120000,
      status: 'Active',
      lastActivity: 'Today',
    });

    const stored = loadStore(dataFile);
    expect(createdBill.invoiceNo).toMatch(/^INV-/);
    expect(stored.bills).toHaveLength(1);
    expect(stored.clients).toHaveLength(1);
    expect(createdClient.name).toBe('Ravi Rao');

    saveStore(dataFile, stored);
    rmSync(tempDir, { recursive: true, force: true });
  });
});
