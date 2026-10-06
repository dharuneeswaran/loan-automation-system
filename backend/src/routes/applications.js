import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { calculateEligibility, generateRepaymentSchedule, mockCreditCheck, makeNotification } from '../mockServices.js';

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (user.role === 'customer') {
    const customer = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(user.id);
    const applications = db.prepare(`
      SELECT a.*, lt.name AS loan_type_name
      FROM loan_applications a
      LEFT JOIN loan_types lt ON lt.id = a.loan_type_id
      WHERE a.customer_id = ?
      ORDER BY a.created_at DESC
    `).all(customer.id);
    return res.status(200).json(applications);
  }

  if (['loan_officer', 'branch_manager', 'admin'].includes(user.role)) {
    const applications = db.prepare(`
      SELECT a.*, c.user_id, u.name AS customer_name, lt.name AS loan_type_name
      FROM loan_applications a
      LEFT JOIN customers c ON c.id = a.customer_id
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN loan_types lt ON lt.id = a.loan_type_id
      ORDER BY a.created_at DESC
    `).all();
    return res.status(200).json(applications);
  }

  return res.status(403).json({ message: 'Unauthorized access.' });
});

router.post('/', authMiddleware, requireRole('customer'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const customer = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(user.id);
  if (!customer) {
    return res.status(400).json({ message: 'Customer profile not found.' });
  }

  const {
    loanTypeId,
    requestedAmount,
    tenureMonths,
    purpose,
    employmentType,
    employer,
    monthlyIncome,
    workExperience,
    existingLoans,
    existingEmi,
    monthlyExpenses,
    bankAccount
  } = req.body;

  if (!loanTypeId || !requestedAmount || !tenureMonths || !purpose || !employmentType) {
    return res.status(400).json({ message: 'Please complete all required application details.' });
  }

  const loanType = db.prepare('SELECT * FROM loan_types WHERE id = ?').get(Number(loanTypeId));
  if (!loanType) {
    return res.status(404).json({ message: 'Loan type not found.' });
  }

  const annualIncome = Number(monthlyIncome) * 12;
  const debtToIncomeRatio = ((Number(existingEmi || 0) + Number(existingLoans || 0)) / Math.max(Number(monthlyIncome), 1));
  const eligibility = calculateEligibility({
    loanType,
    requestedAmount: Number(requestedAmount),
    monthlyIncome: Number(monthlyIncome),
    annualIncome,
    creditScore: 710,
    existingLiabilities: Number(existingLoans || 0),
    existingEmi: Number(existingEmi || 0),
    employmentType,
    age: 35,
    debtToIncomeRatio,
    tenure: Number(tenureMonths)
  });

  const applicationId = `LAS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const result = db.prepare(`
    INSERT INTO loan_applications (
      customer_id, loan_type_id, application_id, requested_amount, tenure_months, purpose, employment_type, employer, monthly_income, work_experience,
      existing_loans, existing_emi, monthly_expenses, bank_account, status, branch_id, assigned_officer_id, approval_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', 1, 1, 'PENDING')
  `).run(
    customer.id,
    Number(loanTypeId),
    applicationId,
    Number(requestedAmount),
    Number(tenureMonths),
    purpose,
    employmentType,
    employer,
    Number(monthlyIncome),
    Number(workExperience || 0),
    Number(existingLoans || 0),
    Number(existingEmi || 0),
    Number(monthlyExpenses || 0),
    bankAccount || customer.bank_account,
  );

  const applicationRow = db.prepare('SELECT * FROM loan_applications WHERE id = ?').get(result.lastInsertRowid);

  db.prepare(`
    INSERT INTO eligibility_assessments (application_id, result, score, max_eligible_amount, estimated_interest_rate, recommended_tenure, estimated_emi, debt_to_income_ratio, annual_income, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    applicationRow.id,
    eligibility.result,
    eligibility.score,
    eligibility.maxEligibleAmount,
    eligibility.estimatedInterestRate,
    eligibility.recommendedTenure,
    eligibility.estimatedEmi,
    eligibility.debtToIncomeRatio,
    annualIncome,
    eligibility.remarks
  );

  const credit = mockCreditCheck();
  db.prepare(`
    INSERT INTO credit_verifications (application_id, credit_score, status, verification_date, risk_category, summary)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    applicationRow.id,
    credit.creditScore,
    credit.status,
    new Date().toISOString(),
    credit.riskCategory,
    credit.summary
  );

  const schedule = generateRepaymentSchedule({
    principal: Number(requestedAmount),
    annualRate: loanType.interest_rate,
    tenureMonths: Number(tenureMonths)
  });

  schedule.slice(0, 6).forEach((entry) => {
    db.prepare(`
      INSERT INTO repayment_schedules (application_id, emi_number, due_date, principal_component, interest_component, emi_amount, remaining_balance, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      applicationRow.id,
      entry.emiNumber,
      entry.dueDate,
      entry.principalComponent,
      entry.interestComponent,
      entry.emiAmount,
      entry.remainingBalance,
      'UPCOMING'
    );
  });

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, ?, ?, ?)
  `).run(
    user.id,
    'Application submitted',
    `Your ${loanType.name} application (${applicationId}) has been submitted and moved to verification.`,
    'loan'
  );

  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.id, 'APPLICATION_SUBMITTED', 'loan_application', applicationRow.id, JSON.stringify({ applicationId }));

  return res.status(201).json({
    message: 'Loan application submitted successfully.',
    application: applicationRow,
    eligibility
  });
});

router.get('/:id', authMiddleware, (req, res) => {
  const application = db.prepare(`
    SELECT a.*, lt.name AS loan_type_name, u.name AS customer_name
    FROM loan_applications a
    LEFT JOIN loan_types lt ON lt.id = a.loan_type_id
    LEFT JOIN customers c ON c.id = a.customer_id
    LEFT JOIN users u ON u.id = c.user_id
    WHERE a.id = ?
  `).get(Number(req.params.id));

  if (!application) {
    return res.status(404).json({ message: 'Application not found.' });
  }

  const documents = db.prepare('SELECT * FROM documents WHERE application_id = ?').all(application.id);
  const eligibility = db.prepare('SELECT * FROM eligibility_assessments WHERE application_id = ? ORDER BY created_at DESC LIMIT 1').get(application.id);
  const credit = db.prepare('SELECT * FROM credit_verifications WHERE application_id = ? ORDER BY created_at DESC LIMIT 1').get(application.id);
  const approval = db.prepare('SELECT * FROM loan_approvals WHERE application_id = ? ORDER BY created_at DESC LIMIT 1').get(application.id);

  return res.status(200).json({ application, documents, eligibility, credit, approval });
});

router.post('/:id/review', authMiddleware, requireRole('loan_officer', 'branch_manager', 'admin'), (req, res) => {
  const { decision, remarks, rejectionReason } = req.body;
  const applicationId = Number(req.params.id);

  const application = db.prepare('SELECT * FROM loan_applications WHERE id = ?').get(applicationId);
  if (!application) {
    return res.status(404).json({ message: 'Application not found.' });
  }

  if (!decision || !['APPROVE', 'REJECT', 'REQUEST_DOCUMENTS'].includes(decision.toUpperCase())) {
    return res.status(400).json({ message: 'A valid action is required.' });
  }

  const nextStatusMap = {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    REQUEST_DOCUMENTS: 'DOCUMENT_RESUBMISSION'
  };

  const finalStatus = nextStatusMap[decision.toUpperCase()];

  if (decision.toUpperCase() === 'REJECT' && !rejectionReason) {
    return res.status(400).json({ message: 'Rejection requires a reason.' });
  }

  db.prepare(`
    UPDATE loan_applications SET status = ?, approval_status = ?, remarks = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(finalStatus, decision.toUpperCase(), remarks || '', rejectionReason || '', applicationId);

  db.prepare(`
    INSERT INTO loan_approvals (application_id, approver_id, decision, remarks, rejection_reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(applicationId, req.user.id, decision.toUpperCase(), remarks || '', rejectionReason || '');

  const customerUser = db.prepare(`
    SELECT u.id, u.name
    FROM customers c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(application.customer_id);

  if (customerUser) {
    const notificationMessage = decision.toUpperCase() === 'APPROVE'
      ? 'Your application has been approved and moved to the disbursement workflow.'
      : decision.toUpperCase() === 'REJECT'
        ? `Your application was rejected. Reason: ${rejectionReason || 'No reason provided.'}`
        : 'Additional documents are required for your application.';

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(customerUser.id, 'Application status updated', notificationMessage, 'loan');
  }

  return res.status(200).json({ message: 'Application review recorded successfully.' });
});

export default router;
