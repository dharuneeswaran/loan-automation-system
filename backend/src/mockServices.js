import crypto from 'crypto';

export function generateOtp() {
  return '123456';
}

export function hashString(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function validatePan(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

export function validateAadhaar(aadhaar) {
  return /^[0-9]{12}$/.test(aadhaar);
}

export function calculateEligibility({
  loanType,
  requestedAmount,
  monthlyIncome,
  annualIncome,
  creditScore,
  existingLiabilities,
  existingEmi,
  employmentType,
  age,
  debtToIncomeRatio,
  tenure,
}) {
  const maxAllowed = Math.min(
    Number(monthlyIncome) * 18,
    Number(annualIncome) * 0.6,
    Number(requestedAmount) * 1.5 || Number.MAX_SAFE_INTEGER
  );

  let score = 45;
  if (monthlyIncome > 50000) score += 25;
  if (creditScore >= 700) score += 20;
  if (existingEmi < 15000) score += 10;
  if (employmentType && ['Salaried', 'Self Employed', 'Professional'].includes(employmentType)) score += 10;
  if (age >= 21 && age <= 60) score += 10;
  if (debtToIncomeRatio < 0.45) score += 10;
  if (requestedAmount <= maxAllowed) score += 15;

  let result = 'Additional Verification Required';
  if (score >= 85 && requestedAmount <= maxAllowed && creditScore >= 650) {
    result = 'Eligible';
  } else if (score >= 70) {
    result = 'Partially Eligible';
  } else if (score >= 55 && requestedAmount <= maxAllowed * 0.85) {
    result = 'Additional Verification Required';
  }

  const maxEligibleAmount = Math.min(requestedAmount, Math.max(100000, maxAllowed * 0.85));
  const effectiveRate = loanType?.interest_rate || 8.5;
  const recommendedTenure = Math.min(loanType?.max_tenure || 60, Math.max(10, tenure || 36));
  const principal = Math.min(requestedAmount, maxEligibleAmount);

  const monthlyRate = effectiveRate / 12 / 100;
  const emi = monthlyRate > 0
    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, recommendedTenure)) /
      (Math.pow(1 + monthlyRate, recommendedTenure) - 1)
    : principal / recommendedTenure;

  return {
    result,
    score: Math.min(100, score),
    maxEligibleAmount: Number(maxEligibleAmount.toFixed(2)),
    estimatedInterestRate: Number(effectiveRate.toFixed(2)),
    recommendedTenure,
    estimatedEmi: Number(emi.toFixed(2)),
    debtToIncomeRatio: Number(((existingEmi + existingLiabilities || 0) / Math.max(monthlyIncome, 1)).toFixed(4)),
    remarks: 'Automated assessment is only advisory. Final approval remains with authorized bank officials.'
  };
}

export function calculateEmi(principal, annualRate, tenureMonths) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) {
    return {
      emi: principal / tenureMonths,
      totalInterest: 0,
      totalRepayment: principal
    };
  }

  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  const totalRepayment = emi * tenureMonths;
  const totalInterest = totalRepayment - principal;

  return {
    emi: Number(emi.toFixed(2)),
    totalInterest: Number(totalInterest.toFixed(2)),
    totalRepayment: Number(totalRepayment.toFixed(2))
  };
}

export function generateRepaymentSchedule({ principal, annualRate, tenureMonths }) {
  const { emi } = calculateEmi(principal, annualRate, tenureMonths);
  let remainingBalance = principal;
  const schedule = [];

  for (let i = 1; i <= tenureMonths; i += 1) {
    const interest = remainingBalance * (annualRate / 12 / 100);
    const principalComponent = emi - interest;
    remainingBalance = Math.max(0, remainingBalance - principalComponent);

    schedule.push({
      emiNumber: i,
      dueDate: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      principalComponent: Number(principalComponent.toFixed(2)),
      interestComponent: Number(interest.toFixed(2)),
      emiAmount: Number(emi.toFixed(2)),
      remainingBalance: Number(remainingBalance.toFixed(2)),
      paymentStatus: 'UPCOMING'
    });
  }

  return schedule;
}

export function mockCreditCheck() {
  const score = 620 + Math.floor(Math.random() * 260);
  const cappedScore = Math.max(300, Math.min(score, 900));

  let riskCategory = 'Medium Risk';
  let status = 'VERIFIED';

  if (cappedScore >= 750) riskCategory = 'Low Risk';
  else if (cappedScore < 550) riskCategory = 'High Risk';

  if (cappedScore < 300) status = 'CREDIT_VERIFICATION_PENDING';

  return {
    creditScore: cappedScore,
    status,
    riskCategory,
    summary: `Mock bureau check completed. Credit history indicates ${riskCategory.toLowerCase()} profile for the customer.`
  };
}

export function makeNotification(title, message, type = 'info') {
  return { title, message, type };
}
