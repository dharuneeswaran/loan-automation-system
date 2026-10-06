# Loan Automation System (LAS)

A complete Loan Automation System for digital onboarding, application processing, verification, disbursement, repayment tracking, and reporting.

## Problem statement
Traditional loan processing is manual, slow, and error-prone. This system digitizes the end-to-end lifecycle with centralized records, role-based access, eligibility rules, mock credit checks, document verification, EMI calculations, repayment tracking, and notifications.

## Objectives
- Digital customer registration and onboarding
- Role-based workflows for customer, loan officer, manager, and admin
- Loan application automation with eligibility and credit verification
- Upload and verify documents
- EMI calculation and repayment schedule management
- Notifications and reporting
- Secure authentication with hashed passwords and audit logging

## Features
- User registration, login, OTP verification, password reset
- Multi-step loan application workflow
- Document ingestion and validations
- Rule-based eligibility engine with advisory note for AI recommendations
- Mock credit bureau verification service
- Loan review, approval, rejection, and disbursement flow
- EMI calculator and repayment scheduling
- Notification center and dashboards
- Admin analytics and exports-ready reporting

## Roles
- Customer
- Loan Officer
- Branch Manager
- Administrator

## Technology stack
- Frontend: React + Vite + CSS
- Backend: Node.js + Express
- Database: SQLite with better-sqlite3
- Authentication: JWT + bcrypt
- Storage: Local disk uploads

## System architecture
- Frontend: user interactions, dashboard, forms, role-specific views
- Backend: business logic, validation, authentication, API endpoints
- Database: relational persistence for users, loan applications, schedules, audit logs, notifications
- External service adapters: mock OTP, mock credit service, mock banking service

## Database structure
Core tables include:
- users
- customers
- branches
- loan_types
- loan_applications
- documents
- eligibility_assessments
- credit_verifications
- loan_approvals
- loan_disbursements
- repayment_schedules
- payments
- notifications
- audit_logs

## Installation
1. Clone the project.
2. Install dependencies:
   npm install
3. Copy environment variables if needed.

## Run
- Start backend and frontend together:
  npm run dev
- Or start backend alone:
  npm run start

## Demo credentials
- Admin: admin@las.com / Admin@123
- Branch Manager: manager@las.com / Manager@123
- Loan Officer: officer1@las.com / Officer@123
- Customer: customer1@las.com / Customer@123

Demo OTP for registration/login verification: 123456

## API endpoints
- Auth: /api/auth/register, /api/auth/login, /api/auth/verify-otp, /api/auth/reset-password
- Dashboard: /api/dashboard
- Applications: /api/applications
- Documents: /api/documents/upload
- Admin: /api/admin/stats
- Payments: /api/payments/record
- Notifications: /api/notifications

## Testing instructions
- Create customer account, verify OTP, apply for a loan, upload documents, review eligibility, verify credit checks, and process application review.
- Use the admin and officer demo accounts to exercise approval and admin workflows.

## Future enhancements
- Real SMS/email sending
- Real banking integration
- PDF and Excel reporting exports
- Risk scoring engine and analytics dashboards
- Audit and compliance workflows

## Important note
Automated eligibility and credit recommendations are advisory only. Final approval remains with authorized bank officials.
