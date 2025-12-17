require('dotenv').config();
const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const port = process.env.PORT || 3000;

const bcrypt = require('bcrypt');
const session = require('express-session');

// White-label branding configuration
const branding = require('./config/branding');

// -------------------------------------------
// DEMO MODE - No Database Connection Required
// -------------------------------------------
console.log('🎭 Running in DEMO MODE - No database connection');

// -------------------------------------------
// Middleware Setup
// -------------------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'demo-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Make branding available to all templates
app.use((req, res, next) => {
  res.locals.branding = branding;
  next();
});

// -------------------------------------------
// View Engine and Static Paths
// -------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', false);

// -------------------------------------------
// Session Middleware (Demo Mode)
// -------------------------------------------
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.isPreApproved = req.session.isPreApproved || false;
  next();
});

function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

function enforceStepOrder(req, res, next) {
  const currentStep = parseInt(req.params.step);
  if (!req.session.completedSteps) {
    req.session.completedSteps = [];
  }
  if (currentStep > 1 && !req.session.completedSteps.includes(currentStep - 1)) {
    return res.redirect(`/preapproval/step/${req.session.completedSteps.slice(-1)[0] || 1}`);
  }
  next();
}

function preventPreApprovedAccess(req, res, next) {
  if (res.locals.isPreApproved) {
    return res.redirect('/preapproval/thank-you');
  }
  next();
}

// -------------------------------------------
// Start Server
// -------------------------------------------
app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
  console.log(`📝 Demo credentials: any email/password combination`);
});

// -------------------------------------------
// Home Route
// -------------------------------------------
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile');
  }
  res.redirect('/login');
});

// -------------------------------------------
// Authentication Routes (Demo Mode)
// -------------------------------------------
app.get('/signup', (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile');
  }
  res.render('signup', { showMessage: false });
});

app.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  req.session.user = { 
    Email: email, 
    email: email,
    userID: 1,
    Name: name || 'Demo User'
  };
  req.session.isPreApproved = false;
  console.log(`📝 Demo signup: ${email}`);
  res.redirect('/profile');
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile');
  }
  res.render('login', { showMessage: false });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  req.session.user = { 
    Email: email,
    email: email, 
    userID: 1 
  };
  req.session.isPreApproved = false;
  console.log(`🔐 Demo login: ${email}`);
  res.redirect('/profile');
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// -------------------------------------------
// Profile Route (Demo Mode)
// -------------------------------------------
app.get('/profile', ensureAuthenticated, (req, res) => {
  const isPreApproved = req.session.isPreApproved || false;
  const preApprovalData = req.session.preApprovalData || null;
  
  res.render('profile', {
    layout: 'layouts/layoutProfile',
    title: 'My Profile',
    user: req.session.user,
    isPreApproved,
    preApprovalData,
    applicationData: null,
    authorizationsData: null,
    identificationData: null,
    incomeData: null,
    assetData: null,
    liabilityData: null,
    disclosuresData: null,
    coBorrowerData: null,
    purchaseAgreementData: null,
    giftLetterData: null
  });
});

// -------------------------------------------
// Pre-Approval Routes (Demo Mode)
// -------------------------------------------
app.get('/preapproval', ensureAuthenticated, preventPreApprovedAccess, (req, res) => {
  res.render('preapproval/index');
});

app.get('/preapproval/step/:step', ensureAuthenticated, preventPreApprovedAccess, enforceStepOrder, (req, res) => {
  const step = parseInt(req.params.step);
  if (!req.session.preApprovalData) {
    req.session.preApprovalData = {};
  }
  if (step > 6) {
    return res.redirect('/preapproval/review');
  }
  res.render(`preapproval/step${step}`, { data: req.session.preApprovalData });
});

app.post('/preapproval/step/:step', ensureAuthenticated, preventPreApprovedAccess, (req, res) => {
  const step = parseInt(req.params.step);
  if (!req.session.preApprovalData) {
    req.session.preApprovalData = {};
  }
  req.session.preApprovalData[`step${step}`] = req.body;

  if (step === 6) {
    const { addCoBorrower } = req.body;
    req.session.preApprovalData.addCoBorrower = addCoBorrower;
    if (addCoBorrower === 'yes') {
      req.session.preApprovalData.coBorrower = {
        firstName: req.body.coFirstName,
        lastName: req.body.coLastName,
        dateOfBirth: req.body.coDateOfBirth,
        email: req.body.coEmail,
        phoneNumber: req.body.coPhoneNumber,
        ssn: req.body.coSSN,
        employmentStatus: req.body.coEmploymentStatus,
        annualIncome: req.body.coAnnualIncome,
        monthlyDebt: req.body.coMonthlyDebt || 0
      };
    }
  }

  if (!req.session.completedSteps) {
    req.session.completedSteps = [];
  }
  if (!req.session.completedSteps.includes(step)) {
    req.session.completedSteps.push(step);
  }

  if (step < 6) {
    res.redirect(`/preapproval/step/${step + 1}`);
  } else {
    res.redirect(`/preapproval/review`);
  }
});

app.get('/preapproval/review', ensureAuthenticated, (req, res) => {
  const data = req.session.preApprovalData;
  res.render('preapproval/review', { data });
});

app.post('/preapproval/submit', ensureAuthenticated, preventPreApprovedAccess, (req, res) => {
  // In demo mode, just set pre-approved status
  req.session.isPreApproved = true;
  req.session.preApprovalData = req.session.preApprovalData || { step5: { annualIncome: 100000, monthlyDebt: 500 } };
  console.log('📋 Demo pre-approval submitted');
  res.redirect('/preapproval/thank-you');
});

function calculatePreApprovedLoanAmount(applicationData) {
  let annualIncome = Number(applicationData?.step5?.annualIncome || 100000);
  if (applicationData?.addCoBorrower === 'yes' && applicationData?.coBorrower) {
    annualIncome += Number(applicationData.coBorrower.annualIncome || 0);
  }
  const monthlyIncome = annualIncome / 12;
  let monthlyDebts = Number(applicationData?.step5?.monthlyDebt || 500);
  if (applicationData?.addCoBorrower === 'yes' && applicationData?.coBorrower) {
    monthlyDebts += Number(applicationData.coBorrower.monthlyDebt || 0);
  }
  // Danish Realkredit Model: 30% housing DTI, 40% total DTI
  const maxHousingExpense = monthlyIncome * 0.30;
  const maxDebtExpense = (monthlyIncome * 0.40) - monthlyDebts;
  const maxMortgagePayment = Math.min(maxHousingExpense, maxDebtExpense);
  if (maxMortgagePayment <= 0) return 0;
  // Total rate: 4% bond + 0.75% bidrag + 1% stress buffer = 5.75%
  const totalRate = 0.04 + 0.0075 + 0.01;
  const r = totalRate / 12;
  const n = 360;
  return Math.round(maxMortgagePayment * (1 - Math.pow(1 + r, -n)) / r);
}

app.get('/preapproval/thank-you', ensureAuthenticated, (req, res) => {
  const applicationData = req.session.preApprovalData || { step5: { annualIncome: 100000, monthlyDebt: 500 } };
  const maximumLoanAmount = calculatePreApprovedLoanAmount(applicationData);
  res.render('preapproval/thank-you', {
    maximumLoanAmount,
    isPreApproved: true
  });
});

// -------------------------------------------
// Static Files
// -------------------------------------------
app.use(express.static('public'));
