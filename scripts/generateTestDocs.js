/**
 * Test Document Generator
 * 
 * Generates sample PDF documents for testing the mortgage application.
 * Documents are clearly marked as "SAMPLE - FOR TESTING ONLY"
 * 
 * Required: npm install pdfkit
 * Run: node scripts/generateTestDocs.js
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create output directory
const OUTPUT_DIR = path.join(__dirname, '../test-documents');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Test applicant profiles for document generation
const APPLICANTS = {
  'approved-w2': {
    name: 'Michael Johnson',
    ssn: 'XXX-XX-3333',
    dob: '1985-03-15',
    address: '123 Success Lane, Denver, CO 80202',
    employer: 'TechCorp Solutions Inc.',
    employerAddress: '1000 Innovation Way, Denver, CO 80202',
    ein: '12-3456789',
    annualSalary: 125000,
    startDate: '2019-03-15',
    position: 'Senior Software Engineer',
    // Liabilities - $500/month total
    liabilities: {
      creditCard: { company: 'Chase Visa', balance: 4000, monthlyPayment: 150, limit: 10000 },
      autoLoan: { lender: 'Ford Credit', balance: 20000, monthlyPayment: 350, vehicle: '2022 Ford Escape' }
    },
    purchaseInfo: {
      propertyAddress: '456 Dream Home Dr, Boulder, CO 80301',
      purchasePrice: 550000,
      loanAmount: 450000
    }
  },
  'approved-dual': {
    name: 'Sarah Williams',
    ssn: 'XXX-XX-4444',
    dob: '1988-07-22',
    address: '789 Partner Ave, Aurora, CO 80010',
    employer: 'Healthcare Partners LLC',
    employerAddress: '500 Medical Center Dr, Aurora, CO 80010',
    ein: '23-4567890',
    annualSalary: 95000,
    startDate: '2020-06-01',
    position: 'Registered Nurse Manager',
    coBorrower: {
      name: 'David Williams',
      ssn: 'XXX-XX-5555',
      dob: '1986-11-10',
      employer: 'Metro Construction Inc.',
      annualSalary: 85000,
      position: 'Project Manager'
    },
    // Liabilities - $800/month total
    liabilities: {
      autoLoan: { lender: 'Honda Financial', balance: 18000, monthlyPayment: 500, vehicle: '2022 Honda CR-V' },
      creditCard: { company: 'Discover', balance: 4500, monthlyPayment: 200, limit: 8000 },
      studentLoan: { servicer: 'Great Lakes', balance: 12000, monthlyPayment: 100 }
    },
    purchaseInfo: {
      propertyAddress: '321 Family Way, Lakewood, CO 80226',
      purchasePrice: 475000,
      loanAmount: 380000
    }
  },
  'approved-selfemployed': {
    name: 'Robert Chen',
    ssn: 'XXX-XX-6666',
    dob: '1975-01-30',
    address: '555 Entrepreneur Blvd, Denver, CO 80205',
    businessName: 'Chen Consulting Group',
    businessAddress: '555 Entrepreneur Blvd, Denver, CO 80205',
    ein: '34-5678901',
    annualRevenue: 320000,
    netProfit: 175000,
    businessStartDate: '2018-01-01',
    // Liabilities - $1,200/month total
    liabilities: {
      autoLoan: { lender: 'BMW Financial Services', balance: 42000, monthlyPayment: 750, vehicle: '2023 BMW X5' },
      creditCard: { company: 'Chase Sapphire Reserve', balance: 6500, monthlyPayment: 250, limit: 25000 },
      creditCard2: { company: 'Amex Platinum', balance: 4000, monthlyPayment: 200, limit: 30000 }
    },
    purchaseInfo: {
      propertyAddress: '888 Executive Ct, Cherry Hills, CO 80113',
      purchasePrice: 700000,
      loanAmount: 550000
    }
  },
  // Note: VA loans not supported in Danish realkredit style - approved-veteran removed
  'denied-highdti': {
    name: 'Kevin Miller',
    ssn: 'XXX-XX-8888',
    dob: '1990-05-18',
    address: '999 Debt Street, Denver, CO 80219',
    employer: 'Retail Corp Inc.',
    employerAddress: '789 Commerce St, Denver, CO 80204',
    ein: '56-7890123',
    annualSalary: 55000,
    startDate: '2022-06-01',
    position: 'Store Manager',
    // High DTI scenario - lots of debt payments (ALL must be documented)
    liabilities: {
      creditCardA: { company: 'Capital One', balance: 15000, monthlyPayment: 450, limit: 18000 },
      creditCardB: { company: 'Discover', balance: 8000, monthlyPayment: 240, limit: 10000 },
      autoLoan: { lender: 'Toyota Financial', balance: 28000, monthlyPayment: 650, vehicle: '2021 Toyota Camry' },
      studentLoan: { servicer: 'Navient', balance: 45000, monthlyPayment: 550 }
    },
    purchaseInfo: {
      propertyAddress: '444 Wishful Thinking Ln, Denver, CO 80220',
      purchasePrice: 437500,
      loanAmount: 350000
    }
  },
  'denied-badcredit': {
    name: 'Lisa Thompson',
    ssn: 'XXX-XX-9999',
    dob: '1992-12-03',
    address: '222 Recovery Road, Englewood, CO 80110',
    employer: 'City Hospital',
    employerAddress: '1500 Health Blvd, Denver, CO 80206',
    ein: '67-8901234',
    annualSalary: 72000,
    startDate: '2020-03-01',
    position: 'Medical Technician',
    // Has documentation, but credit issues - $600/month total debt
    liabilities: {
      creditCard: { company: 'Wells Fargo', balance: 3500, monthlyPayment: 150, limit: 5000 },
      autoLoan: { lender: 'Santander', balance: 18000, monthlyPayment: 350, vehicle: '2019 Nissan Altima' },
      studentLoan: { servicer: 'Mohela', balance: 8000, monthlyPayment: 100 }
    },
    purchaseInfo: {
      propertyAddress: '333 Second Chance Dr, Littleton, CO 80120',
      purchasePrice: 275000,
      loanAmount: 220000
    }
  },
  'edge-investment': {
    name: 'David Park',
    ssn: 'XXX-XX-1111',
    dob: '1978-04-12',
    address: '777 Landlord Lane, Denver, CO 80210',
    employer: 'Investment Strategies LLC',
    employerAddress: '1200 Finance Ave, Denver, CO 80202',
    ein: '78-9012345',
    annualSalary: 145000,
    startDate: '2017-08-01',
    position: 'Portfolio Manager',
    // Investment property buyer - has rental income and existing mortgages
    rentalProperties: 2,
    monthlyRentalIncome: 3500,
    existingMortgages: [
      { property: '777 Landlord Lane, Denver, CO 80210', balance: 280000, payment: 1400, lender: 'Wells Fargo' },
      { property: '888 Second Property, Denver, CO 80211', balance: 200000, payment: 1100, lender: 'Chase Bank', rentalIncome: 2100 }
    ],
    // Consumer liabilities - $300/month (total monthly debt with mortgages = $2800)
    liabilities: {
      creditCard: { company: 'Chase Freedom', balance: 4000, monthlyPayment: 150, limit: 15000 },
      creditCard2: { company: 'Amex Gold', balance: 3000, monthlyPayment: 150, limit: 10000 }
    },
    purchaseInfo: {
      propertyAddress: '999 Rental Income Rd, Aurora, CO 80012',
      purchasePrice: 350000,
      loanAmount: 280000,  // 80% LTV on investment
      isInvestment: true
    }
  },
  'edge-refinance': {
    name: 'Jennifer White',
    ssn: 'XXX-XX-2222',
    dob: '1970-11-28',
    address: '456 Lower Rate Dr, Highlands Ranch, CO 80129',
    employer: 'Education First Academy',
    employerAddress: '800 Learning Lane, Boulder, CO 80301',
    ein: '89-0123456',
    annualSalary: 92000,
    startDate: '2015-09-01',
    position: 'Principal',
    // Refinance scenario - has existing mortgage to refinance
    currentMortgageBalance: 285000,
    currentMortgagePayment: 1850,
    currentInterestRate: 6.5,
    propertyValue: 425000,
    mortgageLender: 'Quicken Loans',
    isRefinance: true,  // No purchase agreement needed
    // Non-housing liabilities - $800/month total
    liabilities: {
      autoLoan: { lender: 'Honda Financial', balance: 15000, monthlyPayment: 400, vehicle: '2021 Honda Accord' },
      creditCard: { company: 'Citi Double Cash', balance: 5000, monthlyPayment: 200, limit: 12000 },
      creditCard2: { company: 'Target RedCard', balance: 2000, monthlyPayment: 100, limit: 5000 },
      studentLoan: { servicer: 'FedLoan', balance: 8000, monthlyPayment: 100 }
    }
  },
  'edge-giftfunds': {
    name: 'Emily Garcia',
    ssn: 'XXX-XX-8901',
    dob: '1993-06-14',
    address: '123 First Time Buyer St, Westminster, CO 80030',
    employer: 'Denver Media Group',
    employerAddress: '400 Marketing Way, Denver, CO 80202',
    ein: '11-2223334',
    annualSalary: 72000,
    startDate: '2021-03-15',
    position: 'Marketing Coordinator',
    // Gift funds scenario - needs gift letter
    personalAssets: 20500,  // Only $20.5k personal savings
    giftAmount: 35000,
    giftDonor: {
      name: 'Maria Garcia',
      relationship: 'Mother',
      address: '456 Generous Parent Lane, Denver, CO 80211'
    },
    // Liabilities - $350/month total (modest debt for first-time buyer)
    liabilities: {
      creditCard: { company: 'Bank of America', balance: 2200, monthlyPayment: 150, limit: 5000 },
      studentLoan: { servicer: 'Nelnet', balance: 18000, monthlyPayment: 200 }
    },
    purchaseInfo: {
      propertyAddress: '789 Starter Home Ct, Thornton, CO 80229',
      purchasePrice: 300000,
      loanAmount: 240000
    }
  },
  'edge-nonresident': {
    name: 'Hiroshi Tanaka',
    ssn: 'XXX-XX-9012',
    dob: '1989-02-20',
    address: '500 Work Visa Way, Denver, CO 80203',
    employer: 'Global Tech Partners',
    employerAddress: '2000 International Blvd, Denver, CO 80207',
    ein: '90-1234567',
    annualSalary: 135000,
    startDate: '2023-01-15',
    position: 'Senior Consultant',
    visaType: 'H-1B',
    visaExpiration: '2026-12-31',
    countryOfOrigin: 'Japan',
    usePassport: true,
    liabilities: {
      autoLoan: { lender: 'Toyota Financial', balance: 22000, monthlyPayment: 400, vehicle: '2024 Toyota Camry' }
    },
    purchaseInfo: {
      propertyAddress: '600 Tech Hub Blvd, Denver, CO 80202',
      purchasePrice: 525000,
      loanAmount: 420000
    }
  },
  
  // ============================================================================
  // NEW APPROVED SCENARIOS
  // ============================================================================
  
  'approved-conditional': {
    name: 'Patricia Nelson',
    ssn: 'XXX-XX-0123',
    dob: '1984-02-28',
    address: '234 Clearance Way, Arvada, CO 80002',
    employer: 'Mountain View Medical Center',
    employerAddress: '1500 Hospital Dr, Arvada, CO 80002',
    ein: '56-7890123',
    annualSalary: 88000,
    startDate: '2021-04-01',
    position: 'Clinical Manager',
    liabilities: {
      autoLoan: { lender: 'Honda Financial', balance: 15000, monthlyPayment: 350, vehicle: '2022 Honda Accord' },
      creditCard: { company: 'Capital One', balance: 4500, monthlyPayment: 150, limit: 8000 },
      studentLoan: { servicer: 'Navient', balance: 12000, monthlyPayment: 150 }
    },
    purchaseInfo: {
      propertyAddress: '567 Condition Met Ct, Westminster, CO 80031',
      purchasePrice: 400000,
      loanAmount: 320000
    }
  },
  
  'approved-plaid': {
    name: 'Andrew Mitchell',
    ssn: 'XXX-XX-9012',
    dob: '1987-06-15',
    address: '890 Fintech Ave, Denver, CO 80206',
    employer: 'Digital Banking Corp',
    employerAddress: '500 Tech Center, Denver, CO 80206',
    ein: '67-8901234',
    annualSalary: 105000,
    startDate: '2020-08-15',
    position: 'Product Manager',
    plaidVerified: true,
    liabilities: {
      autoLoan: { lender: 'Tesla Finance', balance: 28000, monthlyPayment: 450, vehicle: '2023 Tesla Model 3' }
    },
    purchaseInfo: {
      propertyAddress: '123 Digital Lane, Boulder, CO 80302',
      purchasePrice: 475000,
      loanAmount: 380000
    }
  },
  
  // Note: FHA loans not supported in Danish realkredit style - borrower-firsttime removed
  
  'coborrower-nonoccupant': {
    name: 'Michelle Taylor',
    ssn: 'XXX-XX-3456',
    dob: '1994-04-10',
    address: '111 Parent Help Dr, Denver, CO 80204',
    employer: 'City Government',
    employerAddress: '1437 Bannock St, Denver, CO 80202',
    ein: '89-0123456',
    annualSalary: 52000,
    startDate: '2021-09-01',
    position: 'Administrative Coordinator',
    coBorrower: {
      name: 'Richard Taylor',
      dob: '1965-08-25',
      annualSalary: 95000,
      employer: 'Taylor Enterprises',
      nonOccupant: true
    },
    liabilities: {
      creditCard: { company: 'Chase', balance: 2000, monthlyPayment: 100, limit: 5000 },
      studentLoan: { servicer: 'FedLoan', balance: 15000, monthlyPayment: 150 }
    },
    purchaseInfo: {
      propertyAddress: '222 Starter Home Ave, Aurora, CO 80011',
      purchasePrice: 350000,
      loanAmount: 280000
    }
  },
  
  // ============================================================================
  // NEW DENIED SCENARIOS
  // ============================================================================
  
  'denied-bankruptcyrecent': {
    name: 'Brandon Davis',
    ssn: 'XXX-XX-7891',
    dob: '1988-03-12',
    address: '444 Fresh Start Ln, Denver, CO 80221',
    employer: 'Metro Services Inc.',
    employerAddress: '1000 Business Park, Denver, CO 80221',
    ein: '23-4567891',
    annualSalary: 78000,
    startDate: '2023-01-15',
    position: 'Operations Manager',
    bankruptcyRecent: true,
    liabilities: {
      autoLoan: { lender: 'Santander', balance: 12000, monthlyPayment: 280, vehicle: '2020 Nissan Rogue' },
      creditCard: { company: 'Capital One Secured', balance: 500, monthlyPayment: 50, limit: 500 }
    },
    purchaseInfo: {
      propertyAddress: '555 Waiting Period Dr, Lakewood, CO 80228',
      purchasePrice: 345000,
      loanAmount: 275000
    }
  },
  
  'denied-lates30': {
    name: 'Amanda Wilson',
    ssn: 'XXX-XX-8902',
    dob: '1986-07-19',
    address: '666 Late Payment Blvd, Aurora, CO 80015',
    employer: 'Regional Healthcare',
    employerAddress: '2000 Medical Plaza, Aurora, CO 80015',
    ein: '34-5678902',
    annualSalary: 92000,
    startDate: '2019-04-01',
    position: 'Nursing Supervisor',
    isRefinance: true,
    currentMortgageBalance: 310000,
    currentMortgagePayment: 2100,
    currentInterestRate: 6.5,
    propertyValue: 420000,
    mortgageLender: 'Wells Fargo Home Mortgage',
    liabilities: {
      autoLoan: { lender: 'Chase Auto', balance: 18000, monthlyPayment: 400, vehicle: '2022 Chevy Equinox' },
      creditCard: { company: 'Discover', balance: 5000, monthlyPayment: 200, limit: 8000 }
    },
    purchaseInfo: {
      propertyAddress: '666 Late Payment Blvd, Aurora, CO 80015',
      purchasePrice: 420000,
      loanAmount: 310000
    }
  },
  
  'denied-lates60': {
    name: 'Christopher Martin',
    ssn: 'XXX-XX-9013',
    dob: '1983-11-08',
    address: '777 Delinquent Dr, Westminster, CO 80030',
    employer: 'Tech Solutions Corp',
    employerAddress: '500 Innovation Way, Westminster, CO 80030',
    ein: '45-6789013',
    annualSalary: 105000,
    startDate: '2018-06-01',
    position: 'Senior Developer',
    isRefinance: true,
    currentMortgageBalance: 380000,
    currentMortgagePayment: 2500,
    currentInterestRate: 6.75,
    propertyValue: 520000,
    mortgageLender: 'Chase Home Lending',
    liabilities: {
      autoLoan: { lender: 'BMW Financial', balance: 32000, monthlyPayment: 550, vehicle: '2023 BMW X3' },
      creditCard: { company: 'Amex', balance: 8000, monthlyPayment: 300, limit: 15000 }
    },
    purchaseInfo: {
      propertyAddress: '777 Delinquent Dr, Westminster, CO 80030',
      purchasePrice: 520000,
      loanAmount: 380000
    }
  },
  
  'denied-judgment': {
    name: 'Daniel Garcia',
    ssn: 'XXX-XX-0124',
    dob: '1985-04-22',
    address: '888 Legal Issues Way, Denver, CO 80205',
    employer: 'Construction Solutions LLC',
    employerAddress: '1200 Builder Blvd, Denver, CO 80205',
    ein: '56-7890124',
    annualSalary: 88000,
    startDate: '2020-02-01',
    position: 'Project Coordinator',
    liabilities: {
      autoLoan: { lender: 'Ford Credit', balance: 15000, monthlyPayment: 350, vehicle: '2021 Ford Ranger' },
      creditCard: { company: 'Wells Fargo', balance: 3500, monthlyPayment: 150, limit: 6000 }
    },
    purchaseInfo: {
      propertyAddress: '999 Resolution Pending Ave, Arvada, CO 80003',
      purchasePrice: 370000,
      loanAmount: 295000
    }
  },
  
  'denied-secondhomecredit': {
    name: 'Stephanie Lee',
    ssn: 'XXX-XX-1235',
    dob: '1979-08-30',
    address: '123 Primary Home St, Denver, CO 80206',
    employer: 'Financial Advisory Group',
    employerAddress: '1700 Broadway, Denver, CO 80202',
    ein: '67-8901235',
    annualSalary: 135000,
    startDate: '2017-03-01',
    position: 'Senior Financial Advisor',
    liabilities: {
      autoLoan: { lender: 'Mercedes-Benz Financial', balance: 45000, monthlyPayment: 750, vehicle: '2023 Mercedes GLC' },
      creditCard: { company: 'Chase Sapphire', balance: 8000, monthlyPayment: 300, limit: 20000 }
    },
    purchaseInfo: {
      propertyAddress: '456 Vacation Home Dr, Vail, CO 81657',
      purchasePrice: 440000,
      loanAmount: 350000,
      isSecondHome: true
    }
  },
  
  'denied-investmentcredit': {
    name: 'Gregory Adams',
    ssn: 'XXX-XX-2346',
    dob: '1977-02-14',
    address: '789 Investor Ave, Denver, CO 80210',
    employer: 'Adams Holdings LLC',
    employerAddress: '1500 Investment Dr, Denver, CO 80210',
    ein: '78-9012346',
    annualSalary: 145000,
    startDate: '2016-01-01',
    position: 'Managing Partner',
    existingMortgages: [
      { property: '789 Investor Ave, Denver, CO 80210', balance: 320000, payment: 2100, lender: 'Wells Fargo' }
    ],
    liabilities: {
      autoLoan: { lender: 'Lexus Financial', balance: 38000, monthlyPayment: 600, vehicle: '2024 Lexus RX' },
      creditCard: { company: 'Amex Platinum', balance: 6000, monthlyPayment: 250, limit: 25000 }
    },
    purchaseInfo: {
      propertyAddress: '101 Rental Property Ln, Aurora, CO 80012',
      purchasePrice: 400000,
      loanAmount: 320000,
      isInvestment: true
    }
  },
  
  // ============================================================================
  // PRODUCT VARIATIONS
  // ============================================================================
  
  'product-15year': {
    name: 'Catherine Wright',
    ssn: 'XXX-XX-6790',
    dob: '1978-06-25',
    address: '100 Quick Payoff Dr, Boulder, CO 80301',
    employer: 'University of Colorado',
    employerAddress: '1100 14th St, Boulder, CO 80302',
    ein: '12-3456790',
    annualSalary: 165000,
    startDate: '2014-08-15',
    position: 'Professor of Engineering',
    liabilities: {
      autoLoan: { lender: 'Audi Financial', balance: 25000, monthlyPayment: 450, vehicle: '2023 Audi Q5' },
      creditCard: { company: 'Chase Freedom Unlimited', balance: 3000, monthlyPayment: 150, limit: 15000 }
    },
    purchaseInfo: {
      propertyAddress: '200 Accelerated Equity Ct, Louisville, CO 80027',
      purchasePrice: 500000,
      loanAmount: 400000
    }
  },
  
  'product-arm5': {
    name: 'Thomas Baker',
    ssn: 'XXX-XX-7801',
    dob: '1982-09-12',
    address: '300 Adjustable Rate Blvd, Denver, CO 80202',
    employer: 'Investment Banking Partners',
    employerAddress: '1801 California St, Denver, CO 80202',
    ein: '23-4567801',
    annualSalary: 145000,
    startDate: '2019-01-15',
    position: 'Vice President',
    liabilities: {
      autoLoan: { lender: 'Porsche Financial', balance: 55000, monthlyPayment: 850, vehicle: '2024 Porsche Cayenne' }
    },
    purchaseInfo: {
      propertyAddress: '400 ARM Lane, Cherry Hills, CO 80113',
      purchasePrice: 650000,
      loanAmount: 520000
    }
  },
  
  'product-arm1': {
    name: 'Rebecca Hill',
    ssn: 'XXX-XX-8912',
    dob: '1985-12-03',
    address: '500 Short Term View, Denver, CO 80203',
    employer: 'Tech Startups Inc.',
    employerAddress: '2000 Startup Way, Denver, CO 80203',
    ein: '34-5678912',
    annualSalary: 178000,
    startDate: '2021-06-01',
    position: 'Chief Technology Officer',
    liabilities: {
      autoLoan: { lender: 'Tesla Finance', balance: 48000, monthlyPayment: 800, vehicle: '2024 Tesla Model S' }
    },
    purchaseInfo: {
      propertyAddress: '600 One Year ARM Dr, Greenwood Village, CO 80111',
      purchasePrice: 600000,
      loanAmount: 480000
    }
  },
  
  'occupancy-secondhome': {
    name: 'William Scott',
    ssn: 'XXX-XX-9023',
    dob: '1972-03-18',
    address: '700 Primary Residence Rd, Denver, CO 80206',
    employer: 'Scott Enterprises',
    employerAddress: '1600 Court Place, Denver, CO 80202',
    ein: '45-6789023',
    annualSalary: 185000,
    startDate: '2012-04-01',
    position: 'CEO',
    existingMortgages: [
      { property: '700 Primary Residence Rd, Denver, CO 80206', balance: 380000, payment: 2400, lender: 'Chase' }
    ],
    liabilities: {
      autoLoan: { lender: 'Range Rover Financial', balance: 65000, monthlyPayment: 950, vehicle: '2024 Range Rover Sport' },
      creditCard: { company: 'Amex Black', balance: 12000, monthlyPayment: 400, limit: 100000 }
    },
    purchaseInfo: {
      propertyAddress: '800 Mountain Retreat Way, Breckenridge, CO 80424',
      purchasePrice: 565000,
      loanAmount: 450000,
      isSecondHome: true
    }
  },
  
  // ============================================================================
  // INCOME TYPE VARIATIONS
  // ============================================================================
  
  'income-1099': {
    name: 'Jennifer Moore',
    ssn: 'XXX-XX-0134',
    dob: '1984-05-08',
    address: '900 Contractor Ct, Denver, CO 80204',
    employer: 'Self-Employed (Multiple Clients)',
    employerAddress: '900 Contractor Ct, Denver, CO 80204',
    ein: '56-7890134',
    annualSalary: 125000,
    startDate: '2019-01-01',
    position: 'Independent Consultant',
    income1099: true,
    clients: ['Tech Corp', 'Digital Solutions', 'Innovation Labs'],
    liabilities: {
      autoLoan: { lender: 'Toyota Financial', balance: 18000, monthlyPayment: 350, vehicle: '2022 Toyota RAV4' },
      creditCard: { company: 'Chase Ink', balance: 4000, monthlyPayment: 150, limit: 15000 }
    },
    purchaseInfo: {
      propertyAddress: '100 Freelance Way, Lakewood, CO 80226',
      purchasePrice: 475000,
      loanAmount: 380000
    }
  },
  
  'income-commission': {
    name: 'Mark Robinson',
    ssn: 'XXX-XX-1245',
    dob: '1981-10-22',
    address: '200 Sales Rep Lane, Denver, CO 80205',
    employer: 'Premier Real Estate Group',
    employerAddress: '1000 Realtor Dr, Denver, CO 80205',
    ein: '67-8901245',
    annualSalary: 145000,
    startDate: '2018-03-01',
    position: 'Senior Sales Executive',
    variableIncome: true,
    baseIncome: 65000,
    commissionIncome: 80000,
    liabilities: {
      autoLoan: { lender: 'Mercedes-Benz Financial', balance: 42000, monthlyPayment: 700, vehicle: '2023 Mercedes E-Class' },
      creditCard: { company: 'Amex Gold', balance: 5000, monthlyPayment: 200, limit: 15000 }
    },
    purchaseInfo: {
      propertyAddress: '300 Commission Check Dr, Westminster, CO 80030',
      purchasePrice: 525000,
      loanAmount: 420000
    }
  },
  
  'income-multiple': {
    name: 'Elizabeth Clark',
    ssn: 'XXX-XX-2356',
    dob: '1976-07-14',
    address: '400 Diversified Income Blvd, Denver, CO 80210',
    employer: 'Clark Consulting',
    employerAddress: '400 Diversified Income Blvd, Denver, CO 80210',
    ein: '78-9012356',
    annualSalary: 95000,
    startDate: '2015-06-01',
    position: 'Senior Consultant',
    additionalIncome: [
      { type: '1099 Consulting', amount: 35000 },
      { type: 'Rental Property', amount: 24000 }
    ],
    monthlyRentalIncome: 2000,
    existingMortgages: [
      { property: '500 Rental Property, Aurora, CO 80011', balance: 180000, payment: 1200, lender: 'Wells Fargo' }
    ],
    liabilities: {
      autoLoan: { lender: 'Lexus Financial', balance: 28000, monthlyPayment: 450, vehicle: '2022 Lexus ES' },
      creditCard: { company: 'Chase Sapphire Preferred', balance: 6000, monthlyPayment: 250, limit: 20000 }
    },
    purchaseInfo: {
      propertyAddress: '500 Multiple Streams Ct, Cherry Hills, CO 80113',
      purchasePrice: 600000,
      loanAmount: 480000
    }
  },
  
  'income-retired': {
    name: 'Robert Lewis',
    ssn: 'XXX-XX-3467',
    dob: '1958-11-30',
    address: '600 Golden Years Ave, Castle Rock, CO 80104',
    employer: 'Retired',
    employerAddress: 'N/A',
    ein: 'N/A',
    annualSalary: 72000,
    startDate: 'Retired',
    position: 'Retired Executive',
    isRetired: true,
    retirementIncome: {
      pension: 48000,
      '401kDistribution': 24000
    },
    liabilities: {
      autoLoan: { lender: 'Cadillac Financial', balance: 20000, monthlyPayment: 350, vehicle: '2023 Cadillac XT5' }
    },
    purchaseInfo: {
      propertyAddress: '700 Retirement Community Dr, Parker, CO 80134',
      purchasePrice: 350000,
      loanAmount: 280000
    }
  },
  
  'income-socialsecurity': {
    name: 'Dorothy Walker',
    ssn: 'XXX-XX-4578',
    dob: '1955-04-20',
    address: '800 SS Benefits Rd, Longmont, CO 80501',
    employer: 'Retired',
    employerAddress: 'N/A',
    ein: 'N/A',
    annualSalary: 42000,
    startDate: 'Retired',
    position: 'Retired',
    isRetired: true,
    socialSecurityIncome: 42000,
    liabilities: {
      creditCard: { company: 'AARP Visa', balance: 1200, monthlyPayment: 100, limit: 3000 }
    },
    purchaseInfo: {
      propertyAddress: '900 Fixed Income Lane, Longmont, CO 80503',
      purchasePrice: 210000,
      loanAmount: 165000
    }
  },
  
  'income-alimony': {
    name: 'Susan Hall',
    ssn: 'XXX-XX-5689',
    dob: '1980-08-15',
    address: '100 Support Income Ave, Denver, CO 80209',
    employer: 'Denver Public Schools',
    employerAddress: '1860 Lincoln St, Denver, CO 80203',
    ein: '89-0123456',
    annualSalary: 65000,
    startDate: '2016-08-15',
    position: 'High School Teacher',
    otherIncome: {
      alimony: { monthly: 2000, yearsRemaining: 5 },
      childSupport: { monthly: 1500, yearsRemaining: 8 }
    },
    liabilities: {
      autoLoan: { lender: 'Subaru Motors Finance', balance: 12000, monthlyPayment: 280, vehicle: '2021 Subaru Outback' },
      creditCard: { company: 'Capital One', balance: 2500, monthlyPayment: 100, limit: 5000 }
    },
    purchaseInfo: {
      propertyAddress: '200 New Beginning Ct, Englewood, CO 80110',
      purchasePrice: 400000,
      loanAmount: 320000
    }
  },
  
  'edge-newjob': {
    name: 'Brian Young',
    ssn: 'XXX-XX-6701',
    dob: '1989-02-28',
    address: '300 Career Change Blvd, Denver, CO 80203',
    employer: 'Tech Innovations LLC',
    employerAddress: '2500 Tech Center, Denver, CO 80203',
    ein: '90-1234567',
    annualSalary: 95000,
    startDate: '2025-03-01',
    position: 'Senior Software Engineer',
    recentJobChange: true,
    previousEmployer: 'Old Tech Corp',
    previousEmployerYears: 4,
    sameFieldYears: 5,
    liabilities: {
      autoLoan: { lender: 'Honda Financial', balance: 15000, monthlyPayment: 320, vehicle: '2022 Honda Civic' },
      studentLoan: { servicer: 'Nelnet', balance: 22000, monthlyPayment: 250 }
    },
    purchaseInfo: {
      propertyAddress: '400 New Opportunity Dr, Lakewood, CO 80226',
      purchasePrice: 425000,
      loanAmount: 340000
    }
  },
  
  // ============================================================================
  // ADDITIONAL EDGE CASES
  // ============================================================================
  
  'edge-creditfloor': {
    name: 'Marcus Green',
    ssn: 'XXX-XX-7812',
    dob: '1987-03-15',
    address: '111 Just Qualifying Ln, Denver, CO 80220',
    employer: 'City of Denver',
    employerAddress: '201 W Colfax Ave, Denver, CO 80202',
    ein: '01-2345678',
    annualSalary: 78000,
    startDate: '2019-07-01',
    position: 'Public Works Manager',
    creditScore: 640,
    liabilities: {
      autoLoan: { lender: 'GM Financial', balance: 14000, monthlyPayment: 320, vehicle: '2021 Chevy Malibu' },
      creditCard: { company: 'Capital One Secured', balance: 800, monthlyPayment: 80, limit: 1000 }
    },
    purchaseInfo: {
      propertyAddress: '222 Minimum Score Dr, Aurora, CO 80011',
      purchasePrice: 330000,
      loanAmount: 265000
    }
  },
  
  'edge-bankruptcy': {
    name: 'Rachel Turner',
    ssn: 'XXX-XX-8923',
    dob: '1983-09-22',
    address: '333 Recovery Complete Ave, Lakewood, CO 80226',
    employer: 'Regional Healthcare System',
    employerAddress: '1000 Health Way, Lakewood, CO 80226',
    ein: '12-3456789',
    annualSalary: 82000,
    startDate: '2021-01-15',
    position: 'Billing Manager',
    bankruptcySeasoned: true,
    bankruptcyDischargeMonths: 52,
    liabilities: {
      autoLoan: { lender: 'Credit Acceptance', balance: 10000, monthlyPayment: 280, vehicle: '2019 Hyundai Tucson' },
      creditCard: { company: 'OpenSky Secured', balance: 500, monthlyPayment: 50, limit: 500 }
    },
    purchaseInfo: {
      propertyAddress: '444 Fresh Start Blvd, Westminster, CO 80030',
      purchasePrice: 345000,
      loanAmount: 275000
    }
  },
  
  'edge-foreclosure': {
    name: 'Kenneth Hughes',
    ssn: 'XXX-XX-9034',
    dob: '1979-12-05',
    address: '555 Second Chance Rd, Arvada, CO 80002',
    employer: 'Hughes Construction',
    employerAddress: '2000 Builder Way, Arvada, CO 80002',
    ein: '23-4567890',
    annualSalary: 95000,
    startDate: '2019-04-01',
    position: 'Construction Manager',
    foreclosureSeasoned: true,
    foreclosureMonths: 50,
    liabilities: {
      autoLoan: { lender: 'Ford Credit', balance: 18000, monthlyPayment: 380, vehicle: '2022 Ford F-150' },
      creditCard: { company: 'Discover', balance: 3000, monthlyPayment: 120, limit: 5000 }
    },
    purchaseInfo: {
      propertyAddress: '666 New Beginning Dr, Golden, CO 80401',
      purchasePrice: 400000,
      loanAmount: 320000
    }
  },
  
  'edge-dti43': {
    name: 'Angela King',
    ssn: 'XXX-XX-0145',
    dob: '1986-06-30',
    address: '777 Edge Case Way, Denver, CO 80205',
    employer: 'Denver Financial Services',
    employerAddress: '1700 Broadway, Denver, CO 80202',
    ein: '34-5678901',
    annualSalary: 84000,
    startDate: '2020-02-01',
    position: 'Financial Analyst',
    dtiExact43: true,
    liabilities: {
      autoLoan: { lender: 'Toyota Financial', balance: 20000, monthlyPayment: 420, vehicle: '2022 Toyota Highlander' },
      studentLoan: { servicer: 'FedLoan', balance: 35000, monthlyPayment: 400 },
      creditCard: { company: 'Chase', balance: 4000, monthlyPayment: 150, limit: 8000 }
    },
    purchaseInfo: {
      propertyAddress: '888 On The Line Dr, Lakewood, CO 80226',
      purchasePrice: 350000,
      loanAmount: 280000
    }
  },
  
  'edge-reservesfloor': {
    name: 'Timothy Evans',
    ssn: 'XXX-XX-1256',
    dob: '1984-01-18',
    address: '999 Minimum Savings Ct, Aurora, CO 80012',
    employer: 'Aurora School District',
    employerAddress: '15701 E 1st Ave, Aurora, CO 80011',
    ein: '45-6789012',
    annualSalary: 76000,
    startDate: '2018-08-15',
    position: 'Math Teacher',
    reservesAtFloor: true,
    liabilities: {
      autoLoan: { lender: 'Honda Financial', balance: 12000, monthlyPayment: 280, vehicle: '2020 Honda CR-V' },
      creditCard: { company: 'Discover', balance: 2000, monthlyPayment: 80, limit: 5000 }
    },
    purchaseInfo: {
      propertyAddress: '100 Just Enough Blvd, Centennial, CO 80112',
      purchasePrice: 325000,
      loanAmount: 260000
    }
  },
  
  'edge-largedeposit': {
    name: 'Nicole Phillips',
    ssn: 'XXX-XX-2367',
    dob: '1988-07-25',
    address: '200 Big Deposit Dr, Denver, CO 80206',
    employer: 'Phillips Marketing Agency',
    employerAddress: '1500 Market St, Denver, CO 80202',
    ein: '56-7890123',
    annualSalary: 95000,
    startDate: '2019-01-01',
    position: 'Marketing Director',
    largeDeposit: { amount: 55000, source: 'Year-end bonus', date: '2025-10-15' },
    liabilities: {
      autoLoan: { lender: 'Audi Financial', balance: 28000, monthlyPayment: 480, vehicle: '2023 Audi A4' },
      creditCard: { company: 'Amex', balance: 4000, monthlyPayment: 160, limit: 12000 }
    },
    purchaseInfo: {
      propertyAddress: '300 Source Required Lane, Westminster, CO 80030',
      purchasePrice: 425000,
      loanAmount: 340000
    }
  },
  
  'edge-highutilization': {
    name: 'Jason Campbell',
    ssn: 'XXX-XX-3478',
    dob: '1985-04-12',
    address: '400 Maxed Out Blvd, Denver, CO 80210',
    employer: 'Tech Consulting Group',
    employerAddress: '1800 Larimer St, Denver, CO 80202',
    ein: '67-8901234',
    annualSalary: 115000,
    startDate: '2018-06-01',
    position: 'Principal Consultant',
    highUtilization: true,
    liabilities: {
      creditCard: { company: 'Chase', balance: 18000, monthlyPayment: 450, limit: 20000 },
      creditCard2: { company: 'Discover', balance: 7500, monthlyPayment: 200, limit: 8000 },
      autoLoan: { lender: 'BMW Financial', balance: 35000, monthlyPayment: 580, vehicle: '2023 BMW 5 Series' }
    },
    purchaseInfo: {
      propertyAddress: '500 Utilization Check Dr, Lakewood, CO 80226',
      purchasePrice: 475000,
      loanAmount: 380000
    }
  },
  
  'edge-nsf': {
    name: 'Melissa Roberts',
    ssn: 'XXX-XX-4589',
    dob: '1990-11-08',
    address: '600 Overdraft Ave, Aurora, CO 80015',
    employer: 'Aurora Medical Center',
    employerAddress: '1501 S Potomac St, Aurora, CO 80012',
    ein: '78-9012345',
    annualSalary: 72000,
    startDate: '2021-03-01',
    position: 'Medical Assistant',
    nsfIncidents: 2,
    liabilities: {
      autoLoan: { lender: 'Santander', balance: 14000, monthlyPayment: 320, vehicle: '2020 Kia Sportage' },
      creditCard: { company: 'Capital One', balance: 2500, monthlyPayment: 100, limit: 4000 }
    },
    purchaseInfo: {
      propertyAddress: '700 Account Health Ct, Centennial, CO 80112',
      purchasePrice: 320000,
      loanAmount: 255000
    }
  },
  
  'edge-deferredloans': {
    name: 'Ryan Collins',
    ssn: 'XXX-XX-5690',
    dob: '1992-03-22',
    address: '800 Grad School Rd, Boulder, CO 80302',
    employer: 'Research Labs Inc.',
    employerAddress: '4001 Discovery Dr, Boulder, CO 80303',
    ein: '89-0123456',
    annualSalary: 85000,
    startDate: '2023-06-01',
    position: 'Research Scientist',
    deferredStudentLoans: true,
    liabilities: {
      studentLoan: { servicer: 'Navient', balance: 85000, monthlyPayment: 0, inDeferment: true, ibrPayment: 425 },
      creditCard: { company: 'Chase', balance: 3000, monthlyPayment: 120, limit: 8000 }
    },
    purchaseInfo: {
      propertyAddress: '900 IBR Plan Way, Denver, CO 80203',
      purchasePrice: 390000,
      loanAmount: 310000
    }
  },
  
  'edge-multiplereo': {
    name: 'Steven Peterson',
    ssn: 'XXX-XX-6712',
    dob: '1974-08-14',
    address: '100 Portfolio Manager Blvd, Denver, CO 80206',
    employer: 'Peterson Properties LLC',
    employerAddress: '100 Portfolio Manager Blvd, Denver, CO 80206',
    ein: '90-1234567',
    annualSalary: 225000,
    startDate: '2010-01-01',
    position: 'Owner',
    multipleREO: true,
    monthlyRentalIncome: 6500,
    existingMortgages: [
      { property: '100 Portfolio Manager Blvd, Denver, CO 80206', balance: 420000, payment: 2800, lender: 'Chase' },
      { property: '150 Rental One, Aurora, CO 80011', balance: 280000, payment: 1900, lender: 'Wells Fargo' },
      { property: '175 Rental Two, Lakewood, CO 80226', balance: 260000, payment: 1750, lender: 'US Bank' }
    ],
    liabilities: {
      autoLoan: { lender: 'Mercedes-Benz Financial', balance: 58000, monthlyPayment: 900, vehicle: '2024 Mercedes S-Class' },
      creditCard: { company: 'Amex Centurion', balance: 15000, monthlyPayment: 500, limit: 250000 }
    },
    purchaseInfo: {
      propertyAddress: '200 Fourth Investment Ct, Aurora, CO 80012',
      purchasePrice: 475000,
      loanAmount: 380000,
      isInvestment: true
    }
  },
  
  // Note: DPA programs not supported in Danish realkredit style - edge-dpa removed
  
  'edge-sellerconcession': {
    name: 'Laura Morris',
    ssn: 'XXX-XX-8934',
    dob: '1988-10-15',
    address: '500 Negotiation Lane, Lakewood, CO 80226',
    employer: 'Morris Design Studio',
    employerAddress: '1200 17th St, Denver, CO 80202',
    ein: '12-3456789',
    annualSalary: 88000,
    startDate: '2019-03-01',
    position: 'Interior Designer',
    sellerConcession: { amount: 9450, percentage: 3 },
    liabilities: {
      autoLoan: { lender: 'Volvo Financial', balance: 22000, monthlyPayment: 400, vehicle: '2022 Volvo XC60' },
      creditCard: { company: 'Citi', balance: 3500, monthlyPayment: 140, limit: 8000 }
    },
    purchaseInfo: {
      propertyAddress: '600 Closing Cost Credit Ct, Westminster, CO 80030',
      purchasePrice: 395000,
      loanAmount: 315000
    }
  },
  
  'edge-trust': {
    name: 'Richard Nelson',
    ssn: 'XXX-XX-9045',
    dob: '1968-07-22',
    address: '700 Estate Planning Dr, Cherry Hills, CO 80113',
    employer: 'Nelson Investments',
    employerAddress: '1700 Lincoln St, Denver, CO 80203',
    ein: '23-4567890',
    annualSalary: 195000,
    startDate: '2005-01-01',
    position: 'Principal',
    trustOwnership: { name: 'Nelson Family Revocable Trust', type: 'Revocable' },
    liabilities: {
      autoLoan: { lender: 'Bentley Financial', balance: 120000, monthlyPayment: 1800, vehicle: '2024 Bentley Bentayga' },
      creditCard: { company: 'JP Morgan Private', balance: 25000, monthlyPayment: 800, limit: 500000 }
    },
    purchaseInfo: {
      propertyAddress: '800 Trust Ownership Way, Greenwood Village, CO 80111',
      purchasePrice: 825000,
      loanAmount: 650000
    }
  },
  
  'stage1-preapproval': {
    name: 'Matthew Richardson',
    ssn: 'XXX-XX-0156',
    dob: '1991-12-08',
    address: '900 Shopping Mode Ave, Denver, CO 80203',
    employer: 'Richardson Consulting',
    employerAddress: '1600 Glenarm Pl, Denver, CO 80202',
    ein: '34-5678901',
    annualSalary: 95000,
    startDate: '2020-06-01',
    position: 'Business Consultant',
    stageOneOnly: true,
    liabilities: {
      autoLoan: { lender: 'Mazda Financial', balance: 16000, monthlyPayment: 340, vehicle: '2022 Mazda CX-5' },
      creditCard: { company: 'Chase', balance: 4000, monthlyPayment: 160, limit: 10000 }
    },
    // No purchase info - Stage 1 only
    purchaseInfo: null
  }
};

// Generate watermark helper
function addWatermark(doc) {
  doc.save();
  doc.rotate(45, { origin: [300, 400] });
  doc.fontSize(60);
  doc.fillColor('#ff0000');
  doc.opacity(0.15);
  doc.text('SAMPLE DOCUMENT', 50, 350);
  doc.restore();
}

// Generate header with disclaimer
function addHeader(doc, title) {
  doc.rect(0, 0, 612, 80).fill('#1e40af');
  doc.fillColor('#ffffff');
  doc.fontSize(8);
  doc.text('⚠️ TEST DOCUMENT - FOR TESTING PURPOSES ONLY - NOT VALID FOR ACTUAL LOAN APPLICATIONS', 50, 15, { align: 'center' });
  doc.fontSize(18);
  doc.text(title, 50, 40, { align: 'center' });
  doc.fillColor('#000000');
  doc.moveDown(3);
}

// ==================================================
// DOCUMENT GENERATORS
// ==================================================

function generatePayStub(applicantKey, payPeriod) {
  const applicant = APPLICANTS[applicantKey];
  
  // Skip pay stubs for self-employed
  if (!applicant.annualSalary) {
    console.log(`   ⏭️  Skipping pay stub for ${applicant.name} (self-employed)`);
    return;
  }
  
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-paystub-${payPeriod}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'EARNINGS STATEMENT');
  
  const biWeeklySalary = applicant.annualSalary / 26;
  const federalTax = biWeeklySalary * 0.22;
  const stateTax = biWeeklySalary * 0.0463;
  const socialSecurity = biWeeklySalary * 0.062;
  const medicare = biWeeklySalary * 0.0145;
  const health = 250;
  const retirement = biWeeklySalary * 0.06;
  
  const deductions = federalTax + stateTax + socialSecurity + medicare + health + retirement;
  const netPay = biWeeklySalary - deductions;

  doc.fontSize(10);
  doc.text(`Employee: ${applicant.name}`, 50, 120);
  doc.text(`SSN: ${applicant.ssn}`, 400, 120);
  doc.text(`Employer: ${applicant.employer}`, 50, 140);
  doc.text(`Pay Period: ${payPeriod}`, 400, 140);
  doc.text(`Address: ${applicant.employerAddress}`, 50, 160);
  
  doc.moveTo(50, 190).lineTo(562, 190).stroke();
  
  // Earnings
  doc.fontSize(12).text('EARNINGS', 50, 200);
  doc.fontSize(10);
  doc.text('Description', 50, 220);
  doc.text('Hours', 200, 220);
  doc.text('Rate', 280, 220);
  doc.text('Current', 360, 220);
  doc.text('YTD', 480, 220);
  
  doc.text('Regular Salary', 50, 240);
  doc.text('80.00', 200, 240);
  doc.text(`$${(biWeeklySalary/80).toFixed(2)}`, 280, 240);
  doc.text(`$${biWeeklySalary.toFixed(2)}`, 360, 240);
  doc.text(`$${(biWeeklySalary * 12).toFixed(2)}`, 480, 240);
  
  doc.text(`GROSS PAY: $${biWeeklySalary.toFixed(2)}`, 360, 270, { underline: true });
  
  // Deductions
  doc.moveTo(50, 300).lineTo(562, 300).stroke();
  doc.fontSize(12).text('DEDUCTIONS', 50, 310);
  doc.fontSize(10);
  
  let y = 330;
  const deductionList = [
    ['Federal Income Tax', federalTax],
    ['State Income Tax (CO)', stateTax],
    ['Social Security', socialSecurity],
    ['Medicare', medicare],
    ['Health Insurance', health],
    ['401(k) Contribution', retirement]
  ];
  
  deductionList.forEach(([name, amount]) => {
    doc.text(name, 50, y);
    doc.text(`$${amount.toFixed(2)}`, 360, y);
    y += 20;
  });
  
  doc.text(`TOTAL DEDUCTIONS: $${deductions.toFixed(2)}`, 360, y + 10, { underline: true });
  
  // Net Pay
  doc.moveTo(50, y + 40).lineTo(562, y + 40).stroke();
  doc.fontSize(14);
  doc.text(`NET PAY: $${netPay.toFixed(2)}`, 360, y + 50);
  
  // Footer
  doc.fontSize(8);
  doc.text('This document is for TESTING PURPOSES ONLY. Do not use for actual loan applications.', 50, 700);
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

function generateW2(applicantKey, year) {
  const applicant = APPLICANTS[applicantKey];
  
  // Skip W-2 for self-employed (they use tax returns instead)
  if (!applicant.annualSalary) {
    console.log(`   ⏭️  Skipping W-2 for ${applicant.name} (self-employed)`);
    return;
  }
  
  const doc = new PDFDocument({ margin: 40 });
  const filename = `${applicantKey}-w2-${year}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  
  // W-2 header
  doc.rect(0, 0, 612, 60).fill('#000000');
  doc.fillColor('#ffffff');
  doc.fontSize(8);
  doc.text('⚠️ SAMPLE W-2 - FOR TESTING ONLY - NOT AN OFFICIAL IRS FORM', 50, 10, { align: 'center' });
  doc.fontSize(20);
  doc.text(`Form W-2 Wage and Tax Statement ${year}`, 50, 30, { align: 'center' });
  doc.fillColor('#000000');
  
  doc.fontSize(9);
  
  // Box layout (simplified)
  const boxWidth = 130;
  const boxHeight = 50;
  let startY = 80;
  
  // Employee info
  doc.rect(40, startY, 250, boxHeight).stroke();
  doc.text(`a. Employee's SSN: ${applicant.ssn}`, 45, startY + 5);
  
  doc.rect(300, startY, 270, boxHeight).stroke();
  doc.text('b. Employer ID (EIN):', 305, startY + 5);
  doc.text(applicant.ein, 305, startY + 20);
  
  startY += boxHeight;
  
  doc.rect(40, startY, 250, boxHeight * 1.5).stroke();
  doc.text('c. Employer name, address:', 45, startY + 5);
  doc.text(applicant.employer, 45, startY + 20);
  doc.text(applicant.employerAddress, 45, startY + 35);
  
  // Wage boxes
  const wageBoxes = [
    ['1', 'Wages, tips, other comp.', applicant.annualSalary],
    ['2', 'Federal income tax withheld', applicant.annualSalary * 0.22],
    ['3', 'Social security wages', applicant.annualSalary],
    ['4', 'Social security tax withheld', applicant.annualSalary * 0.062],
    ['5', 'Medicare wages and tips', applicant.annualSalary],
    ['6', 'Medicare tax withheld', applicant.annualSalary * 0.0145]
  ];
  
  startY += boxHeight * 1.5 + 20;
  let col = 0;
  
  wageBoxes.forEach(([box, label, amount], i) => {
    const x = 40 + (col * 180);
    const y = startY + (Math.floor(i / 3) * boxHeight);
    
    doc.rect(x, y, 170, boxHeight - 5).stroke();
    doc.fontSize(7);
    doc.text(`${box}. ${label}`, x + 3, y + 3);
    doc.fontSize(11);
    doc.text(`$${amount.toFixed(2)}`, x + 3, y + 20);
    
    col = (col + 1) % 3;
  });
  
  // Employee info
  startY += boxHeight * 2 + 20;
  doc.rect(40, startY, 530, boxHeight * 1.5).stroke();
  doc.fontSize(9);
  doc.text('e. Employee name and address:', 45, startY + 5);
  doc.fontSize(11);
  doc.text(applicant.name, 45, startY + 20);
  doc.text('123 Test Address St', 45, startY + 35);
  doc.text('Denver, CO 80202', 45, startY + 50);
  
  // Footer
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - NOT VALID FOR TAX FILING OR LOAN APPLICATIONS', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

function generateBankStatement(applicantKey, month) {
  const applicant = APPLICANTS[applicantKey];
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-bank-statement-${month}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'MONTHLY BANK STATEMENT');
  
  const income = applicant.annualSalary || applicant.netProfit || 100000;
  const baseBalance = income > 100000 ? 45000 : 25000;
  const monthlyDeposit = income / 12 * 0.7; // Net after taxes
  
  doc.fontSize(10);
  doc.text('First National Test Bank', 50, 120);
  doc.text('Statement Period: ' + month, 400, 120);
  doc.text('Account: CHECKING ****4567', 50, 140);
  doc.text('Page 1 of 1', 480, 140);
  
  doc.moveTo(50, 170).lineTo(562, 170).stroke();
  
  // Account holder
  doc.text(`Account Holder: ${applicant.name}`, 50, 180);
  
  // Summary
  doc.fontSize(12);
  doc.text('ACCOUNT SUMMARY', 50, 210);
  doc.fontSize(10);
  
  const beginningBalance = baseBalance;
  const endingBalance = baseBalance + monthlyDeposit - 4500;
  
  doc.text('Beginning Balance:', 50, 235);
  doc.text(`$${beginningBalance.toFixed(2)}`, 200, 235);
  
  doc.text('Total Deposits:', 50, 255);
  doc.text(`$${monthlyDeposit.toFixed(2)}`, 200, 255);
  
  doc.text('Total Withdrawals:', 50, 275);
  doc.text('$4,500.00', 200, 275);
  
  doc.text('Ending Balance:', 50, 295, { underline: true });
  doc.text(`$${endingBalance.toFixed(2)}`, 200, 295);
  
  // Transactions
  doc.moveTo(50, 330).lineTo(562, 330).stroke();
  doc.fontSize(12);
  doc.text('TRANSACTION HISTORY', 50, 340);
  doc.fontSize(9);
  
  // Headers
  doc.text('Date', 50, 365);
  doc.text('Description', 120, 365);
  doc.text('Debit', 380, 365);
  doc.text('Credit', 450, 365);
  doc.text('Balance', 510, 365);
  
  const transactions = [
    ['01', 'Beginning Balance', '', '', beginningBalance],
    ['01', `DIRECT DEP - ${applicant.employer?.substring(0, 20) || 'EMPLOYER'}`, '', monthlyDeposit / 2, beginningBalance + monthlyDeposit / 2],
    ['05', 'MORTGAGE PAYMENT', 1800, '', beginningBalance + monthlyDeposit / 2 - 1800],
    ['08', 'UTILITIES - XCEL ENERGY', 185, '', beginningBalance + monthlyDeposit / 2 - 1985],
    ['12', 'GROCERY - KING SOOPERS', 342, '', beginningBalance + monthlyDeposit / 2 - 2327],
    ['15', `DIRECT DEP - ${applicant.employer?.substring(0, 20) || 'EMPLOYER'}`, '', monthlyDeposit / 2, endingBalance + 2173],
    ['18', 'AUTO INSURANCE', 145, '', endingBalance + 2028],
    ['22', 'TRANSFER TO SAVINGS', 1500, '', endingBalance + 528],
    ['25', 'DINING - VARIOUS', 215, '', endingBalance + 313],
    ['28', 'GAS - SHELL', 58, '', endingBalance]
  ];
  
  let y = 385;
  transactions.forEach(([date, desc, debit, credit, bal]) => {
    doc.text(date, 50, y);
    doc.text(desc, 120, y);
    doc.text(debit ? `$${Number(debit).toFixed(2)}` : '', 380, y);
    doc.text(credit ? `$${Number(credit).toFixed(2)}` : '', 450, y);
    doc.text(`$${Number(bal).toFixed(2)}`, 510, y);
    y += 18;
  });
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

function generateDriversLicense(applicantKey) {
  const applicant = APPLICANTS[applicantKey];
  const doc = new PDFDocument({ size: [350, 220], margin: 10 });
  const filename = `${applicantKey}-drivers-license.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  // Background
  doc.rect(0, 0, 350, 220).fill('#e8f4f8');
  
  // Header
  doc.rect(0, 0, 350, 40).fill('#1e40af');
  doc.fillColor('#ffffff');
  doc.fontSize(8);
  doc.text('⚠️ SAMPLE ID - FOR TESTING ONLY', 10, 5);
  doc.fontSize(14);
  doc.text('STATE OF COLORADO', 10, 18);
  doc.text('DRIVER LICENSE', 250, 18);
  
  doc.fillColor('#000000');
  
  // Photo placeholder
  doc.rect(15, 55, 80, 100).stroke();
  doc.fontSize(8);
  doc.text('PHOTO', 40, 100);
  doc.text('PLACEHOLDER', 30, 112);
  
  // Info
  doc.fontSize(9);
  doc.text('DL: 12-345-6789', 110, 55);
  doc.text('CLASS: R', 260, 55);
  
  doc.fontSize(7);
  doc.text('LN:', 110, 75);
  doc.fontSize(11);
  doc.text(applicant.name.split(' ').pop().toUpperCase(), 125, 73);
  
  doc.fontSize(7);
  doc.text('FN:', 110, 92);
  doc.fontSize(11);
  doc.text(applicant.name.split(' ')[0].toUpperCase(), 125, 90);
  
  doc.fontSize(7);
  doc.text('DOB:', 110, 110);
  doc.fontSize(9);
  doc.text('03/15/1985', 135, 108);
  
  doc.text('EXP:', 200, 110);
  doc.text('03/15/2028', 225, 108);
  
  doc.fontSize(7);
  doc.text('ADDRESS:', 110, 130);
  doc.fontSize(8);
  doc.text('123 TEST ADDRESS ST', 110, 142);
  doc.text('DENVER, CO 80202', 110, 152);
  
  // Signature line
  doc.moveTo(15, 180).lineTo(150, 180).stroke();
  doc.fontSize(7);
  doc.text('SIGNATURE', 60, 183);
  
  // Disclaimer
  doc.fontSize(6);
  doc.text('SAMPLE DOCUMENT - NOT VALID ID', 180, 200);
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

function generateGiftLetter(donorName, recipientName, amount) {
  const doc = new PDFDocument({ margin: 50 });
  const filename = `gift-letter-${recipientName.toLowerCase().replace(' ', '-')}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'GIFT LETTER');
  
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  doc.fontSize(12);
  doc.text(today, { align: 'right' });
  doc.moveDown(2);
  
  doc.text('To Whom It May Concern:', { align: 'left' });
  doc.moveDown();
  
  doc.text(
    `I/We, ${donorName}, hereby certify that I/we have made a gift of $${amount.toLocaleString()} ` +
    `to ${recipientName} for the purpose of purchasing a home. This gift is not a loan and does not ` +
    `need to be repaid. No repayment is expected or implied.`,
    { align: 'left', lineGap: 5 }
  );
  doc.moveDown();
  
  doc.text('The funds are from the following source:');
  doc.text('☑ Personal Savings Account', 70);
  doc.text('☐ Investment Account', 70);
  doc.text('☐ Other: ________________', 70);
  doc.moveDown();
  
  doc.text(
    `I/We understand that this gift letter will be used to support ${recipientName}'s mortgage application ` +
    `and certify that the information provided is true and accurate.`,
    { lineGap: 5 }
  );
  doc.moveDown(2);
  
  doc.text('_' + '_'.repeat(40), 50);
  doc.text(`Donor Signature: ${donorName}`, 50);
  doc.moveDown();
  doc.text(`Date: ${today}`, 50);
  doc.moveDown();
  doc.text(`Donor Address: 456 Generous Parent Lane, Denver, CO 80211`, 50);
  doc.text(`Donor Phone: (555) 123-4567`, 50);
  doc.moveDown(2);
  
  doc.text('Relationship to Recipient: Parent', 50);
  doc.moveDown(3);
  
  doc.text('_' + '_'.repeat(40), 50);
  doc.text(`Recipient Signature: ${recipientName}`, 50);
  doc.text(`Date: ${today}`, 50);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

function generatePurchaseAgreement(buyerName, propertyAddress, purchasePrice) {
  const doc = new PDFDocument({ margin: 50 });
  const filename = `purchase-agreement-${buyerName.toLowerCase().replace(' ', '-')}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'REAL ESTATE PURCHASE AGREEMENT');
  
  doc.fontSize(10);
  doc.text('CONTRACT DATE: ' + new Date().toLocaleDateString(), { align: 'right' });
  doc.moveDown();
  
  doc.fontSize(12);
  doc.text('1. PARTIES', { underline: true });
  doc.fontSize(10);
  doc.text(`BUYER: ${buyerName}`);
  doc.text('SELLER: John and Jane Sample Seller');
  doc.moveDown();
  
  doc.fontSize(12);
  doc.text('2. PROPERTY', { underline: true });
  doc.fontSize(10);
  doc.text(`Address: ${propertyAddress}`);
  doc.text('Legal Description: Lot 123, Block 45, Sample Subdivision');
  doc.moveDown();
  
  doc.fontSize(12);
  doc.text('3. PURCHASE PRICE AND TERMS', { underline: true });
  doc.fontSize(10);
  doc.text(`Purchase Price: $${purchasePrice.toLocaleString()}`);
  doc.text(`Earnest Money Deposit: $${(purchasePrice * 0.01).toLocaleString()}`);
  doc.text(`Down Payment: $${(purchasePrice * 0.20).toLocaleString()} (20%)`);
  doc.text(`Loan Amount: $${(purchasePrice * 0.80).toLocaleString()}`);
  doc.moveDown();
  
  doc.fontSize(12);
  doc.text('4. FINANCING CONTINGENCY', { underline: true });
  doc.fontSize(10);
  doc.text('This contract is contingent upon Buyer obtaining financing approval within 30 days.');
  doc.moveDown();
  
  doc.fontSize(12);
  doc.text('5. CLOSING DATE', { underline: true });
  doc.fontSize(10);
  const closingDate = new Date();
  closingDate.setDate(closingDate.getDate() + 45);
  doc.text(`Expected Closing Date: ${closingDate.toLocaleDateString()}`);
  doc.moveDown();
  
  doc.fontSize(12);
  doc.text('6. SIGNATURES', { underline: true });
  doc.moveDown();
  
  doc.text('_' + '_'.repeat(40) + '    ' + '_'.repeat(15));
  doc.text(`Buyer: ${buyerName}                                    Date`);
  doc.moveDown();
  
  doc.text('_' + '_'.repeat(40) + '    ' + '_'.repeat(15));
  doc.text('Seller: John Sample Seller                              Date');
  doc.moveDown();
  
  doc.text('_' + '_'.repeat(40) + '    ' + '_'.repeat(15));
  doc.text('Seller: Jane Sample Seller                              Date');
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

function generateProfitLossStatement(applicantKey, year) {
  const applicant = APPLICANTS[applicantKey];
  
  // Only for self-employed
  if (!applicant.businessName) {
    return;
  }
  
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-profit-loss-${year}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'PROFIT & LOSS STATEMENT');
  
  doc.fontSize(12);
  doc.text(applicant.businessName, 50, 120, { align: 'center' });
  doc.fontSize(10);
  doc.text(`For the Year Ended December 31, ${year}`, 50, 140, { align: 'center' });
  doc.moveDown(2);
  
  // Revenue section
  doc.fontSize(12);
  doc.text('REVENUE', 50, 180);
  doc.moveTo(50, 195).lineTo(562, 195).stroke();
  
  doc.fontSize(10);
  const consultingRevenue = applicant.annualRevenue * 0.85;
  const otherRevenue = applicant.annualRevenue * 0.15;
  
  doc.text('Consulting Services', 70, 205);
  doc.text(`$${consultingRevenue.toLocaleString()}`, 450, 205);
  
  doc.text('Other Revenue', 70, 225);
  doc.text(`$${otherRevenue.toLocaleString()}`, 450, 225);
  
  doc.text('Total Revenue', 50, 250, { underline: true });
  doc.text(`$${applicant.annualRevenue.toLocaleString()}`, 450, 250);
  
  // Expenses section
  doc.fontSize(12);
  doc.text('EXPENSES', 50, 290);
  doc.moveTo(50, 305).lineTo(562, 305).stroke();
  
  doc.fontSize(10);
  const expenses = [
    ['Salaries & Wages (contractors)', applicant.annualRevenue * 0.25],
    ['Office Rent', 24000],
    ['Utilities', 3600],
    ['Software & Technology', 12000],
    ['Marketing & Advertising', 15000],
    ['Professional Services', 8000],
    ['Insurance', 6000],
    ['Travel & Entertainment', 10000],
    ['Office Supplies', 2500],
    ['Depreciation', 5000],
    ['Other Expenses', 8900]
  ];
  
  let y = 315;
  let totalExpenses = 0;
  expenses.forEach(([name, amount]) => {
    doc.text(name, 70, y);
    doc.text(`$${amount.toLocaleString()}`, 450, y);
    totalExpenses += amount;
    y += 20;
  });
  
  doc.text('Total Expenses', 50, y + 10, { underline: true });
  doc.text(`$${totalExpenses.toLocaleString()}`, 450, y + 10);
  
  // Net Income
  const netIncome = applicant.annualRevenue - totalExpenses;
  doc.moveTo(50, y + 40).lineTo(562, y + 40).stroke();
  doc.fontSize(14);
  doc.text('NET INCOME', 50, y + 50);
  doc.text(`$${netIncome.toLocaleString()}`, 450, y + 50);
  
  // Certification
  doc.fontSize(9);
  doc.text(
    'I certify that the above Profit & Loss Statement is accurate and complete to the best of my knowledge.',
    50, y + 100
  );
  doc.moveDown(2);
  doc.text('_' + '_'.repeat(40));
  doc.text(`${applicant.name}, Owner`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

// ==================================================
// SPECIAL DOCUMENT GENERATORS
// ==================================================

function generateVACertificate(applicantKey) {
  const applicant = APPLICANTS[applicantKey];
  if (!applicant.isVeteran) return;
  
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-va-coe.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  doc.rect(0, 0, 612, 80).fill('#002664'); // VA blue
  doc.fillColor('#ffffff');
  doc.fontSize(8);
  doc.text('⚠️ TEST DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 15, { align: 'center' });
  doc.fontSize(16);
  doc.text('CERTIFICATE OF ELIGIBILITY', 50, 40, { align: 'center' });
  doc.fillColor('#000000');
  
  doc.fontSize(10);
  doc.text('U.S. DEPARTMENT OF VETERANS AFFAIRS', 50, 100, { align: 'center' });
  doc.moveDown(2);
  
  doc.fontSize(12);
  doc.text('VETERAN INFORMATION', 50, 150, { underline: true });
  doc.fontSize(10);
  doc.text(`Name: ${applicant.name}`, 50, 175);
  doc.text(`SSN: ${applicant.ssn}`, 50, 195);
  doc.text(`Branch of Service: ${applicant.branchOfService}`, 50, 215);
  doc.text(`Period of Service: ${applicant.serviceYears}`, 50, 235);
  doc.text(`Character of Discharge: ${applicant.dischargeStatus}`, 50, 255);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('ENTITLEMENT INFORMATION', 50, 295, { underline: true });
  doc.fontSize(10);
  doc.text('Basic Entitlement: $36,000', 50, 320);
  doc.text('Bonus Entitlement: $68,250', 50, 340);
  doc.text('Total Entitlement: $104,250', 50, 360);
  doc.text('Entitlement Charged: $0', 50, 380);
  doc.text('Available Entitlement: $104,250', 50, 400);
  
  doc.moveDown(3);
  doc.text('This veteran has met the basic requirements for VA home loan benefits.', 50, 450);
  doc.text(`Certificate Issue Date: ${new Date().toLocaleDateString()}`, 50, 480);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

function generatePassport(applicantKey) {
  const applicant = APPLICANTS[applicantKey];
  if (!applicant.usePassport) return;
  
  const doc = new PDFDocument({ margin: 50, size: [400, 550] });
  const filename = `${applicantKey}-passport.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  doc.rect(0, 0, 400, 60).fill('#1e3a5f');
  doc.fillColor('#ffffff');
  doc.fontSize(8);
  doc.text('TEST DOCUMENT', 50, 10, { align: 'center' });
  doc.fontSize(14);
  doc.text(`${applicant.countryOfOrigin.toUpperCase()} PASSPORT`, 50, 30, { align: 'center' });
  doc.fillColor('#000000');
  
  // Photo placeholder
  doc.rect(50, 80, 100, 130).stroke();
  doc.fontSize(8);
  doc.text('PHOTO', 80, 140);
  
  doc.fontSize(10);
  doc.text('Type: P', 170, 90);
  doc.text(`Country: ${applicant.countryOfOrigin}`, 170, 110);
  doc.text(`Surname: ${applicant.name.split(' ')[1]}`, 170, 130);
  doc.text(`Given Names: ${applicant.name.split(' ')[0]}`, 170, 150);
  doc.text(`Nationality: ${applicant.countryOfOrigin}`, 170, 170);
  doc.text('Date of Birth: 1985-06-15', 170, 190);
  doc.text('Sex: M', 170, 210);
  doc.text('Place of Birth: Tokyo', 170, 230);
  
  doc.text(`Passport No: ${applicantKey.toUpperCase().substring(0, 2)}1234567`, 50, 240);
  doc.text('Date of Issue: 2022-01-15', 50, 260);
  doc.text('Date of Expiry: 2032-01-14', 50, 280);
  
  doc.moveDown(2);
  doc.fontSize(9);
  doc.text(`VISA STATUS: ${applicant.visaType}`, 50, 320);
  doc.text(`Visa Expiration: ${applicant.visaExpiration}`, 50, 340);
  doc.text('Work Authorization: Approved', 50, 360);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 500, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

function generateExistingMortgageStatement(applicantKey) {
  const applicant = APPLICANTS[applicantKey];
  
  // Handle both single mortgage (refinance) and multiple mortgages (investment)
  if (!applicant.currentMortgageBalance && !applicant.existingMortgages) return;
  
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-mortgage-statement.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'MORTGAGE STATEMENT');
  
  doc.fontSize(12);
  
  // For investment property owners with multiple mortgages
  if (applicant.existingMortgages && Array.isArray(applicant.existingMortgages)) {
    doc.text('CONSOLIDATED MORTGAGE STATEMENT', 50, 100, { underline: true });
    doc.fontSize(10);
    doc.text(`Borrower: ${applicant.name}`, 50, 125);
    doc.text(`Total Properties: ${applicant.existingMortgages.length}`, 50, 145);
    
    let yPos = 180;
    let totalMonthlyPayment = 0;
    let totalBalance = 0;
    
    applicant.existingMortgages.forEach((mortgage, index) => {
      doc.fontSize(11);
      doc.text(`Property ${index + 1}: ${mortgage.property}`, 50, yPos);
      doc.fontSize(10);
      yPos += 20;
      doc.text(`  Lender: ${mortgage.lender}`, 70, yPos);
      yPos += 15;
      doc.text(`  Current Balance: $${mortgage.balance.toLocaleString()}`, 70, yPos);
      yPos += 15;
      doc.text(`  Monthly Payment: $${mortgage.payment.toLocaleString()}`, 70, yPos);
      yPos += 15;
      if (mortgage.rentalIncome) {
        doc.text(`  Monthly Rental Income: $${mortgage.rentalIncome.toLocaleString()}`, 70, yPos);
        yPos += 15;
      }
      doc.text('  Payment Status: Current (all on-time)', 70, yPos);
      yPos += 25;
      
      totalMonthlyPayment += mortgage.payment;
      totalBalance += mortgage.balance;
    });
    
    doc.moveTo(50, yPos).lineTo(562, yPos).stroke();
    yPos += 15;
    doc.fontSize(11);
    doc.text(`Total Monthly Mortgage Payments: $${totalMonthlyPayment.toLocaleString()}`, 50, yPos);
    yPos += 20;
    doc.text(`Total Outstanding Balance: $${totalBalance.toLocaleString()}`, 50, yPos);
  } else {
    // Single mortgage (refinance scenario)
    doc.text('Current Mortgage Lender', 50, 100);
    doc.text(applicant.mortgageLender || '123 Bank Street, Denver, CO 80202', 50, 115);
    doc.moveDown(2);
    
    doc.text('ACCOUNT INFORMATION', 50, 150, { underline: true });
    doc.fontSize(10);
    doc.text(`Borrower: ${applicant.name}`, 50, 175);
    doc.text('Account Number: XXXX-XXXX-1234', 50, 195);
    doc.text(`Property: ${applicant.address}`, 50, 215);
    
    doc.moveDown(2);
    doc.fontSize(12);
    doc.text('LOAN DETAILS', 50, 260, { underline: true });
    doc.fontSize(10);
    doc.text(`Original Loan Amount: $350,000`, 50, 285);
    doc.text(`Current Balance: $${applicant.currentMortgageBalance.toLocaleString()}`, 50, 305);
    doc.text(`Interest Rate: ${applicant.currentInterestRate}%`, 50, 325);
    doc.text(`Monthly Payment: $${applicant.currentMortgagePayment.toLocaleString()}`, 50, 345);
    doc.text(`Estimated Property Value: $${applicant.propertyValue.toLocaleString()}`, 50, 365);
    doc.text('Loan Type: 30-Year Fixed', 50, 385);
    
    doc.moveDown(2);
    doc.fontSize(12);
    doc.text('PAYMENT HISTORY', 50, 430, { underline: true });
    doc.fontSize(10);
    doc.text('Last 12 Months: All payments made on time', 50, 455);
    doc.text('Late Payments: 0', 50, 475);
    doc.text('Payment Status: Current', 50, 495);
  }
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

function generateRentalIncomeStatement(applicantKey) {
  const applicant = APPLICANTS[applicantKey];
  if (!applicant.monthlyRentalIncome) return;
  
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-rental-income.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'RENTAL INCOME VERIFICATION');
  
  doc.fontSize(12);
  doc.text('PROPERTY OWNER INFORMATION', 50, 100, { underline: true });
  doc.fontSize(10);
  doc.text(`Name: ${applicant.name}`, 50, 125);
  doc.text(`Number of Rental Properties: ${applicant.rentalProperties}`, 50, 145);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('RENTAL PROPERTY DETAILS', 50, 190, { underline: true });
  
  // Property 1
  doc.fontSize(10);
  doc.text('Property 1: 123 Rental Ave, Denver, CO 80210', 50, 215);
  doc.text('  Monthly Rent: $1,800', 70, 235);
  doc.text('  Lease Term: 12 months', 70, 255);
  doc.text('  Current Tenant: Verified', 70, 275);
  
  // Property 2
  doc.text('Property 2: 456 Investment Blvd, Aurora, CO 80012', 50, 310);
  doc.text('  Monthly Rent: $1,700', 70, 330);
  doc.text('  Lease Term: 12 months', 70, 350);
  doc.text('  Current Tenant: Verified', 70, 370);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('INCOME SUMMARY', 50, 420, { underline: true });
  doc.fontSize(10);
  doc.text(`Total Monthly Rental Income: $${applicant.monthlyRentalIncome.toLocaleString()}`, 50, 445);
  doc.text(`Annual Rental Income: $${(applicant.monthlyRentalIncome * 12).toLocaleString()}`, 50, 465);
  doc.text('Vacancy Rate (assumed): 5%', 50, 485);
  doc.text(`Net Annual Rental Income: $${(applicant.monthlyRentalIncome * 12 * 0.95).toLocaleString()}`, 50, 505);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

// ==================================================
// CREDIT CARD STATEMENT GENERATOR
// ==================================================

function generateCreditCardStatement(applicantKey, cardInfo, statementMonth) {
  const applicant = APPLICANTS[applicantKey];
  const doc = new PDFDocument({ margin: 50 });
  const cardId = cardInfo.company.toLowerCase().replace(/\s+/g, '-');
  const filename = `${applicantKey}-credit-card-${cardId}-${statementMonth}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'CREDIT CARD STATEMENT');
  
  doc.fontSize(12);
  doc.text(cardInfo.company.toUpperCase(), 50, 100);
  doc.fontSize(10);
  doc.text(`Statement Period: ${statementMonth}`, 400, 100);
  
  doc.moveTo(50, 125).lineTo(562, 125).stroke();
  
  doc.text(`Account Holder: ${applicant.name}`, 50, 135);
  doc.text('Account Number: XXXX-XXXX-XXXX-4567', 50, 155);
  doc.text(`Credit Limit: $${cardInfo.limit.toLocaleString()}`, 50, 175);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('ACCOUNT SUMMARY', 50, 210, { underline: true });
  doc.fontSize(10);
  
  doc.text('Previous Balance:', 50, 235);
  doc.text(`$${(cardInfo.balance * 1.1).toFixed(2)}`, 200, 235);
  
  doc.text('Payments/Credits:', 50, 255);
  doc.text(`-$${(cardInfo.monthlyPayment * 1.5).toFixed(2)}`, 200, 255);
  
  doc.text('Purchases:', 50, 275);
  doc.text(`$${(cardInfo.balance * 0.05).toFixed(2)}`, 200, 275);
  
  doc.text('Fees & Interest:', 50, 295);
  doc.text(`$${(cardInfo.balance * 0.015).toFixed(2)}`, 200, 295);
  
  doc.moveTo(50, 320).lineTo(300, 320).stroke();
  
  doc.text('Current Balance:', 50, 335, { underline: true });
  doc.text(`$${cardInfo.balance.toFixed(2)}`, 200, 335);
  
  doc.text('Minimum Payment Due:', 50, 360);
  doc.text(`$${cardInfo.monthlyPayment.toFixed(2)}`, 200, 360);
  
  doc.text('Payment Due Date:', 50, 380);
  doc.text('01/25/2026', 200, 380);
  
  // Utilization
  const utilization = ((cardInfo.balance / cardInfo.limit) * 100).toFixed(1);
  doc.text(`Credit Utilization: ${utilization}%`, 50, 410);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('RECENT TRANSACTIONS', 50, 450, { underline: true });
  doc.fontSize(9);
  
  const transactions = [
    ['12/01', 'Amazon.com', 125.99],
    ['12/05', 'King Soopers', 89.45],
    ['12/08', 'Shell Gas Station', 52.00],
    ['12/12', 'Netflix', 15.99],
    ['12/15', 'Target', 78.23]
  ];
  
  let y = 470;
  transactions.forEach(([date, desc, amount]) => {
    doc.text(date, 50, y);
    doc.text(desc, 100, y);
    doc.text(`$${amount.toFixed(2)}`, 300, y);
    y += 18;
  });
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

// ==================================================
// AUTO LOAN STATEMENT GENERATOR
// ==================================================

function generateAutoLoanStatement(applicantKey, loanInfo, statementMonth) {
  const applicant = APPLICANTS[applicantKey];
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-auto-loan-${statementMonth}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'AUTO LOAN STATEMENT');
  
  doc.fontSize(12);
  doc.text(loanInfo.lender.toUpperCase(), 50, 100);
  doc.fontSize(10);
  doc.text(`Statement Date: ${statementMonth}`, 400, 100);
  
  doc.moveTo(50, 125).lineTo(562, 125).stroke();
  
  doc.text(`Borrower: ${applicant.name}`, 50, 135);
  doc.text('Account Number: XXXX-XXXX-5678', 50, 155);
  doc.text(`Vehicle: ${loanInfo.vehicle}`, 50, 175);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('LOAN SUMMARY', 50, 210, { underline: true });
  doc.fontSize(10);
  
  doc.text('Original Loan Amount:', 50, 235);
  doc.text('$35,000.00', 220, 235);
  
  doc.text('Current Principal Balance:', 50, 255);
  doc.text(`$${loanInfo.balance.toLocaleString()}.00`, 220, 255);
  
  doc.text('Interest Rate:', 50, 275);
  doc.text('5.99% APR', 220, 275);
  
  doc.text('Monthly Payment:', 50, 295);
  doc.text(`$${loanInfo.monthlyPayment.toFixed(2)}`, 220, 295);
  
  doc.text('Remaining Term:', 50, 315);
  doc.text('36 months', 220, 315);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('PAYMENT INFORMATION', 50, 360, { underline: true });
  doc.fontSize(10);
  
  doc.text('Next Payment Due:', 50, 385);
  doc.text('01/15/2026', 220, 385);
  
  doc.text('Payment Amount:', 50, 405);
  doc.text(`$${loanInfo.monthlyPayment.toFixed(2)}`, 220, 405);
  
  doc.text('Payment Status:', 50, 425);
  doc.text('Current - All payments on time', 220, 425);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('PAYMENT HISTORY', 50, 470, { underline: true });
  doc.fontSize(10);
  doc.text('Last 12 Months: All payments made on time', 50, 495);
  doc.text('Late Payments: 0', 50, 515);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

// ==================================================
// STUDENT LOAN STATEMENT GENERATOR
// ==================================================

function generateStudentLoanStatement(applicantKey, loanInfo, statementMonth) {
  const applicant = APPLICANTS[applicantKey];
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-student-loan-${statementMonth}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'STUDENT LOAN STATEMENT');
  
  doc.fontSize(12);
  doc.text(loanInfo.servicer.toUpperCase(), 50, 100);
  doc.fontSize(10);
  doc.text(`Statement Date: ${statementMonth}`, 400, 100);
  
  doc.moveTo(50, 125).lineTo(562, 125).stroke();
  
  doc.text(`Borrower: ${applicant.name}`, 50, 135);
  doc.text('Account Number: XXXX-6789', 50, 155);
  doc.text('Loan Type: Federal Direct Subsidized', 50, 175);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('LOAN SUMMARY', 50, 210, { underline: true });
  doc.fontSize(10);
  
  doc.text('Original Loan Amount:', 50, 235);
  doc.text('$65,000.00', 220, 235);
  
  doc.text('Current Balance:', 50, 255);
  doc.text(`$${loanInfo.balance.toLocaleString()}.00`, 220, 255);
  
  doc.text('Interest Rate:', 50, 275);
  doc.text('4.53% Fixed', 220, 275);
  
  doc.text('Monthly Payment:', 50, 295);
  doc.text(`$${loanInfo.monthlyPayment.toFixed(2)}`, 220, 295);
  
  doc.text('Repayment Plan:', 50, 315);
  doc.text('Standard 10-Year', 220, 315);
  
  doc.text('Loan Status:', 50, 335);
  doc.text('In Repayment', 220, 335);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('PAYMENT INFORMATION', 50, 380, { underline: true });
  doc.fontSize(10);
  
  doc.text('Next Payment Due:', 50, 405);
  doc.text('01/20/2026', 220, 405);
  
  doc.text('Amount Due:', 50, 425);
  doc.text(`$${loanInfo.monthlyPayment.toFixed(2)}`, 220, 425);
  
  doc.text('Payment Status:', 50, 445);
  doc.text('Current', 220, 445);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('PAYMENT HISTORY', 50, 490, { underline: true });
  doc.fontSize(10);
  doc.text('On-time Payment Rate: 100%', 50, 515);
  doc.text('Deferment/Forbearance: None', 50, 535);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

// ==================================================
// TAX RETURN (1040) GENERATOR
// ==================================================

function generateTaxReturn(applicantKey, year) {
  const applicant = APPLICANTS[applicantKey];
  const doc = new PDFDocument({ margin: 40 });
  const filename = `${applicantKey}-tax-return-${year}.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  
  // Tax return header
  doc.rect(0, 0, 612, 60).fill('#000000');
  doc.fillColor('#ffffff');
  doc.fontSize(8);
  doc.text('⚠️ SAMPLE TAX RETURN - FOR TESTING ONLY - NOT AN OFFICIAL IRS FORM', 50, 10, { align: 'center' });
  doc.fontSize(18);
  doc.text(`Form 1040 - U.S. Individual Income Tax Return ${year}`, 50, 30, { align: 'center' });
  doc.fillColor('#000000');
  
  // Income
  const income = applicant.annualSalary || applicant.netProfit || 100000;
  const isSelfEmployed = !!applicant.businessName;
  
  doc.fontSize(10);
  doc.text(`Filing Status: ${applicant.coBorrower ? 'Married Filing Jointly' : 'Single'}`, 50, 80);
  doc.text(`Name: ${applicant.name}`, 50, 100);
  doc.text(`SSN: ${applicant.ssn}`, 400, 100);
  if (applicant.address) {
    doc.text(`Address: ${applicant.address}`, 50, 120);
  }
  
  doc.moveTo(50, 145).lineTo(562, 145).stroke();
  
  doc.fontSize(12);
  doc.text('INCOME', 50, 160, { underline: true });
  doc.fontSize(10);
  
  let y = 185;
  if (isSelfEmployed) {
    doc.text('Line 1: Wages, salaries, tips', 50, y);
    doc.text('$0.00', 450, y);
    y += 20;
    doc.text('Line 3: Business income (Schedule C)', 50, y);
    doc.text(`$${applicant.netProfit.toLocaleString()}.00`, 450, y);
    y += 20;
  } else {
    doc.text('Line 1: Wages, salaries, tips', 50, y);
    doc.text(`$${income.toLocaleString()}.00`, 450, y);
    y += 20;
  }
  
  doc.text('Line 2b: Taxable interest', 50, y);
  doc.text('$250.00', 450, y);
  y += 20;
  
  doc.text('Line 3b: Qualified dividends', 50, y);
  doc.text('$500.00', 450, y);
  y += 30;
  
  doc.moveTo(50, y).lineTo(562, y).stroke();
  y += 10;
  
  doc.text('Line 9: Total income', 50, y);
  doc.text(`$${(income + 750).toLocaleString()}.00`, 450, y);
  y += 30;
  
  // Adjustments
  doc.fontSize(12);
  doc.text('ADJUSTMENTS TO INCOME', 50, y, { underline: true });
  doc.fontSize(10);
  y += 25;
  
  if (isSelfEmployed) {
    doc.text('Line 15: Self-employment tax deduction', 50, y);
    const seDeduction = (applicant.netProfit * 0.0765).toFixed(2);
    doc.text(`$${Number(seDeduction).toLocaleString()}`, 450, y);
    y += 20;
  }
  
  doc.text('Line 10c: IRA deduction', 50, y);
  doc.text('$6,500.00', 450, y);
  y += 30;
  
  // AGI
  doc.moveTo(50, y).lineTo(562, y).stroke();
  y += 10;
  
  const agi = income + 750 - 6500 - (isSelfEmployed ? applicant.netProfit * 0.0765 : 0);
  doc.fontSize(12);
  doc.text('Line 11: Adjusted Gross Income (AGI)', 50, y);
  doc.text(`$${agi.toLocaleString()}`, 450, y);
  doc.fontSize(10);
  y += 30;
  
  // Standard deduction
  doc.text('Line 12: Standard deduction', 50, y);
  const stdDeduction = applicant.coBorrower ? 29200 : 14600;
  doc.text(`$${stdDeduction.toLocaleString()}.00`, 450, y);
  y += 20;
  
  // Taxable income
  doc.text('Line 15: Taxable income', 50, y);
  doc.text(`$${(agi - stdDeduction).toLocaleString()}`, 450, y);
  y += 30;
  
  // Tax and payments
  doc.fontSize(12);
  doc.text('TAX AND PAYMENTS', 50, y, { underline: true });
  doc.fontSize(10);
  y += 25;
  
  const taxOwed = (agi - stdDeduction) * 0.22;
  doc.text('Line 16: Tax', 50, y);
  doc.text(`$${taxOwed.toLocaleString()}`, 450, y);
  y += 20;
  
  doc.text('Line 25d: Total tax withheld', 50, y);
  doc.text(`$${(taxOwed + 1500).toLocaleString()}`, 450, y);
  y += 30;
  
  // Refund
  doc.moveTo(50, y).lineTo(562, y).stroke();
  y += 10;
  doc.fontSize(12);
  doc.text('Line 34: Refund', 50, y);
  doc.text('$1,500.00', 450, y);
  
  // Signature
  y += 50;
  doc.fontSize(10);
  doc.text('Under penalties of perjury, I declare this return is correct and complete.', 50, y);
  y += 30;
  doc.text('_' + '_'.repeat(40), 50, y);
  doc.text('Signature', 50, y + 15);
  doc.text('Date: 04/15/' + (parseInt(year) + 1), 350, y);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - NOT VALID FOR TAX FILING OR LOAN APPLICATIONS', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

// ==================================================
// AUTHORIZATION CONSENT FORM GENERATOR
// ==================================================

function generateAuthorizationForm(applicantKey) {
  const applicant = APPLICANTS[applicantKey];
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-authorization.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'BORROWER AUTHORIZATION AND CONSENT');
  
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  doc.fontSize(10);
  doc.text('Borrower Information:', 50, 100, { underline: true });
  doc.text(`Name: ${applicant.name}`, 50, 120);
  doc.text(`SSN: ${applicant.ssn}`, 50, 140);
  if (applicant.address) {
    doc.text(`Address: ${applicant.address}`, 50, 160);
  }
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('AUTHORIZATION', 50, 200, { underline: true });
  doc.fontSize(10);
  
  doc.text(
    'I hereby authorize the lender, its designated agents, and any investor to whom the loan may be sold, ' +
    'to verify and obtain information as may be needed in connection with my loan application, including but not limited to:',
    50, 225, { lineGap: 5 }
  );
  
  doc.moveDown();
  doc.text('☑ Employment and income verification', 70, 280);
  doc.text('☑ Credit history and credit report', 70, 300);
  doc.text('☑ Bank account and asset verification', 70, 320);
  doc.text('☑ Previous mortgage payment history', 70, 340);
  doc.text('☑ Tax return verification (IRS 4506-C)', 70, 360);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('CONSENT', 50, 400, { underline: true });
  doc.fontSize(10);
  
  doc.text(
    'I understand that this information will be used to evaluate my creditworthiness and ability to repay ' +
    'the requested loan. I also understand that I have the right to dispute any information contained in ' +
    'my credit report.',
    50, 425, { lineGap: 5 }
  );
  
  doc.moveDown(2);
  doc.text('I have read and agree to the above authorizations.', 50, 490);
  
  doc.moveDown(2);
  doc.text('_' + '_'.repeat(40), 50, 530);
  doc.text(`Signature: ${applicant.name}`, 50, 550);
  doc.text(`Date: ${today}`, 50, 570);
  
  // IP Address simulation (electronic signature)
  doc.fontSize(8);
  doc.text(`Electronic Signature captured at IP: 192.168.1.${Math.floor(Math.random() * 255)}`, 50, 600);
  doc.text(`User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0`, 50, 615);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

// ==================================================
// DONOR BANK STATEMENT GENERATOR (for gift letter)
// ==================================================

function generateDonorBankStatement(applicantKey) {
  const applicant = APPLICANTS[applicantKey];
  if (!applicant.giftDonor) return;
  
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${applicantKey}-donor-bank-statement.pdf`;
  
  doc.pipe(fs.createWriteStream(path.join(OUTPUT_DIR, filename)));
  
  addWatermark(doc);
  addHeader(doc, 'MONTHLY BANK STATEMENT');
  
  doc.fontSize(10);
  doc.text('First National Bank', 50, 120);
  doc.text('Statement Period: December 2025', 400, 120);
  doc.text('Account: SAVINGS ****7890', 50, 140);
  
  doc.moveTo(50, 170).lineTo(562, 170).stroke();
  
  doc.text(`Account Holder: ${applicant.giftDonor.name}`, 50, 180);
  doc.text(`Address: ${applicant.giftDonor.address}`, 50, 200);
  
  doc.fontSize(12);
  doc.text('ACCOUNT SUMMARY', 50, 235, { underline: true });
  doc.fontSize(10);
  
  const giftAmount = applicant.giftAmount || 35000;
  const additionalFunds = 25000;
  const beginningBalance = giftAmount + additionalFunds;
  
  doc.text('Beginning Balance:', 50, 260);
  doc.text(`$${beginningBalance.toLocaleString()}.00`, 200, 260);
  
  doc.text('Deposits:', 50, 280);
  doc.text('$2,500.00', 200, 280);
  
  doc.text('Withdrawals:', 50, 300);
  doc.text(`$${giftAmount.toLocaleString()}.00`, 200, 300);
  doc.text(`(Transfer to ${applicant.name})`, 280, 300);
  
  doc.text('Ending Balance:', 50, 330, { underline: true });
  doc.text(`$${(beginningBalance + 2500 - giftAmount).toLocaleString()}.00`, 200, 330);
  
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text('TRANSACTION HISTORY', 50, 380, { underline: true });
  doc.fontSize(9);
  
  doc.text('Date', 50, 405);
  doc.text('Description', 120, 405);
  doc.text('Debit', 380, 405);
  doc.text('Credit', 450, 405);
  doc.text('Balance', 510, 405);
  
  doc.text('12/01', 50, 430);
  doc.text('Beginning Balance', 120, 430);
  doc.text('', 380, 430);
  doc.text('', 450, 430);
  doc.text(`$${beginningBalance.toLocaleString()}`, 510, 430);
  
  doc.text('12/10', 50, 450);
  doc.text('Interest Payment', 120, 450);
  doc.text('', 380, 450);
  doc.text('$45.00', 450, 450);
  doc.text(`$${(beginningBalance + 45).toLocaleString()}`, 510, 450);
  
  doc.text('12/15', 50, 470);
  doc.text('Deposit - Transfer In', 120, 470);
  doc.text('', 380, 470);
  doc.text('$2,455.00', 450, 470);
  doc.text(`$${(beginningBalance + 2500).toLocaleString()}`, 510, 470);
  
  doc.text('12/20', 50, 490);
  doc.text(`Wire Transfer to ${applicant.name}`, 120, 490);
  doc.text(`$${giftAmount.toLocaleString()}`, 380, 490);
  doc.text('', 450, 490);
  doc.text(`$${(beginningBalance + 2500 - giftAmount).toLocaleString()}`, 510, 490);
  
  doc.text('12/31', 50, 510);
  doc.text('Ending Balance', 120, 510);
  doc.text('', 380, 510);
  doc.text('', 450, 510);
  doc.text(`$${(beginningBalance + 2500 - giftAmount).toLocaleString()}`, 510, 510);
  
  doc.fontSize(10);
  doc.text(`\nNote: Wire transfer of $${giftAmount.toLocaleString()} to ${applicant.name} represents gift funds`, 50, 550);
  doc.text('for down payment assistance. See accompanying Gift Letter.', 50, 565);
  
  doc.fontSize(8);
  doc.text('SAMPLE DOCUMENT - FOR TESTING PURPOSES ONLY', 50, 700, { align: 'center' });
  
  doc.end();
  console.log(`✅ Generated: ${filename}`);
}

// ==================================================
// MAIN GENERATOR
// ==================================================

async function generateAllDocuments() {
  console.log('📄 Generating COMPLETE Test Documents for All Scenarios...\n');
  console.log('Output directory:', OUTPUT_DIR);
  console.log('');
  
  // Generate documents for each applicant based on their profile
  for (const [key, applicant] of Object.entries(APPLICANTS)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`👤 Generating COMPLETE document set for: ${applicant.name} (${key})`);
    console.log('='.repeat(60));
    
    // =============================================
    // INCOME VERIFICATION DOCUMENTS
    // =============================================
    
    // W-2 employee documents (pay stubs, W-2s)
    if (applicant.annualSalary && !applicant.businessName) {
      console.log('\n📋 Income Documents (W-2 Employee):');
      generatePayStub(key, '2025-11-15_to_2025-11-30');
      generatePayStub(key, '2025-12-01_to_2025-12-15');
      generateW2(key, '2024');
      generateW2(key, '2023');
    }
    
    // Self-employed documents (P&L, Tax Returns)
    if (applicant.businessName) {
      console.log('\n📋 Income Documents (Self-Employed):');
      generateProfitLossStatement(key, '2024');
      generateProfitLossStatement(key, '2025-YTD');
      generateTaxReturn(key, '2023');
      generateTaxReturn(key, '2024');
    }
    
    // Tax returns for high-income W-2 employees (over $100k often need tax returns)
    if (applicant.annualSalary && applicant.annualSalary >= 100000 && !applicant.businessName) {
      console.log('\n📋 Additional Tax Returns (High Income):');
      generateTaxReturn(key, '2023');
      generateTaxReturn(key, '2024');
    }
    
    // =============================================
    // ASSET VERIFICATION DOCUMENTS
    // =============================================
    
    console.log('\n💰 Asset Documents:');
    generateBankStatement(key, '2025-10');
    generateBankStatement(key, '2025-11');
    generateBankStatement(key, '2025-12');
    
    // Donor bank statement for gift funds scenario
    if (applicant.giftDonor) {
      console.log('\n🎁 Gift Fund Documents:');
      generateDonorBankStatement(key);
    }
    
    // =============================================
    // IDENTIFICATION DOCUMENTS
    // =============================================
    
    console.log('\n🪪 Identification Documents:');
    if (applicant.usePassport) {
      generatePassport(key);
    } else {
      generateDriversLicense(key);
    }
    
    // VA Certificate for veterans
    if (applicant.isVeteran) {
      console.log('\n🎖️ Military Documents:');
      generateVACertificate(key);
    }
    
    // =============================================
    // LIABILITY VERIFICATION DOCUMENTS
    // =============================================
    
    if (applicant.liabilities) {
      console.log('\n💳 Liability Documents:');
      
      // Credit card statements
      if (applicant.liabilities.creditCard) {
        generateCreditCardStatement(key, applicant.liabilities.creditCard, '2025-12');
      }
      if (applicant.liabilities.creditCard2) {
        generateCreditCardStatement(key, applicant.liabilities.creditCard2, '2025-12');
      }
      if (applicant.liabilities.creditCardA) {
        generateCreditCardStatement(key, applicant.liabilities.creditCardA, '2025-12');
      }
      if (applicant.liabilities.creditCardB) {
        generateCreditCardStatement(key, applicant.liabilities.creditCardB, '2025-12');
      }
      
      // Auto loan statements
      if (applicant.liabilities.autoLoan) {
        generateAutoLoanStatement(key, applicant.liabilities.autoLoan, '2025-12');
      }
      
      // Student loan statements
      if (applicant.liabilities.studentLoan) {
        generateStudentLoanStatement(key, applicant.liabilities.studentLoan, '2025-12');
      }
    }
    
    // Existing mortgage statement for refinance
    if (applicant.currentMortgageBalance || applicant.isRefinance) {
      console.log('\n🏠 Existing Mortgage Documents:');
      generateExistingMortgageStatement(key);
    }
    
    // Existing mortgages for investment property buyers
    if (applicant.existingMortgages && Array.isArray(applicant.existingMortgages)) {
      console.log('\n🏠 Existing Mortgage Documents (Investment):');
      // Generate a mortgage statement showing all properties
      generateExistingMortgageStatement(key);
    }
    
    // Rental income statement for investment property buyers
    if (applicant.monthlyRentalIncome) {
      console.log('\n🏢 Rental Income Documents:');
      generateRentalIncomeStatement(key);
    }
    
    // =============================================
    // AUTHORIZATION & CONSENT DOCUMENTS
    // =============================================
    
    console.log('\n✍️ Authorization Documents:');
    generateAuthorizationForm(key);
    
    // =============================================
    // PURCHASE AGREEMENT (for purchases, not refinances)
    // =============================================
    
    if (applicant.purchaseInfo && !applicant.isRefinance) {
      console.log('\n📝 Purchase Agreement:');
      generatePurchaseAgreement(
        applicant.name,
        applicant.purchaseInfo.propertyAddress,
        applicant.purchaseInfo.purchasePrice
      );
    }
    
    // =============================================
    // GIFT LETTER (for gift funds scenario)
    // =============================================
    
    if (applicant.giftDonor) {
      console.log('\n🎁 Gift Letter:');
      generateGiftLetter(
        `${applicant.giftDonor.name} (${applicant.giftDonor.relationship})`,
        applicant.name,
        applicant.giftAmount || 35000
      );
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TEST DOCUMENTS GENERATED - COMPLETE SETS');
  console.log('='.repeat(60));
  console.log(`\n📁 Documents saved to: ${OUTPUT_DIR}`);
  console.log('\nGenerated documents include:');
  console.log('  📋 INCOME VERIFICATION:');
  console.log('    • Pay stubs (2 per W-2 employee)');
  console.log('    • W-2 forms (2 years per W-2 employee)');
  console.log('    • Tax returns (for self-employed and high-income)');
  console.log('    • P&L statements (self-employed)');
  console.log('  💰 ASSET VERIFICATION:');
  console.log('    • Bank statements (3 months per applicant)');
  console.log('    • Donor bank statements (gift funds scenario)');
  console.log('  🪪 IDENTIFICATION:');
  console.log('    • Driver\'s licenses');
  console.log('    • Passports (non-resident)');
  console.log('    • VA Certificate of Eligibility (veterans)');
  console.log('  💳 LIABILITY VERIFICATION:');
  console.log('    • Credit card statements');
  console.log('    • Auto loan statements');
  console.log('    • Student loan statements');
  console.log('    • Existing mortgage statements');
  console.log('  ✍️ CONSENT & CONTRACTS:');
  console.log('    • Authorization/consent forms');
  console.log('    • Purchase agreements');
  console.log('    • Gift letters');
  console.log('    • Rental income verification');
  console.log('\n⚠️  All documents are clearly marked as SAMPLE/TEST documents');
  console.log('    and should only be used for testing purposes.');
  console.log('\n🔑 Each applicant (except denied.nodocs) has a COMPLETE document set');
  console.log('   ready for AI agent processing on the admin platform.\n');
}

// Run the generator
generateAllDocuments().catch(console.error);

