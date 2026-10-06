import bcrypt from 'bcryptjs';
import db from './db.js';

export function seedDatabase() {
  const defaultBranch = db.prepare(`INSERT OR IGNORE INTO branches (id, name, location) VALUES (1, 'Head Office', 'Bengaluru')`).run();
  if (defaultBranch.changes) {
    db.prepare(`INSERT OR IGNORE INTO branches (id, name, location) VALUES (2, 'Koramangala Branch', 'Koramangala')`).run();
    db.prepare(`INSERT OR IGNORE INTO branches (id, name, location) VALUES (3, 'Whitefield Branch', 'Whitefield')`).run();
  }

  const loanTypes = [
    ['Personal Loan', 'PERSONAL', 50000, 500000, 9.5, 12, 60, 1.5, 'Stable employment and monthly income threshold', 'Aadhaar, PAN, salary slips, address proof'],
    ['Home Loan', 'HOME', 300000, 5000000, 7.2, 60, 240, 0.75, 'Property documents and income eligibility', 'Aadhaar, PAN, income proof, property papers'],
    ['Education Loan', 'EDUCATION', 75000, 1500000, 8.1, 12, 120, 1.0, 'Student enrollment and co-borrower details', 'Aadhaar, PAN, admission letter, fee receipt'],
    ['Vehicle Loan', 'VEHICLE', 50000, 1500000, 8.8, 12, 84, 1.25, 'Vehicle valuation and income proof', 'Aadhaar, PAN, bank statement, vehicle quotation'],
    ['Business Loan', 'BUSINESS', 100000, 3000000, 10.5, 12, 84, 1.8, 'Business turnover and continuity', 'Aadhaar, PAN, GST returns, business proof'],
    ['Gold Loan', 'GOLD', 20000, 2000000, 8.6, 3, 36, 0.5, 'Gold valuation and ownership', 'Aadhaar, PAN, gold valuation report'],
    ['Agriculture Loan', 'AGRICULTURE', 50000, 2000000, 8.9, 12, 72, 1.1, 'Farming land documents and revenue proof', 'Aadhaar, PAN, land records, crop proof']
  ];

  for (const loanType of loanTypes) {
    db.prepare(`
      INSERT OR IGNORE INTO loan_types (name, code, min_amount, max_amount, interest_rate, min_tenure, max_tenure, processing_fee, criteria, required_documents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...loanType);
  }

  const userSeed = [
    { name: 'Admin User', email: 'admin@las.com', phone: '9000000001', role: 'admin', password: 'Admin@123' },
    { name: 'Branch Manager', email: 'manager@las.com', phone: '9000000002', role: 'branch_manager', password: 'Manager@123' },
    { name: 'Asha Verma', email: 'officer1@las.com', phone: '9000000003', role: 'loan_officer', password: 'Officer@123' },
    { name: 'Rohit Nair', email: 'officer2@las.com', phone: '9000000004', role: 'loan_officer', password: 'Officer@123' },
    { name: 'Sneha Rao', email: 'officer3@las.com', phone: '9000000005', role: 'loan_officer', password: 'Officer@123' },
    { name: 'Ananya Patel', email: 'customer1@las.com', phone: '9000000010', role: 'customer', password: 'Customer@123' },
    { name: 'Vikram Singh', email: 'customer2@las.com', phone: '9000000011', role: 'customer', password: 'Customer@123' },
    { name: 'Meera Kumar', email: 'customer3@las.com', phone: '9000000012', role: 'customer', password: 'Customer@123' },
    { name: 'Rahul Iyer', email: 'customer4@las.com', phone: '9000000013', role: 'customer', password: 'Customer@123' },
    { name: 'Nisha Shah', email: 'customer5@las.com', phone: '9000000014', role: 'customer', password: 'Customer@123' }
  ];

  for (const user of userSeed) {
    const passwordHash = bcrypt.hashSync(user.password, 10);
    db.prepare(`
      INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, otp_verified, is_active)
      VALUES (?, ?, ?, ?, ?, 1, 1)
    `).run(user.name, user.email, user.phone, passwordHash, user.role);
  }

  const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@las.com');
  const managerUser = db.prepare('SELECT * FROM users WHERE email = ?').get('manager@las.com');
  const officer1 = db.prepare('SELECT * FROM users WHERE email = ?').get('officer1@las.com');
  const officer2 = db.prepare('SELECT * FROM users WHERE email = ?').get('officer2@las.com');
  const officer3 = db.prepare('SELECT * FROM users WHERE email = ?').get('officer3@las.com');

  const customerUsers = [
    db.prepare('SELECT * FROM users WHERE email = ?').get('customer1@las.com'),
    db.prepare('SELECT * FROM users WHERE email = ?').get('customer2@las.com'),
    db.prepare('SELECT * FROM users WHERE email = ?').get('customer3@las.com'),
    db.prepare('SELECT * FROM users WHERE email = ?').get('customer4@las.com'),
    db.prepare('SELECT * FROM users WHERE email = ?').get('customer5@las.com')
  ];

  const customerProfiles = [
    ['1992-05-11', '123456789012', 'ABCDE1234F', '1st Street, Bengaluru', 'Salaried', 'Infosys', 85000, 'SBIN0001122'],
    ['1988-07-09', '234567890123', 'FGHIJ5678K', '2nd Floor, Pune', 'Self Employed', 'Nexa Traders', 120000, 'HDFC0002233'],
    ['1995-10-15', '345678901234', 'LMNOP9012L', '3rd Lane, Hyderabad', 'Salaried', 'Capgemini', 93000, 'ICIC0003344'],
    ['1990-02-22', '456789012345', 'QRSTU2345M', '4th Block, Chennai', 'Professional', 'Freelance Studio', 110000, 'AXIS0004455'],
    ['1985-08-17', '567890123456', 'VWXYZ6789N', '5th Avenue, Kolkata', 'Salaried', 'State Bank', 140000, 'YESB0005566']
  ];

  customerUsers.forEach((customer, index) => {
    const profile = customerProfiles[index];
    db.prepare(`
      INSERT OR IGNORE INTO customers (user_id, dob, aadhaar, pan, address, employment_type, employer_name, monthly_income, bank_account)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer.id, ...profile);
  });

  const loanTypeRows = db.prepare('SELECT * FROM loan_types ORDER BY id').all();
  const firstLoanTypeId = loanTypeRows[0]?.id;
  const secondLoanTypeId = loanTypeRows[1]?.id;
  const thirdLoanTypeId = loanTypeRows[2]?.id;

  const applicationIds = [
    'LAS-2025-1001',
    'LAS-2025-1002',
    'LAS-2025-1003'
  ];

  const applications = [
    { customerId: customerUsers[0].id, loanTypeId: firstLoanTypeId, applicationId: 'LAS-2025-1001', value: 450000, tenure: 36, purpose: 'Home renovation', employment: 'Salaried', employer: 'Infosys', income: 85000, work: 6, existingLoans: 100000, existingEmi: 12000, expenses: 25000, account:'SBIN0001122', status: 'UNDER_VERIFICATION', officer: officer1.id, branch: 1 },
    { customerId: customerUsers[1].id, loanTypeId: secondLoanTypeId, applicationId: 'LAS-2025-1002', value: 1200000, tenure: 120, purpose: 'Property purchase', employment: 'Self Employed', employer: 'Nexa Traders', income: 120000, work: 8, existingLoans: 180000, existingEmi: 18000, expenses: 32000, account:'HDFC0002233', status: 'APPROVED', officer: officer2.id, branch: 2 },
    { customerId: customerUsers[2].id, loanTypeId: thirdLoanTypeId, applicationId: 'LAS-2025-1003', value: 600000, tenure: 48, purpose: 'Education financing', employment: 'Salaried', employer: 'Capgemini', income: 93000, work: 4, existingLoans: 35000, existingEmi: 9000, expenses: 24000, account:'ICIC0003344', status: 'DISBURSED', officer: officer3.id, branch: 1 }
  ];

  applications.forEach((app) => {
    db.prepare(`
      INSERT OR IGNORE INTO loan_applications (
        customer_id, loan_type_id, application_id, requested_amount, tenure_months, purpose, employment_type, employer, monthly_income, work_experience, existing_loans, existing_emi, monthly_expenses, bank_account, status, assigned_officer_id, branch_id, approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      app.customerId,
      app.loanTypeId,
      app.applicationId,
      app.value,
      app.tenure,
      app.purpose,
      app.employment,
      app.employer,
      app.income,
      app.work,
      app.existingLoans,
      app.existingEmi,
      app.expenses,
      app.account,
      app.status,
      app.officer,
      app.branch,
      app.status === 'APPROVED' || app.status === 'DISBURSED' ? 'APPROVED' : 'PENDING'
    );
  });

  const loanApplicationRows = db.prepare('SELECT * FROM loan_applications ORDER BY id').all();
  loanApplicationRows.forEach((application, index) => {
    db.prepare(`
      INSERT OR IGNORE INTO eligibility_assessments (application_id, result, score, max_eligible_amount, estimated_interest_rate, recommended_tenure, estimated_emi, debt_to_income_ratio, annual_income, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      application.id,
      index === 1 ? 'Eligible' : 'Partially Eligible',
      index === 1 ? 89 : 78,
      application.requested_amount * 0.82,
      8.5,
      application.tenure_months,
      Math.round(application.requested_amount / application.tenure_months / 12),
      0.42,
      application.monthly_income * 12,
      'Automated/AI recommendation is only advisory. Final approval remains with authorized officials.'
    );

    db.prepare(`
      INSERT OR IGNORE INTO credit_verifications (application_id, credit_score, status, verification_date, risk_category, summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      application.id,
      index === 1 ? 780 : 710,
      'VERIFIED',
      new Date().toISOString(),
      index === 1 ? 'Low Risk' : 'Medium Risk',
      'Mock credit bureau verification completed successfully.'
    );

    if (application.status === 'APPROVED' || application.status === 'DISBURSED') {
      db.prepare(`
        INSERT OR IGNORE INTO loan_approvals (application_id, approver_id, decision, remarks)
        VALUES (?, ?, ?, ?)
      `).run(application.id, officer2.id, 'APPROVED', 'Verified documentation and financial profile met internal policy thresholds.');
    }
  });

  const sampleNotifications = [
    { userId: customerUsers[0].id, title: 'Registration successful', message: 'Your account has been created successfully.', type: 'info' },
    { userId: customerUsers[0].id, title: 'Application submitted', message: 'Your personal loan application has been submitted for verification.', type: 'loan' },
    { userId: customerUsers[1].id, title: 'Loan approved', message: 'Your home loan application has been approved.', type: 'success' },
    { userId: adminUser.id, title: 'System summary', message: 'Branch performance report is ready for review.', type: 'admin' },
    { userId: managerUser.id, title: 'High value review', message: 'A high-value application requires branch manager review.', type: 'warning' }
  ];

  sampleNotifications.forEach((notification) => {
    db.prepare(`
      INSERT OR IGNORE INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(notification.userId, notification.title, notification.message, notification.type);
  });

  const existingRepayments = db.prepare('SELECT * FROM repayment_schedules').all();
  if (existingRepayments.length === 0) {
    loanApplicationRows.forEach((application, index) => {
      const schedule = Array.from({ length: 6 }, (_, i) => ({
        number: i + 1,
        dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        emi: 18800,
        principal: 12000,
        interest: 6800,
        balance: application.requested_amount - (i + 1) * 12000
      }));

      schedule.forEach((item) => {
        db.prepare(`
          INSERT OR IGNORE INTO repayment_schedules (application_id, emi_number, due_date, principal_component, interest_component, emi_amount, remaining_balance, payment_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          application.id,
          item.number,
          item.dueDate,
          item.principal,
          item.interest,
          item.emi,
          Math.max(0, item.balance),
          index === 2 && item.number === 1 ? 'PAID' : 'UPCOMING'
        );
      });
    });
  }
}

export function getDefaultPasswords() {
  return {
    admin: 'Admin@123',
    manager: 'Manager@123',
    officer: 'Officer@123',
    customer: 'Customer@123'
  };
}
