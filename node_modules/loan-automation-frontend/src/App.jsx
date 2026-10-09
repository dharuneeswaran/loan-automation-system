import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, Building2, CreditCard, DollarSign, FileText, LayoutDashboard, LogOut, Bell, ShieldCheck, UserCircle2, Calculator, CheckCircle2, WalletCards, ArrowRight, Search, Download, AlertCircle } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api, { setAuthToken } from './api';

const navigationByRole = {
  customer: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/profile', label: 'Profile', icon: UserCircle2 },
    { to: '/apply-loan', label: 'Apply Loan', icon: FileText },
    { to: '/applications', label: 'My Applications', icon: BriefcaseBusiness },
    { to: '/documents', label: 'Documents', icon: FileText },
    { to: '/eligibility', label: 'Eligibility', icon: ShieldCheck },
    { to: '/emi-calculator', label: 'EMI Calculator', icon: Calculator },
    { to: '/repayment', label: 'Repayment', icon: CreditCard },
    { to: '/notifications', label: 'Notifications', icon: Bell }
  ],
  loan_officer: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/applications', label: 'Applications', icon: BriefcaseBusiness },
    { to: '/documents', label: 'Documents', icon: FileText },
    { to: '/reviews', label: 'Review Queue', icon: ShieldCheck }
  ],
  branch_manager: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/applications', label: 'Branch Applications', icon: BriefcaseBusiness },
    { to: '/reviews', label: 'High Value', icon: ShieldCheck },
    { to: '/reports', label: 'Reports', icon: BarChart3 }
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/users', label: 'Users', icon: UserCircle2 },
    { to: '/loan-types', label: 'Loan Schemes', icon: Building2 },
    { to: '/applications', label: 'Loan Applications', icon: BriefcaseBusiness },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/notifications', label: 'Notifications', icon: Bell }
  ]
};

const statusColors = {
  APPROVED: '#2e7d32',
  REJECTED: '#d32f2f',
  PENDING: '#ed6c02',
  DISBURSED: '#1976d2',
  ACTIVE: '#0288d1',
  CLOSED: '#6d4c41',
  SUBMITTED: '#ef6c00',
  UNDER_VERIFICATION: '#f9a825',
  VERIFIED: '#2e7d32',
  OVERDUE: '#ef5350',
  PAID: '#2e7d32',
 _UPCOMING: '#90caf9'
};

function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('lasAuth');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed || !parsed.token || !parsed.user) {
        localStorage.removeItem('lasAuth');
        return null;
      }
      return parsed;
    } catch (error) {
      localStorage.removeItem('lasAuth');
      return null;
    }
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (auth?.token) {
      setAuthToken(auth.token);
      localStorage.setItem('lasAuth', JSON.stringify(auth));
    } else {
      setAuthToken(null);
      localStorage.removeItem('lasAuth');
    }
  }, [auth]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const logout = () => {
    setAuth(null);
    setToast('You have been logged out.');
  };

  const handleLogin = async ({ identifier, password }) => {
    try {
      const response = await api.post('/auth/login', { identifier, password });
      if (response.data.requiresOtp) {
        setToast('OTP required. Use demo OTP 123456 to proceed.');
        return { requiresOtp: true, userId: response.data.userId, otpCode: response.data.otpCode };
      }
      setAuth({ token: response.data.token, user: response.data.user });
      setToast('Login successful.');
      return { requiresOtp: false };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed.';
      setToast(message);
      return { requiresOtp: false };
    }
  };

  const handleVerifyOtp = async ({ userId, otpCode }) => {
    try {
      const response = await api.post('/auth/verify-otp', { userId, otpCode });
      setAuth({ token: response.data.token, user: response.data.user });
      setToast(response.data.message || 'OTP verified.');
      return true;
    } catch (error) {
      setToast(error.response?.data?.message || 'OTP verification failed.');
      return false;
    }
  };

  const handleRegister = async (payload) => {
    try {
      const response = await api.post('/auth/register', payload);
      setToast(response.data.message || 'Registration created.');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Registration failed.';
      setToast(message);
      return null;
    }
  };

  return (
    <>
      <Routes>
        <Route path="/login" element={auth ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} onVerifyOtp={handleVerifyOtp} />} />
        <Route path="/register" element={auth ? <Navigate to="/dashboard" replace /> : <RegisterPage onRegister={handleRegister} />} />
        <Route path="/*" element={auth ? <AppShell auth={auth} onLogout={logout} /> : <LandingPage />} />
      </Routes>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function LandingPage() {
  return (
    <div className="landing-shell">
      <div className="landing-hero">
        <div className="logo-badge">LAS</div>
        <h1>Loan Automation System</h1>
        <p>Digitize customer onboarding, eligibility, documentation, approval, disbursement, and repayment workflows with a professional banking experience.</p>
        <div className="landing-actions">
          <Link to="/login" className="btn btn-primary">Login</Link>
          <Link to="/register" className="btn btn-secondary">Create Account</Link>
        </div>
      </div>
      <div className="landing-grid">
        <div className="info-card">
          <ShieldCheck size={22} />
          <h3>Secure Workflow</h3>
          <p>Role-based access, audit logging, and secure customer records.</p>
        </div>
        <div className="info-card">
          <BarChart3 size={22} />
          <h3>Real-time Analytics</h3>
          <p>Loan status, approval trends, repayment tracking, and branch metrics.</p>
        </div>
        <div className="info-card">
          <WalletCards size={22} />
          <h3>EMI & Credit</h3>
          <p>Eligibility engine, mock credit checks, and repayment schedule automation.</p>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin, onVerifyOtp }) {
  const [form, setForm] = useState({ identifier: 'customer1@las.com', password: 'Customer@123' });
  const [otpRequired, setOtpRequired] = useState(false);
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState('123456');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await onLogin(form);
    if (result.requiresOtp) {
      setUserId(result.userId);
      setOtpRequired(true);
    }
  };

  const handleOtpVerify = async (event) => {
    event.preventDefault();
    if (!userId) return;
    await onVerifyOtp({ userId, otpCode: otp });
    setOtpRequired(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p className="muted">Sign in to continue with the Loan Automation System.</p>
        {!otpRequired ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="Email or mobile" />
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" />
            <button className="btn btn-primary" type="submit">Login</button>
            <Link to="/register" className="small-link">Need an account? Register here</Link>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify} className="auth-form">
            <p className="muted">Demo OTP: 123456</p>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="OTP" />
            <button className="btn btn-primary" type="submit">Verify OTP</button>
          </form>
        )}
      </div>
    </div>
  );
}

function RegisterPage({ onRegister }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: 'Aditi Sharma',
    dob: '1994-08-11',
    mobile: '9000000009',
    email: 'aditi@demo.com',
    aadhaar: '123456789012',
    pan: 'ABCDE1234F',
    address: 'MG Road, Bengaluru',
    employmentType: 'Salaried',
    employerName: 'Tech Nova',
    monthlyIncome: 90000,
    bankAccount: 'SBIN0007788',
    password: 'Customer@123',
    confirmPassword: 'Customer@123'
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await onRegister(form);
    if (result && result.requiresOtp) {
      navigate('/login');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card wide">
        <h2>Create customer profile</h2>
        <form onSubmit={handleSubmit} className="auth-form grid-two">
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full name" />
          <input value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} type="date" />
          <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="Mobile number" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
          <input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} placeholder="Aadhaar" />
          <input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} placeholder="PAN" />
          <input className="full-width" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
          <input value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} placeholder="Employment type" />
          <input value={form.employerName} onChange={(e) => setForm({ ...form, employerName: e.target.value })} placeholder="Employer name" />
          <input value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} type="number" placeholder="Monthly income" />
          <input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} placeholder="Bank account" />
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" />
          <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirm password" />
          <button className="btn btn-primary full-width" type="submit">Register</button>
        </form>
      </div>
    </div>
  );
}

function AppShell({ auth, onLogout }) {
  const [activeView, setActiveView] = useState('dashboard');
  const role = auth.user.role;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">LAS</div>
          <div>
            <strong>Loan Automation</strong>
            <small>{role}</small>
          </div>
        </div>
        <nav>
          {navigationByRole[role]?.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={activeView === to.replace('/', '') ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView(to.replace('/', ''))}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <button className="logout-btn" onClick={onLogout}><LogOut size={16} /> Logout</button>
      </aside>

      <main className="main-panel">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage role={role} user={auth.user} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/apply-loan" element={<ApplyLoanPage />} />
          <Route path="/applications" element={<ApplicationsPage role={role} />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/eligibility" element={<EligibilityPage />} />
          <Route path="/emi-calculator" element={<CalculatorPage />} />
          <Route path="/repayment" element={<RepaymentPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/reviews" element={<ReviewPage role={role} />} />
          <Route path="/users" element={<AdminUsersPage />} />
          <Route path="/loan-types" element={<LoanTypesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function DashboardPage({ role, user }) {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="panel">Loading dashboard...</div>;

  const summary = stats.summary || {};
  const cards = [
    { label: 'Total applications', value: summary.totalApplications || 0 },
    { label: 'Pending', value: summary.pendingApplications || 0 },
    { label: 'Approved', value: summary.approvedLoans || 0 },
    { label: 'Rejected', value: summary.rejectedLoans || 0 },
    { label: 'Active loans', value: summary.activeLoans || 0 },
    { label: 'Outstanding', value: `₹${Number(summary.outstanding || 0).toLocaleString('en-IN')}` }
  ];

  const chartData = [
    { name: 'Jan', approved: 10, rejected: 3 },
    { name: 'Feb', approved: 18, rejected: 4 },
    { name: 'Mar', approved: 14, rejected: 5 },
    { name: 'Apr', approved: 22, rejected: 6 },
    { name: 'May', approved: 28, rejected: 7 },
    { name: 'Jun', approved: 32, rejected: 5 }
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>{role === 'customer' ? `Welcome, ${user.name}` : `${role.replace('_', ' ')} dashboard`}</h1>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map((card) => (
          <div className="panel stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="panel chart-panel">
        <h3>Monthly application performance</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="approved" fill="#1e88e5" />
            <Bar dataKey="rejected" fill="#ef5350" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="panel">
      <h2>Customer profile</h2>
      <div className="info-grid">
        <div><label>Name</label><strong>Customer Demo User</strong></div>
        <div><label>Email</label><strong>customer1@las.com</strong></div>
        <div><label>Mobile</label><strong>9000000010</strong></div>
        <div><label>Employment</label><strong>Salaried</strong></div>
      </div>
    </div>
  );
}

function ApplyLoanPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    loanTypeId: 1,
    requestedAmount: 500000,
    tenureMonths: 36,
    purpose: 'Home renovation',
    employmentType: 'Salaried',
    employer: 'Infosys',
    monthlyIncome: 85000,
    workExperience: 5,
    existingLoans: 100000,
    existingEmi: 12000,
    monthlyExpenses: 25000,
    bankAccount: 'SBIN0001122'
  });
  const [eligibility, setEligibility] = useState(null);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    try {
      const response = await api.post('/applications', form);
      setEligibility(response.data.eligibility);
      setStep(6);
    } catch (error) {
      alert(error.response?.data?.message || 'Application could not be submitted.');
    }
  };

  return (
    <div className="panel">
      <h2>Apply for a loan</h2>
      <div className="steps-row">
        {[1, 2, 3, 4, 5, 6].map((s) => <span className={step === s ? 'step-pill active' : 'step-pill'} key={s}>Step {s}</span>)}
      </div>

      {step === 1 && (
        <div className="stacked-form">
          <label>Loan type</label>
          <select value={form.loanTypeId} onChange={(e) => handleChange('loanTypeId', e.target.value)}>
            <option value={1}>Personal Loan</option>
            <option value={2}>Home Loan</option>
            <option value={3}>Education Loan</option>
            <option value={4}>Vehicle Loan</option>
            <option value={5}>Business Loan</option>
            <option value={6}>Gold Loan</option>
            <option value={7}>Agriculture Loan</option>
          </select>
          <button className="btn btn-primary" onClick={() => setStep(2)}>Continue</button>
        </div>
      )}

      {step === 2 && (
        <div className="stacked-form">
          <label>Requested amount</label>
          <input type="number" value={form.requestedAmount} onChange={(e) => handleChange('requestedAmount', e.target.value)} />
          <label>Tenure (months)</label>
          <input type="number" value={form.tenureMonths} onChange={(e) => handleChange('tenureMonths', e.target.value)} />
          <label>Purpose</label>
          <input value={form.purpose} onChange={(e) => handleChange('purpose', e.target.value)} />
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="stacked-form">
          <label>Employment type</label>
          <input value={form.employmentType} onChange={(e) => handleChange('employmentType', e.target.value)} />
          <label>Employer</label>
          <input value={form.employer} onChange={(e) => handleChange('employer', e.target.value)} />
          <label>Monthly income</label>
          <input type="number" value={form.monthlyIncome} onChange={(e) => handleChange('monthlyIncome', e.target.value)} />
          <label>Work experience (years)</label>
          <input type="number" value={form.workExperience} onChange={(e) => handleChange('workExperience', e.target.value)} />
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="stacked-form">
          <label>Existing loans</label>
          <input type="number" value={form.existingLoans} onChange={(e) => handleChange('existingLoans', e.target.value)} />
          <label>Existing EMI</label>
          <input type="number" value={form.existingEmi} onChange={(e) => handleChange('existingEmi', e.target.value)} />
          <label>Monthly expenses</label>
          <input type="number" value={form.monthlyExpenses} onChange={(e) => handleChange('monthlyExpenses', e.target.value)} />
          <label>Bank account</label>
          <input value={form.bankAccount} onChange={(e) => handleChange('bankAccount', e.target.value)} />
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(5)}>Next</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="stacked-form">
          <h3>Eligibility preview</h3>
          <div className="insight-box">
            <p><strong>AI recommendation:</strong> Advisory only. Final approval remains with authorized bank officials.</p>
            <p><strong>Max eligible amount:</strong> ₹{Number(form.requestedAmount || 0).toLocaleString('en-IN')}</p>
            <p><strong>Estimated EMI:</strong> ₹{Number(form.requestedAmount / (form.tenureMonths || 1)).toLocaleString('en-IN')}</p>
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setStep(4)}>Back</button>
            <button className="btn btn-primary" onClick={handleSubmit}>Submit application</button>
          </div>
        </div>
      )}

      {step === 6 && eligibility && (
        <div className="stacked-form">
          <h3>Application submitted</h3>
          <p>Status: <span className="badge success">{eligibility.result}</span></p>
          <p>Estimated EMI: ₹{Number(eligibility.estimatedEmi).toLocaleString('en-IN')}</p>
          <p>Max eligible amount: ₹{Number(eligibility.maxEligibleAmount).toLocaleString('en-IN')}</p>
          <button className="btn btn-primary" onClick={() => setStep(1)}>Create another application</button>
        </div>
      )}
    </div>
  );
}

function ApplicationsPage({ role }) {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    api.get('/applications').then((response) => setApplications(response.data)).catch(console.error);
  }, []);

  return (
    <div className="panel">
      <div className="page-head">
        <h2>{role === 'customer' ? 'My applications' : 'Loan applications'}</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>Application ID</th>
            <th>Loan type</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((item) => (
            <tr key={item.id}>
              <td>{item.application_id}</td>
              <td>{item.loan_type_name || 'Loan'}</td>
              <td>₹{Number(item.requested_amount).toLocaleString('en-IN')}</td>
              <td><span className="badge" style={{ backgroundColor: statusColors[item.status] || '#757575', color: '#fff' }}>{item.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsPage() {
  const [file, setFile] = useState(null);
  const [applicationId, setApplicationId] = useState('1');
  const [documentType, setDocumentType] = useState('Aadhaar');

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return alert('Please select a file.');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('applicationId', applicationId);
    formData.append('documentType', documentType);
    try {
      await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Document uploaded successfully.');
    } catch (error) {
      alert(error.response?.data?.message || 'Upload failed.');
    }
  };

  return (
    <div className="panel">
      <h2>Document management</h2>
      <form className="stacked-form" onSubmit={handleUpload}>
        <label>Application ID</label>
        <input value={applicationId} onChange={(e) => setApplicationId(e.target.value)} />
        <label>Document type</label>
        <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
          <option>Aadhaar</option>
          <option>PAN</option>
          <option>Salary slips</option>
          <option>Bank statements</option>
          <option>Income Tax Returns</option>
          <option>Address proof</option>
          <option>Property documents</option>
          <option>Vehicle documents</option>
          <option>Business proof</option>
          <option>Photograph</option>
        </select>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.jpg,.png" />
        <button className="btn btn-primary" type="submit">Upload document</button>
      </form>
    </div>
  );
}

function EligibilityPage() {
  const [payload, setPayload] = useState({ monthlyIncome: 85000, annualIncome: 1020000, creditScore: 710, existingEmi: 12000, existingLiabilities: 100000, employmentType: 'Salaried', age: 32, requestedAmount: 500000, debtToIncomeRatio: 0.4, tenure: 36 });
  const [result, setResult] = useState(null);

  const handleCalculate = async () => {
    try {
      const response = await api.post('/eligibility/calculate', payload);
      setResult(response.data);
    } catch (error) {
      alert(error.response?.data?.message || 'Calculation failed.');
    }
  };

  return (
    <div className="panel">
      <h2>Eligibility assessment</h2>
      <div className="stacked-form">
        <input value={payload.monthlyIncome} onChange={(e) => setPayload({ ...payload, monthlyIncome: e.target.value })} placeholder="Monthly income" />
        <input value={payload.requestedAmount} onChange={(e) => setPayload({ ...payload, requestedAmount: e.target.value })} placeholder="Requested loan amount" />
        <input value={payload.creditScore} onChange={(e) => setPayload({ ...payload, creditScore: e.target.value })} placeholder="Credit score" />
        <button className="btn btn-primary" onClick={handleCalculate}>Calculate eligibility</button>
      </div>
      {result && (
        <div className="insight-box mt-20">
          <p><strong>Status:</strong> {result.result}</p>
          <p><strong>Eligibility score:</strong> {result.score}</p>
          <p><strong>Max eligible amount:</strong> ₹{Number(result.maxEligibleAmount).toLocaleString('en-IN')}</p>
          <p><strong>Estimated EMI:</strong> ₹{Number(result.estimatedEmi).toLocaleString('en-IN')}</p>
          <p><strong>Note:</strong> {result.remarks}</p>
        </div>
      )}
    </div>
  );
}

function CalculatorPage() {
  const [principal, setPrincipal] = useState(500000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(36);
  const [result, setResult] = useState({ emi: 0, totalInterest: 0, totalRepayment: 0 });

  useEffect(() => {
    const emi = Number(principal) * Number(rate) / 100 / 12;
    setResult({
      emi: Number((emi * Number(tenure)).toFixed(2)),
      totalInterest: Number((emi * Number(tenure) - principal).toFixed(2)),
      totalRepayment: Number((emi * Number(tenure)).toFixed(2))
    });
  }, [principal, rate, tenure]);

  return (
    <div className="panel">
      <h2>EMI calculator</h2>
      <div className="stacked-form">
        <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="Principal" />
        <input type="number" value={rate} step="0.1" onChange={(e) => setRate(e.target.value)} placeholder="Annual interest rate" />
        <input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} placeholder="Tenure in months" />
      </div>
      <div className="info-grid mt-20">
        <div><label>Monthly EMI</label><strong>₹{Number(result.emi / tenure || 0).toLocaleString('en-IN')}</strong></div>
        <div><label>Total interest</label><strong>₹{Number(result.totalInterest).toLocaleString('en-IN')}</strong></div>
        <div><label>Total repayment</label><strong>₹{Number(result.totalRepayment).toLocaleString('en-IN')}</strong></div>
      </div>
    </div>
  );
}

function RepaymentPage() {
  const [payment, setPayment] = useState({ applicationId: 1, scheduleId: 1, amount: 18000, reference: 'PAY-1001' });
  const [status, setStatus] = useState('');

  const handlePayment = async () => {
    try {
      const response = await api.post('/payments/record', payment);
      setStatus(response.data.message);
    } catch (error) {
      setStatus(error.response?.data?.message || 'Payment failed.');
    }
  };

  return (
    <div className="panel">
      <h2>Repayment</h2>
      <div className="stacked-form">
        <input value={payment.applicationId} onChange={(e) => setPayment({ ...payment, applicationId: e.target.value })} placeholder="Application ID" />
        <input value={payment.scheduleId} onChange={(e) => setPayment({ ...payment, scheduleId: e.target.value })} placeholder="Schedule ID" />
        <input value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} placeholder="Amount" />
        <button className="btn btn-primary" onClick={handlePayment}>Record payment</button>
      </div>
      {status && <p className="mt-20">{status}</p>}
    </div>
  );
}

function NotificationsPage() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get('/notifications').then((response) => setItems(response.data)).catch(console.error);
  }, []);

  return (
    <div className="panel">
      <h2>Notifications</h2>
      <div className="notifications-list">
        {items.map((item) => (
          <div className="notification-item" key={item.id}>
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <span>{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewPage({ role }) {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    api.get('/applications').then((response) => setApplications(response.data)).catch(console.error);
  }, []);

  const reviewApplication = async (applicationId, decision) => {
    const payload = decision === 'REJECT' ? { decision, rejectionReason: 'Document quality below threshold' } : { decision, remarks: 'Reviewed and accepted.' };
    await api.post(`/applications/${applicationId}/review`, payload);
    alert('Review action completed.');
  };

  return (
    <div className="panel">
      <h2>{role === 'branch_manager' ? 'High-value review queue' : 'Application review queue'}</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((item) => (
            <tr key={item.id}>
              <td>{item.application_id}</td>
              <td>{item.customer_name || 'Customer'}</td>
              <td>₹{Number(item.requested_amount).toLocaleString('en-IN')}</td>
              <td>
                <button className="small-btn success" onClick={() => reviewApplication(item.id, 'APPROVE')}>Approve</button>
                <button className="small-btn danger" onClick={() => reviewApplication(item.id, 'REJECT')}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminUsersPage() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/applications'),
      api.get('/admin/loan-types')
    ])
      .then(([statsResponse, usersResponse, applicationsResponse, loanTypesResponse]) => {
        setStats(statsResponse.data || {});
        setUsers(usersResponse.data || []);
        setApplications(applicationsResponse.data || []);
        setLoanTypes(loanTypesResponse.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="panel">Loading admin console...</div>;
  }

  const summaryCards = [
    { label: 'Customers', value: stats.totalCustomers || 0 },
    { label: 'Applications', value: stats.totalApplications || 0 },
    { label: 'Pending', value: stats.pendingApplications || 0 },
    { label: 'Approved', value: stats.approvedLoans || 0 },
    { label: 'Disbursed', value: stats.disbursedLoans || 0 },
    { label: 'Portfolio', value: `₹${Number(stats.totalLoanAmount || 0).toLocaleString('en-IN')}` }
  ];

  const recentUsers = users.slice(0, 5);
  const recentApplications = applications.slice(0, 5);

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Admin control centre</h1>
        </div>
      </div>

      <div className="stats-grid">
        {summaryCards.map((card) => (
          <div className="panel stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="info-grid mt-20">
        <div className="panel">
          <h3>Portfolio health</h3>
          <div className="info-grid">
            <div><label>Outstanding</label><strong>₹{Number(stats.outstandingAmount || 0).toLocaleString('en-IN')}</strong></div>
            <div><label>EMI collections</label><strong>₹{Number(stats.emiCollections || 0).toLocaleString('en-IN')}</strong></div>
            <div><label>Rejected</label><strong>{stats.rejectedLoans || 0}</strong></div>
            <div><label>Active loans</label><strong>{stats.activeLoans || 0}</strong></div>
          </div>
        </div>
      </div>

      <div className="mt-20 panel">
        <h3>Recent users</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td><span className="badge" style={{ backgroundColor: user.is_active ? '#e8f5e9' : '#f3f4f6', color: user.is_active ? '#2e7d32' : '#374151' }}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-20 panel">
        <h3>Loan pipeline</h3>
        <table>
          <thead>
            <tr>
              <th>Application</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentApplications.map((item) => (
              <tr key={item.id}>
                <td>{item.application_id}</td>
                <td>{item.customer_name || 'Customer'}</td>
                <td>₹{Number(item.requested_amount).toLocaleString('en-IN')}</td>
                <td><span className="badge" style={{ backgroundColor: statusColors[item.status] || '#757575', color: '#fff' }}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-20 panel">
        <h3>Configured loan schemes</h3>
        <table>
          <thead>
            <tr>
              <th>Scheme</th>
              <th>Rate</th>
              <th>Limit</th>
              <th>Tenure</th>
            </tr>
          </thead>
          <tbody>
            {loanTypes.slice(0, 5).map((loan) => (
              <tr key={loan.id}>
                <td>{loan.name}</td>
                <td>{loan.interest_rate}%</td>
                <td>₹{Number(loan.min_amount).toLocaleString('en-IN')} - ₹{Number(loan.max_amount).toLocaleString('en-IN')}</td>
                <td>{loan.min_tenure} - {loan.max_tenure} months</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoanTypesPage() {
  const [loanTypes, setLoanTypes] = useState([]);

  useEffect(() => {
    api.get('/admin/loan-types')
      .then((response) => setLoanTypes(response.data || []))
      .catch(console.error);
  }, []);

  return (
    <div className="panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">Products</p>
          <h2>Loan schemes</h2>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Scheme</th>
            <th>Code</th>
            <th>Limit</th>
            <th>Rate</th>
            <th>Tenure</th>
          </tr>
        </thead>
        <tbody>
          {loanTypes.map((loan) => (
            <tr key={loan.id}>
              <td>{loan.name}</td>
              <td>{loan.code}</td>
              <td>₹{Number(loan.min_amount).toLocaleString('en-IN')} - ₹{Number(loan.max_amount).toLocaleString('en-IN')}</td>
              <td>{loan.interest_rate}%</td>
              <td>{loan.min_tenure} - {loan.max_tenure} months</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsPage() {
  const [stats, setStats] = useState({});
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/applications')
    ])
      .then(([statsResponse, applicationsResponse]) => {
        setStats(statsResponse.data || {});
        setApplications(applicationsResponse.data || []);
      })
      .catch(console.error);
  }, []);

  const distribution = [
    { name: 'Personal', value: Math.max(1, Math.round(((applications.filter((item) => item.loan_type_name === 'Personal Loan').length || 12) / Math.max(applications.length || 1, 1)) * 100)) },
    { name: 'Home', value: Math.max(1, Math.round(((applications.filter((item) => item.loan_type_name === 'Home Loan').length || 9) / Math.max(applications.length || 1, 1)) * 100)) },
    { name: 'Education', value: Math.max(1, Math.round(((applications.filter((item) => item.loan_type_name === 'Education Loan').length || 7) / Math.max(applications.length || 1, 1)) * 100)) },
    { name: 'Vehicle', value: Math.max(1, Math.round(((applications.filter((item) => item.loan_type_name === 'Vehicle Loan').length || 5) / Math.max(applications.length || 1, 1)) * 100)) },
    { name: 'Business', value: Math.max(1, Math.round(((applications.filter((item) => item.loan_type_name === 'Business Loan').length || 4) / Math.max(applications.length || 1, 1)) * 100)) }
  ];
  const colors = ['#1e88e5', '#26a69a', '#f9a825', '#ef5350', '#7e57c2'];

  const trend = [
    { name: 'Jan', value: 18 },
    { name: 'Feb', value: 22 },
    { name: 'Mar', value: 24 },
    { name: 'Apr', value: 28 },
    { name: 'May', value: 33 },
    { name: 'Jun', value: 40 }
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>Performance reports</h2>
        </div>
      </div>

      <div className="stats-grid">
        <div className="panel stat-card">
          <span>Portfolio value</span>
          <strong>₹{Number(stats.totalLoanAmount || 0).toLocaleString('en-IN')}</strong>
        </div>
        <div className="panel stat-card">
          <span>Approved volume</span>
          <strong>{stats.approvedLoans || 0}</strong>
        </div>
        <div className="panel stat-card">
          <span>Rejected</span>
          <strong>{stats.rejectedLoans || 0}</strong>
        </div>
      </div>

      <div className="panel mt-20">
        <h3>Monthly loan growth</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#1e88e5" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel mt-20">
        <h3>Product mix</h3>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {distribution.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
