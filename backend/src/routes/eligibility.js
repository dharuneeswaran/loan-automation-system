import express from 'express';
import { authMiddleware } from '../auth.js';
import { calculateEligibility } from '../mockServices.js';

const router = express.Router();

router.post('/calculate', authMiddleware, (req, res) => {
  const {
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
    tenure
  } = req.body;

  const payload = {
    loanType: loanType || { interest_rate: 8.5, max_tenure: 60 },
    requestedAmount: Number(requestedAmount || 0),
    monthlyIncome: Number(monthlyIncome || 0),
    annualIncome: Number(annualIncome || (Number(monthlyIncome || 0) * 12)),
    creditScore: Number(creditScore || 700),
    existingLiabilities: Number(existingLiabilities || 0),
    existingEmi: Number(existingEmi || 0),
    employmentType: employmentType || 'Salaried',
    age: Number(age || 30),
    debtToIncomeRatio: Number(debtToIncomeRatio || 0),
    tenure: Number(tenure || 36)
  };

  const result = calculateEligibility(payload);
  return res.status(200).json({
    ...result,
    remarks: 'Automated eligibility recommendations are only assistance. Final approval remains with authorized bank officials.'
  });
});

export default router;
