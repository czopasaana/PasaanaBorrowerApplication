/**
 * Comprehensive Test Data Seeder for Mortgage Application
 * 
 * Creates 41 test users covering all possible mortgage scenarios:
 * (Note: VA, FHA, and DPA loan types are not supported in Danish realkredit style)
 * - Product variations (30Y Fixed, 15Y Fixed, ARM products)
 * - Occupancy types (Primary, Second Home, Investment)
 * - Income types (W-2, 1099, Self-Employed, Retirement, etc.)
 * - Credit scenarios (at floor, below floor, derogatory history)
 * - Edge cases (gift funds, large deposits, deferred loans, etc.)
 * 
 * Run: node scripts/seedTestData.js
 */

require('dotenv').config();
const sql = require('mssql');
const bcrypt = require('bcrypt');
const { getConnection } = require('../Db');

// ============================================================================
// TEST USERS CONFIGURATION - 44 COMPREHENSIVE SCENARIOS
// ============================================================================

const TEST_USERS = [
  // ============================================================================
  // SECTION 1: APPROVED SCENARIOS (8 users)
  // ============================================================================
  {
    scenario: 'APPROVED - Strong W-2 Employee',
    email: 'approved.w2@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Michael',
      lastName: 'Johnson',
      dob: '1985-03-15',
      ssn: '111-22-3333',
      phone: '555-111-2222',
      streetAddress: '123 Success Lane',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      employmentType: 'W2',
      annualIncome: 125000,
      monthlyDebt: 500,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 450000,
      propertyStreet: '456 Dream Home Dr',
      propertyCity: 'Boulder',
      propertyState: 'CO',
      propertyZip: '80301',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    expectedOutcome: 'APPROVED - DTI ~15%, excellent credit, stable employment'
  },
  {
    scenario: 'APPROVED - Dual Income Household',
    email: 'approved.dual@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Sarah',
      lastName: 'Williams',
      dob: '1988-07-22',
      ssn: '222-33-4444',
      phone: '555-222-3333',
      streetAddress: '789 Partner Ave',
      city: 'Aurora',
      state: 'CO',
      zipCode: '80010',
      employmentType: 'W2',
      annualIncome: 95000,
      monthlyDebt: 800,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      typeOfCredit: 'Joint',
      loanPurpose: 'Purchase',
      loanAmount: 380000,
      propertyStreet: '321 Family Way',
      propertyCity: 'Lakewood',
      propertyState: 'CO',
      propertyZip: '80226',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    coBorrower: {
      firstName: 'David',
      lastName: 'Williams',
      dob: '1986-11-10',
      ssn: '333-44-5555',
      annualIncome: 85000
    },
    expectedOutcome: 'APPROVED - Combined income $180k, moderate debt, good credit'
  },
  {
    scenario: 'APPROVED - Self-Employed Business Owner',
    email: 'approved.selfemployed@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Robert',
      lastName: 'Chen',
      dob: '1975-01-30',
      ssn: '444-55-6666',
      phone: '555-333-4444',
      streetAddress: '555 Entrepreneur Blvd',
      city: 'Denver',
      state: 'CO',
      zipCode: '80205',
      employmentType: 'SelfEmployed',
      annualIncome: 175000,
      monthlyDebt: 1200,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 550000,
      propertyStreet: '888 Executive Ct',
      propertyCity: 'Cherry Hills',
      propertyState: 'CO',
      propertyZip: '80113',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed',
      businessOwnerOrSelfEmployed: true,
      ownershipSharePercent: 100
    },
    expectedOutcome: 'APPROVED - High income, requires 2 years tax returns, P&L'
  },
  {
    scenario: 'APPROVED - Conditional then Cleared',
    email: 'approved.conditional@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Patricia',
      lastName: 'Nelson',
      dob: '1984-02-28',
      ssn: '567-89-0123',
      phone: '555-567-8901',
      streetAddress: '234 Clearance Way',
      city: 'Arvada',
      state: 'CO',
      zipCode: '80002',
      employmentType: 'W2',
      annualIncome: 88000,
      monthlyDebt: 650,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 320000,
      propertyStreet: '567 Condition Met Ct',
      propertyCity: 'Westminster',
      propertyState: 'CO',
      propertyZip: '80031',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    expectedOutcome: 'APPROVED - Initially conditional (needed updated paystubs), conditions satisfied'
  },
  {
    scenario: 'APPROVED - Plaid Verified Assets',
    email: 'approved.plaid@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Andrew',
      lastName: 'Mitchell',
      dob: '1987-06-15',
      ssn: '678-90-1234',
      phone: '555-678-9012',
      streetAddress: '890 Fintech Ave',
      city: 'Denver',
      state: 'CO',
      zipCode: '80206',
      employmentType: 'W2',
      annualIncome: 105000,
      monthlyDebt: 450,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 380000,
      propertyStreet: '123 Digital Lane',
      propertyCity: 'Boulder',
      propertyState: 'CO',
      propertyZip: '80302',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    plaidLinked: true,
    expectedOutcome: 'APPROVED - Assets verified via Plaid, no manual bank statement uploads needed'
  },
  {
    scenario: 'APPROVED - Non-Occupant Co-Signer',
    email: 'coborrower.nonoccupant@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Michelle',
      lastName: 'Taylor',
      dob: '1994-04-10',
      ssn: '890-12-3456',
      phone: '555-890-1234',
      streetAddress: '111 Parent Help Dr',
      city: 'Denver',
      state: 'CO',
      zipCode: '80204',
      employmentType: 'W2',
      annualIncome: 52000,
      monthlyDebt: 250,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      typeOfCredit: 'Joint',
      loanPurpose: 'Purchase',
      loanAmount: 280000,
      propertyStreet: '222 Starter Home Ave',
      propertyCity: 'Aurora',
      propertyState: 'CO',
      propertyZip: '80011',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    coBorrower: {
      firstName: 'Richard',
      lastName: 'Taylor',
      dob: '1965-08-25',
      ssn: '901-23-4567',
      annualIncome: 95000,
      nonOccupant: true
    },
    expectedOutcome: 'APPROVED - Non-occupant co-signer adds income, primary borrower occupies'
  },

  // ============================================================================
  // SECTION 2: DENIED SCENARIOS (9 users)
  // ============================================================================
  {
    scenario: 'DENIED - High DTI Ratio',
    email: 'denied.highdti@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Kevin',
      lastName: 'Miller',
      dob: '1990-05-18',
      ssn: '666-77-8888',
      phone: '555-555-6666',
      streetAddress: '999 Debt Street',
      city: 'Denver',
      state: 'CO',
      zipCode: '80219',
      employmentType: 'W2',
      annualIncome: 55000,
      monthlyDebt: 2500,
      creditScore: 'Fair (650-699)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 350000,
      propertyStreet: '444 Wishful Thinking Ln',
      propertyCity: 'Denver',
      propertyState: 'CO',
      propertyZip: '80220',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    liabilities: [
      { type: 'Revolving', company: 'Credit Card A', balance: 15000, monthlyPayment: 450 },
      { type: 'Installment', company: 'Auto Loan', balance: 28000, monthlyPayment: 650 },
      { type: 'Installment', company: 'Student Loans', balance: 45000, monthlyPayment: 550 },
      { type: 'Revolving', company: 'Credit Card B', balance: 8000, monthlyPayment: 240 }
    ],
    expectedOutcome: 'DENIED - DTI exceeds 50%, high existing debt burden'
  },
  {
    scenario: 'DENIED - Poor Credit History',
    email: 'denied.badcredit@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Lisa',
      lastName: 'Thompson',
      dob: '1992-12-03',
      ssn: '777-88-9999',
      phone: '555-666-7777',
      streetAddress: '222 Recovery Road',
      city: 'Englewood',
      state: 'CO',
      zipCode: '80110',
      employmentType: 'W2',
      annualIncome: 72000,
      monthlyDebt: 600,
      creditScore: 'Poor (Below 620)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 220000,
      propertyStreet: '333 Second Chance Dr',
      propertyCity: 'Littleton',
      propertyState: 'CO',
      propertyZip: '80120',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    declarations: {
      bankruptcyLast7yrs: true,
      bankruptcyChapters: 'Chapter 7',
      bankruptcyMonthsAgo: 24,
      foreclosureLast7yrs: false,
      outstandingJudgments: false
    },
    expectedOutcome: 'DENIED - Credit <640 floor, BK <48mo seasoning'
  },
  {
    scenario: 'DENIED - Insufficient Income Documentation',
    email: 'denied.nodocs@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Tyler',
      lastName: 'Martinez',
      dob: '1995-08-25',
      ssn: '888-99-0000',
      phone: '555-777-8888',
      streetAddress: '111 Gig Worker Ln',
      city: 'Denver',
      state: 'CO',
      zipCode: '80204',
      employmentType: 'Other',
      annualIncome: 85000,
      monthlyDebt: 300,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 300000,
      propertyStreet: '555 App Economy Ave',
      propertyCity: 'Denver',
      propertyState: 'CO',
      propertyZip: '80206',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    expectedOutcome: 'DENIED - Cannot verify income, no consistent employment history'
  },
  {
    scenario: 'DENIED - Recent Bankruptcy (<48 months)',
    email: 'denied.bankruptcyrecent@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Brandon',
      lastName: 'Davis',
      dob: '1988-03-12',
      ssn: '234-56-7891',
      phone: '555-234-5678',
      streetAddress: '444 Fresh Start Ln',
      city: 'Denver',
      state: 'CO',
      zipCode: '80221',
      employmentType: 'W2',
      annualIncome: 78000,
      monthlyDebt: 400,
      creditScore: 'Fair (650-699)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 275000,
      propertyStreet: '555 Waiting Period Dr',
      propertyCity: 'Lakewood',
      propertyState: 'CO',
      propertyZip: '80228',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    declarations: {
      bankruptcyLast7yrs: true,
      bankruptcyChapters: 'Chapter 7',
      bankruptcyMonthsAgo: 36,
      foreclosureLast7yrs: false
    },
    expectedOutcome: 'DENIED - Bankruptcy discharged 36 months ago, requires 48 months seasoning'
  },
  {
    scenario: 'DENIED - 30-Day Mortgage Late in 12 Months',
    email: 'denied.lates30@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Amanda',
      lastName: 'Wilson',
      dob: '1986-07-19',
      ssn: '345-67-8902',
      phone: '555-345-6789',
      streetAddress: '666 Late Payment Blvd',
      city: 'Aurora',
      state: 'CO',
      zipCode: '80015',
      employmentType: 'W2',
      annualIncome: 92000,
      monthlyDebt: 700,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Refinance',
      loanAmount: 310000,
      propertyStreet: '666 Late Payment Blvd',
      propertyCity: 'Aurora',
      propertyState: 'CO',
      propertyZip: '80015',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    declarations: {
      mortgageLates30Day12mo: 1
    },
    expectedOutcome: 'DENIED - Policy requires no 30-day mortgage lates in past 12 months'
  },
  {
    scenario: 'DENIED - 60-Day Mortgage Late in 24 Months',
    email: 'denied.lates60@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Christopher',
      lastName: 'Martin',
      dob: '1983-11-08',
      ssn: '456-78-9013',
      phone: '555-456-7890',
      streetAddress: '777 Delinquent Dr',
      city: 'Westminster',
      state: 'CO',
      zipCode: '80030',
      employmentType: 'W2',
      annualIncome: 105000,
      monthlyDebt: 900,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Refinance',
      loanAmount: 380000,
      propertyStreet: '777 Delinquent Dr',
      propertyCity: 'Westminster',
      propertyState: 'CO',
      propertyZip: '80030',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    declarations: {
      mortgageLates60Day24mo: 1
    },
    expectedOutcome: 'DENIED - Policy requires no 60-day mortgage lates in past 24 months'
  },
  {
    scenario: 'DENIED - Unresolved Judgment',
    email: 'denied.judgment@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Daniel',
      lastName: 'Garcia',
      dob: '1985-04-22',
      ssn: '567-89-0124',
      phone: '555-567-8901',
      streetAddress: '888 Legal Issues Way',
      city: 'Denver',
      state: 'CO',
      zipCode: '80205',
      employmentType: 'W2',
      annualIncome: 88000,
      monthlyDebt: 550,
      creditScore: 'Fair (650-699)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 295000,
      propertyStreet: '999 Resolution Pending Ave',
      propertyCity: 'Arvada',
      propertyState: 'CO',
      propertyZip: '80003',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    declarations: {
      outstandingJudgments: true,
      judgmentAmount: 12500
    },
    expectedOutcome: 'DENIED - Outstanding judgment must be resolved before approval'
  },
  {
    scenario: 'DENIED - Second Home Below 660 Credit Floor',
    email: 'denied.secondhomecredit@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Stephanie',
      lastName: 'Lee',
      dob: '1979-08-30',
      ssn: '678-90-1235',
      phone: '555-678-9012',
      streetAddress: '123 Primary Home St',
      city: 'Denver',
      state: 'CO',
      zipCode: '80206',
      employmentType: 'W2',
      annualIncome: 135000,
      monthlyDebt: 1200,
      creditScore: 'Fair (650-699)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 350000,
      propertyStreet: '456 Vacation Home Dr',
      propertyCity: 'Vail',
      propertyState: 'CO',
      propertyZip: '81657',
      occupancyType: 'SecondHome',
      productType: '30-Year Fixed'
    },
    expectedOutcome: 'DENIED - Second home requires 660+ credit, applicant at 655'
  },
  {
    scenario: 'DENIED - Investment Property Below 700 Credit Floor',
    email: 'denied.investmentcredit@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Gregory',
      lastName: 'Adams',
      dob: '1977-02-14',
      ssn: '789-01-2346',
      phone: '555-789-0123',
      streetAddress: '789 Investor Ave',
      city: 'Denver',
      state: 'CO',
      zipCode: '80210',
      employmentType: 'W2',
      annualIncome: 145000,
      monthlyDebt: 1800,
      creditScore: 'Fair (680-699)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 320000,
      propertyStreet: '101 Rental Property Ln',
      propertyCity: 'Aurora',
      propertyState: 'CO',
      propertyZip: '80012',
      occupancyType: 'Investment',
      productType: '30-Year Fixed'
    },
    expectedOutcome: 'DENIED - Investment property requires 700+ credit, applicant at 695'
  },

  // ============================================================================
  // SECTION 3: PRODUCT VARIATIONS (4 users)
  // ============================================================================
  {
    scenario: 'PRODUCT - 15-Year Fixed',
    email: 'product.15year@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Catherine',
      lastName: 'Wright',
      dob: '1978-06-25',
      ssn: '123-45-6790',
      phone: '555-123-4567',
      streetAddress: '100 Quick Payoff Dr',
      city: 'Boulder',
      state: 'CO',
      zipCode: '80301',
      employmentType: 'W2',
      annualIncome: 165000,
      monthlyDebt: 600,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 400000,
      propertyStreet: '200 Accelerated Equity Ct',
      propertyCity: 'Louisville',
      propertyState: 'CO',
      propertyZip: '80027',
      occupancyType: 'PrimaryResidence',
      productType: '15-Year Fixed'
    },
    expectedOutcome: 'APPROVED - 15-Year Fixed, higher payment but lower rate, 650 credit floor'
  },
  {
    scenario: 'PRODUCT - ARM F5 (5-Year Reset)',
    email: 'product.arm5@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Thomas',
      lastName: 'Baker',
      dob: '1982-09-12',
      ssn: '234-56-7801',
      phone: '555-234-5678',
      streetAddress: '300 Adjustable Rate Blvd',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      employmentType: 'W2',
      annualIncome: 145000,
      monthlyDebt: 700,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 520000,
      propertyStreet: '400 ARM Lane',
      propertyCity: 'Cherry Hills',
      propertyState: 'CO',
      propertyZip: '80113',
      occupancyType: 'PrimaryResidence',
      productType: 'ARM F5 (5-Year Reset)'
    },
    expectedOutcome: 'APPROVED - ARM F5, DTI cap 43%, qualifying rate = max(fully indexed, note+100bps)'
  },
  {
    scenario: 'PRODUCT - ARM F1 (1-Year Reset)',
    email: 'product.arm1@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Rebecca',
      lastName: 'Hill',
      dob: '1985-12-03',
      ssn: '345-67-8912',
      phone: '555-345-6789',
      streetAddress: '500 Short Term View',
      city: 'Denver',
      state: 'CO',
      zipCode: '80203',
      employmentType: 'W2',
      annualIncome: 178000,
      monthlyDebt: 800,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 480000,
      propertyStreet: '600 One Year ARM Dr',
      propertyCity: 'Greenwood Village',
      propertyState: 'CO',
      propertyZip: '80111',
      occupancyType: 'PrimaryResidence',
      productType: 'ARM F1 (1-Year Reset)'
    },
    expectedOutcome: 'APPROVED - ARM F1, tighter DTI 41%, 1.5x reserves required'
  },
  {
    scenario: 'PRODUCT - Second Home Purchase',
    email: 'occupancy.secondhome@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'William',
      lastName: 'Scott',
      dob: '1972-03-18',
      ssn: '456-78-9023',
      phone: '555-456-7890',
      streetAddress: '700 Primary Residence Rd',
      city: 'Denver',
      state: 'CO',
      zipCode: '80206',
      employmentType: 'W2',
      annualIncome: 185000,
      monthlyDebt: 1500,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 450000,
      propertyStreet: '800 Mountain Retreat Way',
      propertyCity: 'Breckenridge',
      propertyState: 'CO',
      propertyZip: '80424',
      occupancyType: 'SecondHome',
      productType: '30-Year Fixed'
    },
    propertiesOwned: [
      {
        street: '700 Primary Residence Rd',
        city: 'Denver',
        state: 'CO',
        propertyValue: 650000,
        mortgageBalance: 380000,
        monthlyMortgagePayment: 2400
      }
    ],
    expectedOutcome: 'APPROVED - Second home, 660+ credit floor, 6 month reserves required'
  },

  // ============================================================================
  // SECTION 4: INCOME TYPE VARIATIONS (7 users)
  // ============================================================================
  {
    scenario: 'INCOME - 1099 Contractor',
    email: 'income.1099@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Jennifer',
      lastName: 'Moore',
      dob: '1984-05-08',
      ssn: '567-89-0134',
      phone: '555-567-8901',
      streetAddress: '900 Contractor Ct',
      city: 'Denver',
      state: 'CO',
      zipCode: '80204',
      employmentType: '1099',
      annualIncome: 125000,
      monthlyDebt: 550,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 380000,
      propertyStreet: '100 Freelance Way',
      propertyCity: 'Lakewood',
      propertyState: 'CO',
      propertyZip: '80226',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    income1099: true,
    expectedOutcome: 'APPROVED - 1099 contractor, requires 2 years 1099s + tax returns'
  },
  {
    scenario: 'INCOME - Variable/Commission W-2',
    email: 'income.commission@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Mark',
      lastName: 'Robinson',
      dob: '1981-10-22',
      ssn: '678-90-1245',
      phone: '555-678-9012',
      streetAddress: '200 Sales Rep Lane',
      city: 'Denver',
      state: 'CO',
      zipCode: '80205',
      employmentType: 'W2',
      annualIncome: 145000,
      monthlyDebt: 800,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 420000,
      propertyStreet: '300 Commission Check Dr',
      propertyCity: 'Westminster',
      propertyState: 'CO',
      propertyZip: '80030',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    variableIncome: true,
    expectedOutcome: 'APPROVED - Variable W-2, income averaged over 24 months per policy'
  },
  {
    scenario: 'INCOME - Multiple Sources (W-2 + 1099 + Rental)',
    email: 'income.multiple@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Elizabeth',
      lastName: 'Clark',
      dob: '1976-07-14',
      ssn: '789-01-2356',
      phone: '555-789-0123',
      streetAddress: '400 Diversified Income Blvd',
      city: 'Denver',
      state: 'CO',
      zipCode: '80210',
      employmentType: 'W2',
      annualIncome: 95000, // W-2 portion
      monthlyDebt: 1100,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 480000,
      propertyStreet: '500 Multiple Streams Ct',
      propertyCity: 'Cherry Hills',
      propertyState: 'CO',
      propertyZip: '80113',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    additionalIncome: [
      { type: '1099', amount: 35000, source: 'Consulting' },
      { type: 'Rental', amount: 24000, source: 'Investment Property' }
    ],
    expectedOutcome: 'APPROVED - Multiple income sources ($154k total), all verified separately'
  },
  {
    scenario: 'INCOME - Retirement/Pension',
    email: 'income.retired@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Robert',
      lastName: 'Lewis',
      dob: '1958-11-30',
      ssn: '890-12-3467',
      phone: '555-890-1234',
      streetAddress: '600 Golden Years Ave',
      city: 'Castle Rock',
      state: 'CO',
      zipCode: '80104',
      employmentType: 'Retired',
      annualIncome: 72000, // Pension + 401k distributions
      monthlyDebt: 300,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 280000,
      propertyStreet: '700 Retirement Community Dr',
      propertyCity: 'Parker',
      propertyState: 'CO',
      propertyZip: '80134',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    retirementIncome: [
      { type: 'Pension', amount: 48000 },
      { type: '401k Distribution', amount: 24000 }
    ],
    expectedOutcome: 'APPROVED - Retirement income, requires 36m continuance documentation'
  },
  {
    scenario: 'INCOME - Social Security Only',
    email: 'income.socialsecurity@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Dorothy',
      lastName: 'Walker',
      dob: '1955-04-20',
      ssn: '901-23-4578',
      phone: '555-901-2345',
      streetAddress: '800 SS Benefits Rd',
      city: 'Longmont',
      state: 'CO',
      zipCode: '80501',
      employmentType: 'Retired',
      annualIncome: 42000,
      monthlyDebt: 150,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',  // Widowed falls under Unmarried in URLA
      loanPurpose: 'Purchase',
      loanAmount: 165000,
      propertyStreet: '900 Fixed Income Lane',
      propertyCity: 'Longmont',
      propertyState: 'CO',
      propertyZip: '80503',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    socialSecurityIncome: 42000,
    expectedOutcome: 'APPROVED - Social Security only, stable fixed income, low debt'
  },
  {
    scenario: 'INCOME - Alimony/Child Support',
    email: 'income.alimony@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Susan',
      lastName: 'Hall',
      dob: '1980-08-15',
      ssn: '012-34-5689',
      phone: '555-012-3456',
      streetAddress: '100 Support Income Ave',
      city: 'Denver',
      state: 'CO',
      zipCode: '80209',
      employmentType: 'W2',
      annualIncome: 65000,
      monthlyDebt: 400,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',  // Divorced falls under Unmarried in URLA
      loanPurpose: 'Purchase',
      loanAmount: 320000,
      propertyStreet: '200 New Beginning Ct',
      propertyCity: 'Englewood',
      propertyState: 'CO',
      propertyZip: '80110',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    otherIncome: [
      { type: 'Alimony', monthlyAmount: 2000, yearsRemaining: 5 },
      { type: 'ChildSupport', monthlyAmount: 1500, yearsRemaining: 8 }
    ],
    expectedOutcome: 'APPROVED - Other income counted with 36m+ continuance, total $107k/year'
  },
  {
    scenario: 'EDGE - Recent Job Change (<24 months)',
    email: 'edge.newjob@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Brian',
      lastName: 'Young',
      dob: '1989-02-28',
      ssn: '123-45-6701',
      phone: '555-123-4567',
      streetAddress: '300 Career Change Blvd',
      city: 'Denver',
      state: 'CO',
      zipCode: '80203',
      employmentType: 'W2',
      annualIncome: 95000,
      monthlyDebt: 450,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 340000,
      propertyStreet: '400 New Opportunity Dr',
      propertyCity: 'Lakewood',
      propertyState: 'CO',
      propertyZip: '80226',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    employment: {
      currentEmployerMonths: 10,
      sameFieldYears: 5,
      previousEmployerYears: 4
    },
    expectedOutcome: 'CONDITIONAL - <24 months at job but same field, requires LOE and offer letter'
  },

  // ============================================================================
  // SECTION 5: EDGE CASES / SPECIAL SCENARIOS (16 users)
  // ============================================================================
  {
    scenario: 'EDGE - Investment Property',
    email: 'edge.investment@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'David',
      lastName: 'Park',
      dob: '1978-04-12',
      ssn: '123-45-6789',
      phone: '555-888-9999',
      streetAddress: '777 Landlord Lane',
      city: 'Denver',
      state: 'CO',
      zipCode: '80210',
      employmentType: 'W2',
      annualIncome: 145000,
      monthlyDebt: 2800,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 280000,
      propertyStreet: '999 Rental Income Rd',
      propertyCity: 'Aurora',
      propertyState: 'CO',
      propertyZip: '80012',
      occupancyType: 'Investment',
      productType: '30-Year Fixed',
      expectedMonthlyRentalIncome: 2200
    },
    propertiesOwned: [
      { street: '777 Landlord Lane', city: 'Denver', state: 'CO', propertyValue: 450000, mortgageBalance: 280000, monthlyMortgagePayment: 1800 },
      { street: '888 Second Property', city: 'Denver', state: 'CO', propertyValue: 320000, mortgageBalance: 200000, monthlyMortgagePayment: 1400 }
    ],
    expectedOutcome: 'APPROVED WITH CONDITIONS - Investment property, 700+ credit, 25% down, 6m reserves'
  },
  {
    scenario: 'EDGE - Refinance Scenario',
    email: 'edge.refinance@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Jennifer',
      lastName: 'White',
      dob: '1970-11-28',
      ssn: '234-56-7890',
      phone: '555-999-0000',
      streetAddress: '456 Lower Rate Dr',
      city: 'Highlands Ranch',
      state: 'CO',
      zipCode: '80129',
      employmentType: 'W2',
      annualIncome: 92000,
      monthlyDebt: 800,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Refinance',
      loanAmount: 285000,
      propertyStreet: '456 Lower Rate Dr',
      propertyCity: 'Highlands Ranch',
      propertyState: 'CO',
      propertyZip: '80129',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed',
      currentPropertyValue: 425000
    },
    propertiesOwned: [
      { street: '456 Lower Rate Dr', city: 'Highlands Ranch', state: 'CO', propertyValue: 425000, mortgageBalance: 285000, monthlyMortgagePayment: 1850, currentInterestRate: 6.5 }
    ],
    expectedOutcome: 'APPROVED - Rate/term refinance, LTV ~67%, DTI ~39%'
  },
  {
    scenario: 'EDGE - Gift Funds for Down Payment',
    email: 'edge.giftfunds@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Emily',
      lastName: 'Garcia',
      dob: '1993-06-14',
      ssn: '345-67-8901',
      phone: '555-000-1111',
      streetAddress: '123 First Time Buyer St',
      city: 'Westminster',
      state: 'CO',
      zipCode: '80030',
      employmentType: 'W2',
      annualIncome: 72000,
      monthlyDebt: 350,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 240000,
      propertyStreet: '789 Starter Home Ct',
      propertyCity: 'Thornton',
      propertyState: 'CO',
      propertyZip: '80229',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    assets: [
      { type: 'Checking', institution: 'Local Credit Union', balance: 8500 },
      { type: 'Savings', institution: 'Local Credit Union', balance: 12000 }
    ],
    giftsGrants: [
      { assetType: 'CashGift', source: 'Relative', valueAmount: 35000, deposited: true }
    ],
    expectedOutcome: 'APPROVED - First-time buyer, DTI ~38%, gift letter required from parents'
  },
  {
    scenario: 'EDGE - Non-Permanent Resident Alien',
    email: 'edge.nonresident@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Hiroshi',
      lastName: 'Tanaka',
      dob: '1989-02-20',
      ssn: '456-78-9012',
      phone: '555-111-0000',
      streetAddress: '500 Work Visa Way',
      city: 'Denver',
      state: 'CO',
      zipCode: '80203',
      employmentType: 'W2',
      annualIncome: 135000,
      monthlyDebt: 400,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'NonPermanentResidentAlien',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 420000,
      propertyStreet: '600 Tech Hub Blvd',
      propertyCity: 'Denver',
      propertyState: 'CO',
      propertyZip: '80202',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    visaInfo: {
      visaType: 'H-1B',
      expirationDate: '2027-06-30'
    },
    expectedOutcome: 'CONDITIONAL - DTI ~33%, requires work authorization verification'
  },
  {
    scenario: 'EDGE - Credit Score at Floor (640)',
    email: 'edge.creditfloor@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Marcus',
      lastName: 'Green',
      dob: '1987-03-15',
      ssn: '234-56-7812',
      phone: '555-234-5678',
      streetAddress: '111 Just Qualifying Ln',
      city: 'Denver',
      state: 'CO',
      zipCode: '80220',
      employmentType: 'W2',
      annualIncome: 78000,
      monthlyDebt: 450,
      creditScore: 'Fair (640)'  // Exactly at floor
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 265000,
      propertyStreet: '222 Minimum Score Dr',
      propertyCity: 'Aurora',
      propertyState: 'CO',
      propertyZip: '80011',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    actualCreditScore: 640,
    expectedOutcome: 'APPROVED - Credit exactly at 640 floor for primary residence'
  },
  {
    scenario: 'EDGE - Bankruptcy Seasoned (48+ months)',
    email: 'edge.bankruptcy@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Rachel',
      lastName: 'Turner',
      dob: '1983-09-22',
      ssn: '345-67-8923',
      phone: '555-345-6789',
      streetAddress: '333 Recovery Complete Ave',
      city: 'Lakewood',
      state: 'CO',
      zipCode: '80226',
      employmentType: 'W2',
      annualIncome: 82000,
      monthlyDebt: 400,
      creditScore: 'Fair (650-699)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 275000,
      propertyStreet: '444 Fresh Start Blvd',
      propertyCity: 'Westminster',
      propertyState: 'CO',
      propertyZip: '80030',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    declarations: {
      bankruptcyLast7yrs: true,
      bankruptcyChapters: 'Chapter 7',
      bankruptcyMonthsAgo: 52
    },
    expectedOutcome: 'APPROVED WITH CONDITIONS - BK discharged 52 months ago, meets 48mo requirement'
  },
  {
    scenario: 'EDGE - Foreclosure Seasoned (48+ months)',
    email: 'edge.foreclosure@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Kenneth',
      lastName: 'Hughes',
      dob: '1979-12-05',
      ssn: '456-78-9034',
      phone: '555-456-7890',
      streetAddress: '555 Second Chance Rd',
      city: 'Arvada',
      state: 'CO',
      zipCode: '80002',
      employmentType: 'W2',
      annualIncome: 95000,
      monthlyDebt: 550,
      creditScore: 'Fair (650-699)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 320000,
      propertyStreet: '666 New Beginning Dr',
      propertyCity: 'Golden',
      propertyState: 'CO',
      propertyZip: '80401',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    declarations: {
      foreclosureLast7yrs: true,
      foreclosureMonthsAgo: 50
    },
    expectedOutcome: 'APPROVED WITH CONDITIONS - Foreclosure 50 months ago, meets 48mo requirement'
  },
  {
    scenario: 'EDGE - DTI at Exactly 43%',
    email: 'edge.dti43@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Angela',
      lastName: 'King',
      dob: '1986-06-30',
      ssn: '567-89-0145',
      phone: '555-567-8901',
      streetAddress: '777 Edge Case Way',
      city: 'Denver',
      state: 'CO',
      zipCode: '80205',
      employmentType: 'W2',
      annualIncome: 84000,  // $7000/month gross
      monthlyDebt: 1010,    // Calculated to hit exactly 43% with housing
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 280000,
      propertyStreet: '888 On The Line Dr',
      propertyCity: 'Lakewood',
      propertyState: 'CO',
      propertyZip: '80226',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    expectedOutcome: 'APPROVED - DTI exactly at 43% cap, no margin for error'
  },
  {
    scenario: 'EDGE - Reserves at Minimum Floor',
    email: 'edge.reservesfloor@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Timothy',
      lastName: 'Evans',
      dob: '1984-01-18',
      ssn: '678-90-1256',
      phone: '555-678-9012',
      streetAddress: '999 Minimum Savings Ct',
      city: 'Aurora',
      state: 'CO',
      zipCode: '80012',
      employmentType: 'W2',
      annualIncome: 76000,
      monthlyDebt: 350,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 260000,
      propertyStreet: '100 Just Enough Blvd',
      propertyCity: 'Centennial',
      propertyState: 'CO',
      propertyZip: '80112',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    assets: [
      { type: 'Checking', institution: 'Bank of America', balance: 5500 },
      { type: 'Savings', institution: 'Bank of America', balance: 8200 }
    ],
    expectedOutcome: 'APPROVED - Reserves exactly at 2 month PITIA minimum for primary residence'
  },
  {
    scenario: 'EDGE - Large Deposits Requiring Documentation',
    email: 'edge.largedeposit@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Nicole',
      lastName: 'Phillips',
      dob: '1988-07-25',
      ssn: '789-01-2367',
      phone: '555-789-0123',
      streetAddress: '200 Big Deposit Dr',
      city: 'Denver',
      state: 'CO',
      zipCode: '80206',
      employmentType: 'W2',
      annualIncome: 95000,
      monthlyDebt: 500,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 340000,
      propertyStreet: '300 Source Required Lane',
      propertyCity: 'Westminster',
      propertyState: 'CO',
      propertyZip: '80030',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    largeDeposits: [
      { amount: 55000, date: '2025-10-15', source: 'Bonus from employer', documented: true }
    ],
    expectedOutcome: 'CONDITIONAL - $55k deposit requires source documentation (bonus letter)'
  },
  {
    scenario: 'EDGE - High Credit Utilization (>80%)',
    email: 'edge.highutilization@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Jason',
      lastName: 'Campbell',
      dob: '1985-04-12',
      ssn: '890-12-3478',
      phone: '555-890-1234',
      streetAddress: '400 Maxed Out Blvd',
      city: 'Denver',
      state: 'CO',
      zipCode: '80210',
      employmentType: 'W2',
      annualIncome: 115000,
      monthlyDebt: 850,
      creditScore: 'Fair (650-699)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 380000,
      propertyStreet: '500 Utilization Check Dr',
      propertyCity: 'Lakewood',
      propertyState: 'CO',
      propertyZip: '80226',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    liabilities: [
      { type: 'Revolving', company: 'Chase', balance: 18000, limit: 20000, monthlyPayment: 450 },
      { type: 'Revolving', company: 'Discover', balance: 7500, limit: 8000, monthlyPayment: 200 }
    ],
    expectedOutcome: 'APPROVED WITH FLAG - High utilization (88%) flagged but DTI within limits'
  },
  {
    scenario: 'EDGE - NSF Incidents on Bank Statements',
    email: 'edge.nsf@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Melissa',
      lastName: 'Roberts',
      dob: '1990-11-08',
      ssn: '901-23-4589',
      phone: '555-901-2345',
      streetAddress: '600 Overdraft Ave',
      city: 'Aurora',
      state: 'CO',
      zipCode: '80015',
      employmentType: 'W2',
      annualIncome: 72000,
      monthlyDebt: 400,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 255000,
      propertyStreet: '700 Account Health Ct',
      propertyCity: 'Centennial',
      propertyState: 'CO',
      propertyZip: '80112',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    bankAccountIssues: {
      nsfIncidents: 2,
      overdrafts: 3
    },
    expectedOutcome: 'CONDITIONAL - NSF incidents flagged, account health assessment required'
  },
  {
    scenario: 'EDGE - Student Loans in Deferment',
    email: 'edge.deferredloans@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Ryan',
      lastName: 'Collins',
      dob: '1992-03-22',
      ssn: '012-34-5690',
      phone: '555-012-3456',
      streetAddress: '800 Grad School Rd',
      city: 'Boulder',
      state: 'CO',
      zipCode: '80302',
      employmentType: 'W2',
      annualIncome: 85000,
      monthlyDebt: 250,  // Current payment is $0 due to deferment
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Unmarried',
      loanPurpose: 'Purchase',
      loanAmount: 310000,
      propertyStreet: '900 IBR Plan Way',
      propertyCity: 'Denver',
      propertyState: 'CO',
      propertyZip: '80203',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    liabilities: [
      { type: 'StudentLoan', company: 'Navient', balance: 85000, monthlyPayment: 0, inDeferment: true, ibrPayment: 425 }
    ],
    expectedOutcome: 'APPROVED - Deferred loans counted at 1% of balance or IBR payment for DTI'
  },
  {
    scenario: 'EDGE - Multiple REO Properties (+2m per financed)',
    email: 'edge.multiplereo@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Steven',
      lastName: 'Peterson',
      dob: '1974-08-14',
      ssn: '123-45-6712',
      phone: '555-123-4567',
      streetAddress: '100 Portfolio Manager Blvd',
      city: 'Denver',
      state: 'CO',
      zipCode: '80206',
      employmentType: 'W2',
      annualIncome: 225000,
      monthlyDebt: 5500,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 380000,
      propertyStreet: '200 Fourth Investment Ct',
      propertyCity: 'Aurora',
      propertyState: 'CO',
      propertyZip: '80012',
      occupancyType: 'Investment',
      productType: '30-Year Fixed'
    },
    propertiesOwned: [
      { street: '100 Portfolio Manager Blvd', city: 'Denver', propertyValue: 750000, mortgageBalance: 420000, monthlyMortgagePayment: 2800 },
      { street: '150 Rental One', city: 'Aurora', propertyValue: 380000, mortgageBalance: 280000, monthlyMortgagePayment: 1900 },
      { street: '175 Rental Two', city: 'Lakewood', propertyValue: 350000, mortgageBalance: 260000, monthlyMortgagePayment: 1750 }
    ],
    expectedOutcome: 'APPROVED - 3 financed properties = 6m base + 6m REO reserves required'
  },
  // Note: DPA programs not supported in Danish realkredit style - edge.dpa@test.com removed
  {
    scenario: 'EDGE - Seller Concessions (3%)',
    email: 'edge.sellerconcession@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Laura',
      lastName: 'Morris',
      dob: '1988-10-15',
      ssn: '345-67-8934',
      phone: '555-345-6789',
      streetAddress: '500 Negotiation Lane',
      city: 'Lakewood',
      state: 'CO',
      zipCode: '80226',
      employmentType: 'W2',
      annualIncome: 88000,
      monthlyDebt: 450,
      creditScore: 'Good (700-749)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 315000,
      propertyStreet: '600 Closing Cost Credit Ct',
      propertyCity: 'Westminster',
      propertyState: 'CO',
      propertyZip: '80030',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    sellerConcessions: {
      amount: 9450,  // 3% of purchase price
      percentage: 3
    },
    expectedOutcome: 'APPROVED - 3% seller concession for closing costs, within limits'
  },
  {
    scenario: 'EDGE - Property in Revocable Trust',
    email: 'edge.trust@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Richard',
      lastName: 'Nelson',
      dob: '1968-07-22',
      ssn: '456-78-9045',
      phone: '555-456-7890',
      streetAddress: '700 Estate Planning Dr',
      city: 'Cherry Hills',
      state: 'CO',
      zipCode: '80113',
      employmentType: 'W2',
      annualIncome: 195000,
      monthlyDebt: 1200,
      creditScore: 'Excellent (750+)'
    },
    urla: {
      citizenship: 'USCitizen',
      maritalStatus: 'Married',
      loanPurpose: 'Purchase',
      loanAmount: 650000,
      propertyStreet: '800 Trust Ownership Way',
      propertyCity: 'Greenwood Village',
      propertyState: 'CO',
      propertyZip: '80111',
      occupancyType: 'PrimaryResidence',
      productType: '30-Year Fixed'
    },
    trustInfo: {
      trustName: 'Nelson Family Revocable Trust',
      trustType: 'Revocable Living Trust',
      trustorOccupies: true
    },
    expectedOutcome: 'APPROVED - Revocable trust with trustor as occupant, standard underwriting'
  },
  {
    scenario: 'STAGE 1 - Pre-Approval Only',
    email: 'stage1.preapproval@test.com',
    password: 'Test123!',
    preApproval: {
      firstName: 'Matthew',
      lastName: 'Richardson',
      dob: '1991-12-08',
      ssn: '567-89-0156',
      phone: '555-567-8901',
      streetAddress: '900 Shopping Mode Ave',
      city: 'Denver',
      state: 'CO',
      zipCode: '80203',
      employmentType: 'W2',
      annualIncome: 95000,
      monthlyDebt: 550,
      creditScore: 'Good (700-749)'
    },
    // NO URLA - Stage 1 only, no property yet
    stageOneOnly: true,
    expectedOutcome: 'PRE-APPROVED - Stage 1 only, max loan ~$350k, ready to shop'
  }
];

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedTestData() {
  let pool;
  
  try {
    console.log('🔄 Connecting to database...');
    pool = await getConnection();
    console.log('✅ Connected to database\n');

    console.log('='.repeat(70));
    console.log('📊 SEEDING 44 COMPREHENSIVE TEST USERS');
    console.log('='.repeat(70) + '\n');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of TEST_USERS) {
      console.log(`📝 ${user.scenario}`);
      console.log(`   Email: ${user.email}`);
      
      try {
        // 1. Create User
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        const existingUser = await pool.request()
          .input('email', sql.VarChar, user.email)
          .query('SELECT UserID FROM Users WHERE Email = @email');
        
        let userId;
        if (existingUser.recordset.length > 0) {
          userId = existingUser.recordset[0].UserID;
          console.log(`   ⏭️  User already exists (ID: ${userId})`);
          skipped++;
        } else {
          const userResult = await pool.request()
            .input('email', sql.VarChar, user.email)
            .input('password', sql.VarChar, hashedPassword)
            .query('INSERT INTO Users (Email, Password) OUTPUT INSERTED.UserID VALUES (@email, @password)');
          userId = userResult.recordset[0].UserID;
          console.log(`   ✅ Created user (ID: ${userId})`);
          created++;
        }

        // 2. Create Pre-Approval Application
        const preApproval = user.preApproval;
        const applicationData = JSON.stringify({
          step1: {
            firstName: preApproval.firstName,
            lastName: preApproval.lastName,
            dob: preApproval.dob,
            email: user.email,
            phone: preApproval.phone
          },
          step3: {
            streetAddress: preApproval.streetAddress,
            city: preApproval.city,
            state: preApproval.state,
            zipCode: preApproval.zipCode
          },
          step4: {
            ssn: preApproval.ssn
          },
          step5: {
            employmentType: preApproval.employmentType,
            annualIncome: preApproval.annualIncome,
            monthlyDebt: preApproval.monthlyDebt,
            creditScore: preApproval.creditScore
          }
        });

        const monthlyIncome = preApproval.annualIncome / 12;
        const maxMonthlyPayment = (monthlyIncome * 0.43) - preApproval.monthlyDebt;
        const preApprovedAmount = Math.max(0, Math.round(maxMonthlyPayment * 200));

        const existingPreApproval = await pool.request()
          .input('UserID', sql.Int, userId)
          .query('SELECT TOP 1 UserID FROM PreApprovalApplications WHERE UserID = @UserID');
        
        if (existingPreApproval.recordset.length === 0) {
          await pool.request()
            .input('UserID', sql.Int, userId)
            .input('ApplicationData', sql.NVarChar(sql.MAX), applicationData)
            .input('PreApprovedAmount', sql.Decimal(19, 2), preApprovedAmount)
            .input('CalculationParams', sql.NVarChar(sql.MAX), JSON.stringify({
              annualIncome: preApproval.annualIncome,
              monthlyDebt: preApproval.monthlyDebt,
              creditScore: preApproval.creditScore
            }))
            .query(`
              INSERT INTO PreApprovalApplications (UserID, ApplicationData, PreApprovedAmount, CalculationParams)
              VALUES (@UserID, @ApplicationData, @PreApprovedAmount, @CalculationParams)
            `);
          console.log(`   📋 Pre-approval: $${preApprovedAmount.toLocaleString()}`);
        }

        // 3. Create URLA Application Data (if not Stage 1 only)
        if (user.urla && !user.stageOneOnly) {
          const existingApp = await pool.request()
            .input('user_id', sql.BigInt, userId)
            .query('SELECT TOP 1 id FROM loan_applications WHERE user_id = @user_id');
          
          if (existingApp.recordset.length === 0) {
            // Create borrower
            const borrowerResult = await pool.request()
              .input('first_name', sql.NVarChar(100), preApproval.firstName)
              .input('last_name', sql.NVarChar(100), preApproval.lastName)
              .input('dob', sql.Date, preApproval.dob)
              .input('ssn_last4', sql.NChar(4), preApproval.ssn.slice(-4))
              .input('citizenship_status', sql.NVarChar(40), user.urla.citizenship)
              .input('marital_status', sql.NVarChar(20), user.urla.maritalStatus)
              .input('email', sql.NVarChar(254), user.email)
              .input('cell_phone', sql.NVarChar(25), preApproval.phone)
              .query(`
                INSERT INTO borrowers (first_name, last_name, dob, ssn_last4, citizenship_status, marital_status, email, cell_phone)
                OUTPUT INSERTED.id
                VALUES (@first_name, @last_name, @dob, @ssn_last4, @citizenship_status, @marital_status, @email, @cell_phone)
              `);
            const borrowerId = borrowerResult.recordset[0].id;
            
            // Create loan application
            const typeOfCredit = user.coBorrower ? 'Joint' : 'Individual';
            const productType = user.urla.productType || '30-Year Fixed';
            const loanAppResult = await pool.request()
              .input('user_id', sql.BigInt, userId)
              .input('type_of_credit', sql.NVarChar(20), typeOfCredit)
              .input('loan_purpose', sql.NVarChar(20), user.urla.loanPurpose)
              .input('loan_term_months', sql.Int, productType.includes('15') ? 180 : 360)
              .input('loan_type', sql.NVarChar(100), productType)
              .input('application_status', sql.NVarChar(50), 'Submitted')
              .query(`
                INSERT INTO loan_applications (user_id, type_of_credit, loan_purpose, loan_term_months, loan_type, application_status)
                OUTPUT INSERTED.id
                VALUES (@user_id, @type_of_credit, @loan_purpose, @loan_term_months, @loan_type, @application_status)
              `);
            const applicationId = loanAppResult.recordset[0].id;
            
            // Link borrower to application
            await pool.request()
              .input('application_id', sql.BigInt, applicationId)
              .input('borrower_id', sql.BigInt, borrowerId)
              .input('borrower_role', sql.NVarChar(20), 'Primary')
              .query(`INSERT INTO application_borrowers (application_id, borrower_id, borrower_role) VALUES (@application_id, @borrower_id, @borrower_role)`);
            
            // Create address
            await pool.request()
              .input('borrower_id', sql.BigInt, borrowerId)
              .input('address_type', sql.NVarChar(20), 'Current')
              .input('street', sql.NVarChar(255), preApproval.streetAddress)
              .input('city', sql.NVarChar(100), preApproval.city)
              .input('state', sql.NVarChar(50), preApproval.state)
              .input('zip', sql.NVarChar(20), preApproval.zipCode)
              .input('country', sql.NVarChar(100), 'USA')
              .input('housing_type', sql.NVarChar(40), 'Rent')
              .query(`INSERT INTO borrower_addresses (borrower_id, address_type, street, city, state, zip, country, housing_type) VALUES (@borrower_id, @address_type, @street, @city, @state, @zip, @country, @housing_type)`);
            
            // Create subject property
            const occupancyIntent = user.urla.occupancyType === 'Investment' ? 'Investment' : 
                                    user.urla.occupancyType === 'SecondHome' ? 'SecondHome' : 'PrimaryResidence';
            await pool.request()
              .input('application_id', sql.BigInt, applicationId)
              .input('loan_amount', sql.Decimal(19, 2), user.urla.loanAmount)
              .input('loan_purpose', sql.NVarChar(20), user.urla.loanPurpose)
              .input('street', sql.NVarChar(255), user.urla.propertyStreet)
              .input('city', sql.NVarChar(100), user.urla.propertyCity)
              .input('state', sql.NVarChar(50), user.urla.propertyState)
              .input('zip', sql.NVarChar(20), user.urla.propertyZip)
              .input('occupancy_intent', sql.NVarChar(20), occupancyIntent)
              .query(`INSERT INTO subject_property (application_id, loan_amount_amount, loan_purpose, street, city, state, zip, occupancy_intent) VALUES (@application_id, @loan_amount, @loan_purpose, @street, @city, @state, @zip, @occupancy_intent)`);
            
            // Create employment
            const isSelfEmployed = preApproval.employmentType === 'SelfEmployed' || preApproval.employmentType === 'Self-Employed';
            await pool.request()
              .input('borrower_id', sql.BigInt, borrowerId)
              .input('employment_category', sql.NVarChar(20), 'Current')
              .input('employer_name', sql.NVarChar(255), isSelfEmployed ? 'Self-Employed' : 'Current Employer')
              .input('position_title', sql.NVarChar(100), isSelfEmployed ? 'Business Owner' : 'Employee')
              .input('business_owner_or_self_employed', sql.Bit, isSelfEmployed ? 1 : 0)
              .query(`INSERT INTO borrower_employments (borrower_id, employment_category, employer_name, position_title, business_owner_or_self_employed) VALUES (@borrower_id, @employment_category, @employer_name, @position_title, @business_owner_or_self_employed)`);
            
            console.log(`   📄 URLA Application: ID ${applicationId}`);
          }
        }

        console.log(`   📌 Expected: ${user.expectedOutcome}\n`);

      } catch (userError) {
        console.error(`   ❌ Error: ${userError.message}\n`);
        errors++;
      }
    }

    // Print Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SEEDING COMPLETE');
    console.log('='.repeat(70));
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors:  ${errors}`);
    console.log(`   📋 Total:   ${TEST_USERS.length}`);
    console.log('\n🔑 All test accounts use password: Test123!\n');

    // Print categories
    console.log('📁 TEST USER CATEGORIES:');
    console.log('─'.repeat(50));
    console.log('APPROVED (8 users):');
    TEST_USERS.filter(u => u.email.startsWith('approved.') || u.email.startsWith('borrower.') || u.email.startsWith('coborrower.')).forEach(u => console.log(`  • ${u.email}`));
    console.log('\nDENIED (9 users):');
    TEST_USERS.filter(u => u.email.startsWith('denied.')).forEach(u => console.log(`  • ${u.email}`));
    console.log('\nPRODUCT VARIATIONS (4 users):');
    TEST_USERS.filter(u => u.email.startsWith('product.') || u.email.startsWith('occupancy.')).forEach(u => console.log(`  • ${u.email}`));
    console.log('\nINCOME TYPES (7 users):');
    TEST_USERS.filter(u => u.email.startsWith('income.')).forEach(u => console.log(`  • ${u.email}`));
    console.log('\nEDGE CASES (16 users):');
    TEST_USERS.filter(u => u.email.startsWith('edge.') || u.email.startsWith('stage1.')).forEach(u => console.log(`  • ${u.email}`));
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

// Run the seeder
seedTestData();
