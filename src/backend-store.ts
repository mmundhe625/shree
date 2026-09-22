import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface BillItem {
  type?: string;
  workDate?: string;
  workType?: string;
  qty?: number;
  unit?: string;
  rate?: number;
  amount?: number;
  description?: string;
}

export interface BillPayload {
  customerName: string;
  customerPhone?: string;
  siteName?: string;
  siteAddress?: string;
  vehicleNo?: string;
  orderNo?: string;
  invoiceDate?: string;
  subtotal: number;
  previousBalance?: number;
  advance?: number;
  netPayable: number;
  items: BillItem[];
}

export interface ClientPayload {
  name: string;
  company: string;
  phone: string;
  location: string;
  balance: number;
  status: string;
  lastActivity: string;
}

export interface StoredData {
  bills: Array<BillPayload & { invoiceNo: string; createdAt: string }>;
  clients: Array<ClientPayload & { id: string; createdAt: string }>;
}

export interface ClientStoreData {
  clients: Array<ClientPayload & { id: string; createdAt: string }>;
}

const defaultStore: StoredData = {
  bills: [],
  clients: [],
};

const defaultClientStore: ClientStoreData = {
  clients: [],
};

export function getDataFilePath(): string {
  return join(process.cwd(), 'data', 'app-data.json');
}

export function getClientDataFilePath(): string {
  return join(process.cwd(), 'data', 'client.json');
}

export function loadStore(filePath = getDataFilePath()): StoredData {
  if (!existsSync(filePath)) {
    const dir = dirname(filePath);
    mkdirSync(dir, { recursive: true });
    saveStore(filePath, defaultStore);
    return defaultStore;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content) as Partial<StoredData>;
    return {
      bills: parsed.bills ?? [],
      clients: parsed.clients ?? [],
    };
  } catch {
    saveStore(filePath, defaultStore);
    return defaultStore;
  }
}

export function saveStore(filePath = getDataFilePath(), store: StoredData): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(store, null, 2));
}

export function createBill(filePath = getDataFilePath(), payload: BillPayload): StoredData['bills'][number] {
  const store = loadStore(filePath);
  const invoiceNo = `INV-${String(store.bills.length + 1).padStart(4, '0')}`;
  const bill = {
    ...payload,
    invoiceNo,
    createdAt: new Date().toISOString(),
  };

  store.bills.push(bill);
  saveStore(filePath, store);
  return bill;
}

export function loadClientStore(filePath = getClientDataFilePath()): ClientStoreData {
  if (!existsSync(filePath)) {
    const dir = dirname(filePath);
    mkdirSync(dir, { recursive: true });
    saveClientStore(filePath, defaultClientStore);
    return defaultClientStore;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content) as Partial<ClientStoreData>;
    return {
      clients: parsed.clients ?? [],
    };
  } catch {
    saveClientStore(filePath, defaultClientStore);
    return defaultClientStore;
  }
}

export function saveClientStore(filePath = getClientDataFilePath(), store: ClientStoreData): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(store, null, 2));
}

export function createClient(filePath = getDataFilePath(), payload: ClientPayload): StoredData['clients'][number] {
  const store = loadStore(filePath);
  const client = {
    ...payload,
    id: `CL-${String(store.clients.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
  };

  store.clients.push(client);
  saveStore(filePath, store);
  return client;
}

export function createClientEntry(filePath = getClientDataFilePath(), payload: ClientPayload): ClientStoreData['clients'][number] {
  const store = loadClientStore(filePath);
  const client = {
    ...payload,
    id: `CL-${String(store.clients.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
  };

  store.clients.push(client);
  saveClientStore(filePath, store);
  return client;
}

export function getDashboardSummary(filePath = getDataFilePath()): {
  totalBills: number;
  totalClients: number;
  pendingBills: number;
} {
  const store = loadStore(filePath);
  return {
    totalBills: store.bills.length,
    totalClients: store.clients.length,
    pendingBills: store.bills.filter((bill) => bill.netPayable > 0).length,
  };
}
