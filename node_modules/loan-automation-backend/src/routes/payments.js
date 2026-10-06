import express from 'express';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

router.get('/schedule/:applicationId', authMiddleware, (req, res) => {
  const schedule = db.prepare('SELECT * FROM repayment_schedules WHERE application_id = ? ORDER BY emi_number').all(Number(req.params.applicationId));
  return res.status(200).json(schedule);
});

router.post('/record', authMiddleware, requireRole('customer'), (req, res) => {
  const { applicationId, scheduleId, amount, reference } = req.body;

  if (!applicationId || !scheduleId || !amount) {
    return res.status(400).json({ message: 'Application ID, schedule ID, and amount are required.' });
  }

  const existing = db.prepare('SELECT * FROM payments WHERE repayment_schedule_id = ?').get(Number(scheduleId));
  if (existing) {
    return res.status(409).json({ message: 'Duplicate payment record detected.' });
  }

  const paymentRef = reference || `PAY-${Date.now()}`;
  const payment = db.prepare(`
    INSERT INTO payments (application_id, repayment_schedule_id, amount, payment_reference, payment_status, paid_at)
    VALUES (?, ?, ?, ?, 'PAID', ?)
  `).run(Number(applicationId), Number(scheduleId), Number(amount), paymentRef, new Date().toISOString());

  db.prepare(`
    UPDATE repayment_schedules SET payment_status = 'PAID', paid_at = ? WHERE id = ?
  `).run(new Date().toISOString(), Number(scheduleId));

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, 'EMI payment confirmed', `Payment of ₹${amount} has been successfully recorded.`, 'success');

  return res.status(201).json({ message: 'EMI payment recorded successfully.', paymentId: payment.lastInsertRowid });
});

export default router;
