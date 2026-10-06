import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';
import { seedDatabase } from './seed.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import applicationsRoutes from './routes/applications.js';
import documentsRoutes from './routes/documents.js';
import adminRoutes from './routes/admin.js';
import paymentsRoutes from './routes/payments.js';
import notificationsRoutes from './routes/notifications.js';
import eligibilityRoutes from './routes/eligibility.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const frontendDist = path.resolve(projectRoot, 'frontend', 'dist');

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(projectRoot, 'backend', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/eligibility', eligibilityRoutes);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Loan Automation System API is running.' });
});

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const initialize = () => {
  try {
    seedDatabase();
    db.prepare('INSERT OR IGNORE INTO audit_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)').run(1, 'SYSTEM_START', 'system', JSON.stringify({ event: 'Application started' }));
  } catch (error) {
    console.error('Seed initialization failed:', error.message);
  }
};

initialize();

app.listen(port, () => {
  console.log(`Loan Automation System backend running on http://localhost:${port}`);
});
