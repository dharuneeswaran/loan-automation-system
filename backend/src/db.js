import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'loan_system.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const SQL = await initSqlJs({
  locateFile: (file) => path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file)
});

const existingDb = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
const db = existingDb ? new SQL.Database(existingDb) : new SQL.Database();

function normalizeParams(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
    return Object.values(args[0]);
  }
  return args;
}

function persist() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function prepare(sql) {
  return {
    run: (...args) => {
      const values = normalizeParams(args);
      const statement = db.prepare(sql);
      if (values.length) {
        statement.bind(values);
      }
      while (statement.step()) {}
      const changes = db.getRowsModified();
      const lastInsertRowid = db.exec('SELECT last_insert_rowid() AS id;')[0]?.values?.[0]?.[0] || 0;
      statement.reset();
      persist();
      return { changes, lastInsertRowid };
    },
    get: (...args) => {
      const values = normalizeParams(args);
      const statement = db.prepare(sql);
      if (values.length) statement.bind(values);
      const result = statement.step() ? statement.getAsObject() : undefined;
      statement.reset();
      return result;
    },
    all: (...args) => {
      const values = normalizeParams(args);
      const statement = db.prepare(sql);
      if (values.length) statement.bind(values);
      const rows = [];
      while (statement.step()) {
        rows.push(statement.getAsObject());
      }
      statement.reset();
      return rows;
    }
  };
}

function exec(sql) {
  db.exec(sql);
  persist();
}

const schema = `
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','loan_officer','branch_manager','admin')),
  otp_code TEXT,
  otp_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  dob TEXT,
  aadhaar TEXT,
  pan TEXT,
  address TEXT,
  employment_type TEXT,
  employer_name TEXT,
  monthly_income REAL,
  bank_account TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS loan_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  min_amount REAL NOT NULL,
  max_amount REAL NOT NULL,
  interest_rate REAL NOT NULL,
  min_tenure INTEGER NOT NULL,
  max_tenure INTEGER NOT NULL,
  processing_fee REAL NOT NULL,
  criteria TEXT,
  required_documents TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  loan_type_id INTEGER NOT NULL,
  application_id TEXT UNIQUE NOT NULL,
  requested_amount REAL NOT NULL,
  tenure_months INTEGER NOT NULL,
  purpose TEXT,
  employment_type TEXT,
  employer TEXT,
  monthly_income REAL,
  work_experience REAL,
  existing_loans REAL,
  existing_emi REAL,
  monthly_expenses REAL,
  bank_account TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  branch_id INTEGER,
  assigned_officer_id INTEGER,
  approval_status TEXT,
  remarks TEXT,
  rejection_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id),
  FOREIGN KEY(loan_type_id) REFERENCES loan_types(id),
  FOREIGN KEY(branch_id) REFERENCES branches(id),
  FOREIGN KEY(assigned_officer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','REJECTED','RESUBMISSION_REQUIRED')),
  remarks TEXT,
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES loan_applications(id)
);

CREATE TABLE IF NOT EXISTS eligibility_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  result TEXT NOT NULL,
  score INTEGER,
  max_eligible_amount REAL,
  estimated_interest_rate REAL,
  recommended_tenure INTEGER,
  estimated_emi REAL,
  debt_to_income_ratio REAL,
  annual_income REAL,
  remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES loan_applications(id)
);

CREATE TABLE IF NOT EXISTS credit_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  credit_score INTEGER,
  status TEXT NOT NULL DEFAULT 'CREDIT_VERIFICATION_PENDING',
  verification_date TEXT,
  risk_category TEXT,
  summary TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES loan_applications(id)
);

CREATE TABLE IF NOT EXISTS loan_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  approver_id INTEGER,
  decision TEXT,
  remarks TEXT,
  rejection_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES loan_applications(id),
  FOREIGN KEY(approver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS loan_disbursements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  disbursed_at TEXT,
  bank_account_verified INTEGER DEFAULT 0,
  agreement_path TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES loan_applications(id)
);

CREATE TABLE IF NOT EXISTS repayment_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  emi_number INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  principal_component REAL,
  interest_component REAL,
  emi_amount REAL,
  remaining_balance REAL,
  payment_status TEXT DEFAULT 'UPCOMING' CHECK(payment_status IN ('UPCOMING','PAID','OVERDUE','FAILED')),
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_id, emi_number),
  FOREIGN KEY(application_id) REFERENCES loan_applications(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  repayment_schedule_id INTEGER,
  amount REAL NOT NULL,
  payment_reference TEXT UNIQUE,
  payment_status TEXT DEFAULT 'PAID' CHECK(payment_status IN ('PAID','FAILED','OVERDUE','UPCOMING')),
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES loan_applications(id),
  FOREIGN KEY(repayment_schedule_id) REFERENCES repayment_schedules(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_loan_applications_customer ON loan_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`;

exec(schema);

const dbApi = { prepare, exec };
export default dbApi;
