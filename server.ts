/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authRouter } from './server/routes/auth';
import { organizationRouter } from './server/routes/organizations';
import { employeeRouter } from './server/routes/employees';
import { attendanceRouter } from './server/routes/attendance';
import { subscriptionRouter } from './server/routes/subscriptions';
import { paymentRouter } from './server/routes/payments';
import { supportRouter } from './server/routes/support';
import { adminRouter } from './server/routes/admin';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/organizations', organizationRouter);
  app.use('/api/employees', employeeRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/subscriptions', subscriptionRouter);
  app.use('/api/payments', paymentRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/admin', adminRouter);

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'PointAfrik SaaS',
      version: '1.0.0',
      time: new Date().toISOString(),
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PointAfrik SaaS Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
