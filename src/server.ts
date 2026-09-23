import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { createPool, type Pool } from 'mysql2/promise';
import { join, relative } from 'node:path';
import {
  createBill,
  createClient,
  createClientEntry,
  getDashboardSummary,
  loadClientStore,
  loadStore,
  type BillItem,
  type ClientPayload,
} from './backend-store';
import { saveInvoicePdf } from './invoice-pdf';

const browserDistFolder = join(import.meta.dirname, '../browser');

interface ClientRow {
  id: string;
  name: string;
  company: string;
  phone: string;
  location: string;
  balance: number;
  status: string;
  lastActivity: string;
  createdAt?: string;
}

interface BillRow {
  invoiceNo: string;
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
  createdAt: string;
}

const app = express();
const angularApp = new AngularNodeAppEngine();

let mysqlPool: Pool | null = null;

async function getMysqlPool(): Promise<Pool | null> {
  if (mysqlPool) {
    return mysqlPool;
  }

  try {
    mysqlPool = createPool({
      host: process.env['MYSQL_HOST'] || 'localhost',
      port: Number(process.env['MYSQL_PORT'] || 3306),
      user: process.env['MYSQL_USER'] || 'root',
      password: process.env['MYSQL_PASSWORD'] || '',
      database: process.env['MYSQL_DATABASE'] || 'client_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const connection = await mysqlPool.getConnection();
    connection.release();
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        company VARCHAR(160) NOT NULL,
        phone VARCHAR(40) NOT NULL DEFAULT '',
        location VARCHAR(160) NOT NULL DEFAULT '',
        balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
        status VARCHAR(40) NOT NULL DEFAULT 'Active',
        lastActivity VARCHAR(80) NOT NULL DEFAULT '',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        invoiceNo VARCHAR(32) PRIMARY KEY,
        customerName VARCHAR(160) NOT NULL,
        customerPhone VARCHAR(40) NOT NULL DEFAULT '',
        siteName VARCHAR(160) NOT NULL DEFAULT '',
        siteAddress VARCHAR(255) NOT NULL DEFAULT '',
        vehicleNo VARCHAR(80) NOT NULL DEFAULT '',
        orderNo VARCHAR(80) NOT NULL DEFAULT '',
        invoiceDate VARCHAR(32) NOT NULL,
        subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
        previousBalance DECIMAL(12, 2) NOT NULL DEFAULT 0,
        advance DECIMAL(12, 2) NOT NULL DEFAULT 0,
        netPayable DECIMAL(12, 2) NOT NULL DEFAULT 0,
        items JSON NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return mysqlPool;
  } catch {
    mysqlPool = null;
    return null;
  }
}

async function readClientsFromDb(): Promise<ClientRow[]> {
  const pool = await getMysqlPool();
  if (!pool) {
    return loadClientStore().clients.map((client) => ({ ...client }));
  }

  try {
    const [rows] = await pool.query('SELECT id, name, company, phone, location, balance, status, lastActivity FROM clients ORDER BY createdAt DESC');
    return Array.isArray(rows) ? (rows as ClientRow[]) : [];
  } catch {
    return loadClientStore().clients.map((client) => ({ ...client }));
  }
}

async function writeClientToDb(payload: ClientPayload): Promise<ClientRow> {
  const pool = await getMysqlPool();
  if (!pool) {
    return createClientEntry(undefined, payload) as ClientRow;
  }

  try {
    const id = `CL-${Date.now()}`;
    const [result] = await pool.query(
      'INSERT INTO clients (id, name, company, phone, location, balance, status, lastActivity, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [id, payload.name, payload.company, payload.phone, payload.location, payload.balance, payload.status, payload.lastActivity],
    );

    return {
      id,
      ...payload,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return createClientEntry(undefined, payload) as ClientRow;
  }
}

async function readBillsFromDb(): Promise<BillRow[]> {
  const pool = await getMysqlPool();
  if (!pool) {
    return loadStore().bills;
  }

  try {
    const [rows] = await pool.query('SELECT invoiceNo, customerName, customerPhone, siteName, siteAddress, vehicleNo, orderNo, invoiceDate, subtotal, previousBalance, advance, netPayable, items, createdAt FROM bills ORDER BY createdAt DESC');
    return (Array.isArray(rows) ? rows : []) as BillRow[];
  } catch {
    return loadStore().bills;
  }
}

async function writeBillToDb(payload: Omit<BillRow, 'invoiceNo' | 'createdAt'>): Promise<BillRow> {
  const pool = await getMysqlPool();
  if (!pool) {
    return createBill(undefined, payload as Parameters<typeof createBill>[1]);
  }

  try {
    const [rows] = await pool.query('SELECT invoiceNo FROM bills ORDER BY createdAt DESC LIMIT 1');
    const lastInvoice = Array.isArray(rows) && rows.length ? String((rows[0] as { invoiceNo: string }).invoiceNo) : '';
    const lastNumber = Number(lastInvoice.replace(/^INV-/, '')) || 0;
    const bill: BillRow = {
      ...payload,
      invoiceNo: `INV-${String(lastNumber + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
    };
    await pool.query(
      'INSERT INTO bills (invoiceNo, customerName, customerPhone, siteName, siteAddress, vehicleNo, orderNo, invoiceDate, subtotal, previousBalance, advance, netPayable, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [bill.invoiceNo, bill.customerName, bill.customerPhone || '', bill.siteName || '', bill.siteAddress || '', bill.vehicleNo || '', bill.orderNo || '', bill.invoiceDate || '', bill.subtotal, bill.previousBalance || 0, bill.advance || 0, bill.netPayable, JSON.stringify(bill.items || [])],
    );
    return bill;
  } catch {
    return createBill(undefined, payload as Parameters<typeof createBill>[1]);
  }
}

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Backend is running' });
});

app.get('/api/dashboard', async (_req, res) => {
  const bills = await readBillsFromDb();
  const clients = await readClientsFromDb();
  res.json({
    totalBills: bills.length,
    totalClients: clients.length,
    pendingBills: bills.filter((bill) => bill.netPayable > 0).length,
  });
});

app.get('/api/bills', async (_req, res) => {
  res.json(await readBillsFromDb());
});

app.post('/api/bills', async (req, res) => {
  try {
    const bill = await writeBillToDb({
      customerName: req.body.customerName || 'Walk-in Customer',
      customerPhone: req.body.customerPhone || '',
      siteName: req.body.siteName || 'Material Supply',
      siteAddress: req.body.siteAddress || '',
      vehicleNo: req.body.vehicleNo || '',
      orderNo: req.body.orderNo || '',
      invoiceDate: req.body.invoiceDate || new Date().toISOString().slice(0, 10),
      subtotal: Number(req.body.subtotal || 0),
      previousBalance: Number(req.body.previousBalance || 0),
      advance: Number(req.body.advance || 0),
      netPayable: Number(req.body.netPayable || req.body.subtotal || 0),
      items: req.body.items || [],
    });

    const pdfPath = await saveInvoicePdf(bill);
    res.status(201).json({
      ...bill,
      pdfPath: relative(process.cwd(), pdfPath).replaceAll('\\', '/'),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to save bill' });
  }
});

app.get('/api/clients', async (_req, res) => {
  try {
    const clients = await readClientsFromDb();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load clients' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const client = await writeClientToDb({
      name: req.body.name || 'Unknown Client',
      company: req.body.company || 'Unknown Company',
      phone: req.body.phone || '',
      location: req.body.location || '',
      balance: Number(req.body.balance || 0),
      status: req.body.status || 'Active',
      lastActivity: req.body.lastActivity || 'Just now',
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to save client' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
