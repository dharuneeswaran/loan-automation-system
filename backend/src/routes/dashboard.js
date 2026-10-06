import express from 'express';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

function getCustomerSummary(userId) {
  const applications = db.prepare('SELECT * FROM loan_applications WHERE customer_id = ?').all(userId);
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);

  const totalApplications = applications.length;
  const pendingApplications = applications.filter((application) => ['SUBMITTED', 'UNDER_VERIFICATION', 'DOCUMENT_VERIFICATION', 'ELIGIBILITY_ASSESSMENT', 'CREDIT_VERIFICATION', 'UNDER_REVIEW'].includes(application.status)).length;
  const approvedLoans = applications.filter((application) => ['APPROVED', 'DISBURSED', 'ACTIVE', 'CLOSED'].includes(application.status)).length;
  const rejectedLoans = applications.filter((application) => application.status === 'REJECTED').length;
  const activeLoans = applications.filter((application) => application.status === 'ACTIVE').length;
  const outstanding = db.prepare('SELECT SUM(requested_amount) AS total FROM loan_applications WHERE customer_id = ? AND status IN (\'APPROVED\', \'DISBURSED\', \'ACTIVE\')').get(userId)?.total || 0;

  return {
    totalApplications,
    pendingApplications,
    approvedLoans,
    rejectedLoans,
    activeLoans,
    outstanding,
    notifications,
    applications
  };
}

function getAdminSummary() {
  const totalCustomers = db.prepare('SELECT COUNT(*) AS count FROM users WHERE role = \'customer\'').get().count;
  const totalApplications = db.prepare('SELECT COUNT(*) AS count FROM loan_applications').get().count;
  const pendingApplications = db.prepare('SELECT COUNT(*) AS count FROM loan_applications WHERE status NOT IN (\'APPROVED\', \'REJECTED\', \'DISBURSED\', \'ACTIVE\', \'CLOSED\')').get().count;
  const approvedLoans = db.prepare('SELECT COUNT(*) AS count FROM loan_applications WHERE status IN (\'APPROVED\', \'DISBURSED\', \'ACTIVE\', \'CLOSED\')').get().count;
  const rejectedLoans = db.prepare('SELECT COUNT(*) AS count FROM loan_applications WHERE status = \'REJECTED\'').get().count;
  const disbursedLoans = db.prepare('SELECT COUNT(*) AS count FROM loan_disbursements').get().count;
  const activeLoans = db.prepare('SELECT COUNT(*) AS count FROM loan_applications WHERE status = \'ACTIVE\'').get().count;
  const totalLoanAmount = db.prepare('SELECT COALESCE(SUM(requested_amount), 0) AS total FROM loan_applications').get().total;
  const outstandingAmount = db.prepare('SELECT COALESCE(SUM(requested_amount), 0) AS total FROM loan_applications WHERE status IN (\'APPROVED\', \'DISBURSED\', \'ACTIVE\')').get().total;
  const emiCollections = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_status = \'PAID\'').get().total;

  return {
    totalCustomers,
    totalApplications,
    pendingApplications,
    approvedLoans,
    rejectedLoans,
    disbursedLoans,
    activeLoans,
    totalLoanAmount,
    outstandingAmount,
    emiCollections
  };
}

router.get('/', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user.role === 'customer') {
    const customer = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(user.id);
    const summary = getCustomerSummary(customer?.id || 0);
    return res.status(200).json({ role: user.role, user, summary });
  }

  if (user.role === 'loan_officer') {
    const applications = db.prepare('SELECT * FROM loan_applications WHERE assigned_officer_id = ? ORDER BY created_at DESC').all(user.id);
    return res.status(200).json({ role: user.role, user, applications });
  }

  if (user.role === 'branch_manager') {
    const applications = db.prepare('SELECT * FROM loan_applications WHERE branch_id IS NOT NULL ORDER BY created_at DESC').all();
    return res.status(200).json({ role: user.role, user, applications, summary: getAdminSummary() });
  }

  return res.status(200).json({ role: user.role, user, summary: getAdminSummary() });
});

router.get('/stats', authMiddleware, requireRole('admin', 'branch_manager'), (req, res) => {
  return res.status(200).json(getAdminSummary());
});

export default router;
