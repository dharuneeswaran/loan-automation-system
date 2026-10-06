import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
    }
    return cb(null, true);
  }
});

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  let whereClause = '';
  let params = [];

  if (user.role === 'customer') {
    const customer = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(user.id);
    whereClause = 'WHERE a.customer_id = ?';
    params = [customer.id];
  }

  const applications = db.prepare(`
    SELECT a.id AS application_id, a.application_id, a.status
    FROM loan_applications a
    ${whereClause}
    ORDER BY a.created_at DESC
  `).all(...params);

  const docs = [];
  applications.forEach((application) => {
    const records = db.prepare('SELECT * FROM documents WHERE application_id = ?').all(application.application_id);
    if (records.length) docs.push(...records);
  });

  return res.status(200).json(docs);
});

router.post('/upload', authMiddleware, requireRole('customer'), upload.single('file'), (req, res) => {
  const { applicationId, documentType } = req.body;
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a valid file.' });
  }

  if (!applicationId || !documentType) {
    return res.status(400).json({ message: 'Application ID and document type are required.' });
  }

  const application = db.prepare('SELECT * FROM loan_applications WHERE id = ?').get(Number(applicationId));
  if (!application) {
    return res.status(404).json({ message: 'Application not found.' });
  }

  const entry = db.prepare(`
    INSERT INTO documents (application_id, document_type, file_name, file_path, file_size, mime_type, status)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
  `).run(
    application.id,
    documentType,
    req.file.originalname,
    req.file.path,
    req.file.size,
    req.file.mimetype
  );

  db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`).run(
    req.user.id,
    'Document uploaded',
    `${documentType} document was uploaded successfully and is pending review.`,
    'info'
  );

  return res.status(201).json({ message: 'Document uploaded successfully.', document: { id: entry.lastInsertRowid, documentType } });
});

router.post('/:id/verify', authMiddleware, requireRole('loan_officer', 'branch_manager', 'admin'), (req, res) => {
  const { status, remarks } = req.body;
  const documentId = Number(req.params.id);
  const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
  if (!document) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  if (!status || !['VERIFIED', 'REJECTED', 'RESUBMISSION_REQUIRED'].includes(status)) {
    return res.status(400).json({ message: 'Document verification status is invalid.' });
  }

  db.prepare('UPDATE documents SET status = ?, remarks = ? WHERE id = ?').run(status, remarks || '', documentId);

  const applicant = db.prepare(`
    SELECT u.id, u.name
    FROM loan_applications a
    JOIN customers c ON c.id = a.customer_id
    JOIN users u ON u.id = c.user_id
    WHERE a.id = ?
  `).get(document.application_id);

  if (applicant) {
    db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`).run(
      applicant.id,
      'Document review updated',
      `Your ${document.document_type} document was marked as ${status}.`,
      'info'
    );
  }

  return res.status(200).json({ message: 'Document review recorded.' });
});

export default router;
