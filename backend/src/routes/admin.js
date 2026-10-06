import express from 'express';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

router.get('/stats', authMiddleware, requireRole('admin', 'branch_manager'), (req, res) => {
  const stats = {
    totalCustomers: db.prepare('SELECT COUNT(*) AS count FROM users WHERE role = \'customer\'').get().count,
    totalLoanApplications: db.prepare('SELECT COUNT(*) AS count FROM loan_applications').get().count,
    pendingApplications: db.prepare('SELECT COUNT(*) AS count FROM loan_applications WHERE status NOT IN (\'APPROVED\', \'REJECTED\', \'DISBURSED\', \'ACTIVE\', \'CLOSED\')').get().count,
    approvedLoans: db.prepare('SELECT COUNT(*) AS count FROM loan_applications WHERE status IN (\'APPROVED\', \'DISBURSED\', \'ACTIVE\', \'CLOSED\')').get().count,
    rejectedLoans: db.prepare('SELECT COUNT(*) AS count FROM loan_applications WHERE status = \'REJECTED\'').get().count,
    disbursedLoans: db.prepare('SELECT COUNT(*) AS count FROM loan_disbursements').get().count,
    activeLoans: db.prepare('SELECT COUNT(*) AS count FROM loan_applications WHERE status = \'ACTIVE\'').get().count,
    totalLoanAmount: db.prepare('SELECT COALESCE(SUM(requested_amount), 0) AS total FROM loan_applications').get().total,
    outstandingAmount: db.prepare('SELECT COALESCE(SUM(requested_amount), 0) AS total FROM loan_applications WHERE status IN (\'APPROVED\', \'DISBURSED\', \'ACTIVE\')').get().total,
    emiCollections: db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_status = \'PAID\'').get().total
  };

  return res.status(200).json(stats);
});

router.get('/users', authMiddleware, requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  return res.status(200).json(users);
});

router.get('/loan-types', authMiddleware, requireRole('admin', 'branch_manager', 'loan_officer'), (req, res) => {
  const loanTypes = db.prepare('SELECT * FROM loan_types ORDER BY id').all();
  return res.status(200).json(loanTypes);
});

export default router;
