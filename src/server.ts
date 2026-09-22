import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { createPool, type Pool } from 'mysql2/promise';
import { join } from 'node:path';
import {
  createBill,
  createClient,
  createClientEntry,
  getDashboardSummary,
  loadClientStore,
  loadStore,
  type ClientPayload,
} from './backend-store';

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
    const [result] = await pool.query(
      'INSERT INTO clients (name, company, phone, location, balance, status, lastActivity, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [payload.name, payload.company, payload.phone, payload.location, payload.balance, payload.status, payload.lastActivity],
    );

    const insertId = typeof result === 'object' && result !== null && 'insertId' in result ? Number((result as { insertId?: number }).insertId) : undefined;
    return {
      id: insertId ? `CL-${insertId}` : `CL-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return createClientEntry(undefined, payload) as ClientRow;
  }
}

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Backend is running' });
});

app.get('/api/dashboard', (_req, res) => {
  res.json(getDashboardSummary());
});

app.get('/api/bills', (_req, res) => {
  res.json(loadStore().bills);
});

app.post('/api/bills', (req, res) => {
  try {
    const bill = createBill(undefined, {
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

    res.status(201).json(bill);
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
