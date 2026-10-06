import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authMiddleware, signToken } from '../auth.js';
import { generateOtp, validateAadhaar, validatePan } from '../mockServices.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const {
      fullName,
      dob,
      mobile,
      email,
      aadhaar,
      pan,
      address,
      employmentType,
      employerName,
      monthlyIncome,
      bankAccount,
      password,
      confirmPassword
    } = req.body;

    if (!fullName || !dob || !mobile || !email || !aadhaar || !pan || !address || !employmentType || !monthlyIncome || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
    }

    if (!validateAadhaar(aadhaar)) {
      return res.status(400).json({ message: 'Please enter a valid 12-digit Aadhaar number.' });
    }

    if (!validatePan(pan)) {
      return res.status(400).json({ message: 'Please enter a valid PAN number format.' });
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*]/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 chars with uppercase, number, and special character.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existingEmail) {
      return res.status(409).json({ message: 'A customer with this email already exists.' });
    }

    const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(mobile);
    if (existingPhone) {
      return res.status(409).json({ message: 'A customer with this mobile number already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otpCode = generateOtp();

    const user = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, otp_code, otp_verified, is_active)
      VALUES (?, ?, ?, ?, 'customer', ?, 0, 1)
    `).run(fullName, email.toLowerCase(), mobile, passwordHash, otpCode);

    db.prepare(`
      INSERT INTO customers (user_id, dob, aadhaar, pan, address, employment_type, employer_name, monthly_income, bank_account)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.lastInsertRowid, dob, aadhaar, pan.toUpperCase(), address, employmentType, employerName || '', Number(monthlyIncome), bankAccount || '');

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(user.lastInsertRowid, 'Registration successful', 'Welcome! Please complete OTP verification to activate your account.', 'info');

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.lastInsertRowid, 'REGISTER_CUSTOMER', 'user', user.lastInsertRowid, JSON.stringify({ email, mobile }));

    return res.status(201).json({
      message: 'Registration successful. Please verify your account with the demo OTP.',
      otpCode,
      userId: user.lastInsertRowid,
      requiresOtp: true
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to complete registration right now.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/mobile and password are required.' });
    }

    const user = db.prepare(`
      SELECT * FROM users WHERE email = ? OR phone = ?
    `).get(identifier.toLowerCase(), identifier);

    if (!user) {
      return res.status(401).json({ message: 'Invalid login credentials.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid login credentials.' });
    }

    if (!user.otp_verified) {
      return res.status(200).json({
        requiresOtp: true,
        userId: user.id,
        otpCode: user.otp_code || generateOtp(),
        message: 'Account verification required. Please enter the OTP to continue.'
      });
    }

    const token = signToken(user);
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login right now.' });
  }
});

router.post('/verify-otp', (req, res) => {
  const { userId, otpCode } = req.body;
  if (!userId || !otpCode) {
    return res.status(400).json({ message: 'OTP and user ID are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(userId));
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user.otp_code !== otpCode && otpCode !== '123456') {
    return res.status(400).json({ message: 'Invalid OTP. Please use the demo OTP.' });
  }

  db.prepare(`
    UPDATE users SET otp_verified = 1, otp_code = ? WHERE id = ?
  `).run(generateOtp(), user.id);

  db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`).run(
    user.id,
    'OTP verified',
    'Your account has been verified successfully.',
    'success'
  );

  const token = signToken(user);
  return res.status(200).json({
    token,
    message: 'OTP verified successfully.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
});

router.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email and new password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(404).json({ message: 'No account found for the entered email.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

  db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`).run(
    user.id,
    'PASSWORD_RESET',
    'user',
    user.id,
    JSON.stringify({ email })
  );

  return res.status(200).json({ message: 'Password reset successful.' });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role
  });
});

export default router;
