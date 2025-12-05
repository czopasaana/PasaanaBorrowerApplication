require('dotenv').config();
const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const port = process.env.PORT || 3000;

const bcrypt = require('bcrypt');
const session = require('express-session');
const { OpenAI } = require('openai');
const { getConnection } = require('./Db');
const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');

// -------------------------------------------
// OpenAI Configuration
// -------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// -------------------------------------------
// Middleware Setup
// -------------------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key', // Replace with a secure secret
  resave: false,
  saveUninitialized: true
}));

// -------------------------------------------
// View Engine and Static Paths
// -------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use express-ejs-layouts
app.use(expressLayouts);
app.set('layout', false);

// -------------------------------------------
// Database Connection Setup
// -------------------------------------------
let pool;
async function connectToDatabase() {
  try {
    pool = await getConnection();
    console.log('Connected to Azure SQL database.');
  } catch (err) {
    console.error('Database connection failed:', err);
    console.error('Error Stack:', err.stack);
  }
}

connectToDatabase().then(() => {
  app.locals.pool = pool;
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});

// -------------------------------------------
// Session and User Status Middleware
// -------------------------------------------
// This middleware checks the user's login session, sets template variables
// like user and isPreApproved, and handles pre-approval logic.
app.use(async (req, res, next) => {
  res.locals.user = req.session.user;

  if (req.session.user) {
    try {
      const preApprovalResult = await pool
        .request()
        .input('userID', sql.Int, req.session.user.userID)
        .query(`
          SELECT TOP 1 IsPreApproved FROM PreApprovalApplications
          WHERE UserID = @userID
          ORDER BY SubmissionDate DESC
        `);
      res.locals.isPreApproved =
        preApprovalResult.recordset.length > 0 && preApprovalResult.recordset[0].IsPreApproved;
    } catch (err) {
      console.error('Error fetching pre-approval status:', err);
      res.locals.isPreApproved = false;
    }
  } else {
    res.locals.isPreApproved = false;
  }

  next();
});

function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  if (!req.session.returnTo) {
    req.session.returnTo = req.originalUrl;
  }
  res.redirect('/login');
}

function enforceStepOrder(req, res, next) {
  const totalSteps = 6;
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
// Azure Blob Storage Setup
// -------------------------------------------
// Configures blob storage access and provides a helper function to generate
// SAS URLs for blobs, allowing secure temporary access to uploaded files.
const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const propertyImagesContainer = process.env.AZURE_STORAGE_CONTAINER_NAME;

const blobServiceClient = new BlobServiceClient(
  `https://${storageAccountName}.blob.core.windows.net`
);

/**
 * Generates a SAS URL for a given blob to allow secure, temporary access.
 * @param {string} containerName - The name of the container
 * @param {string} blobName - The name of the blob
 * @returns {string} A fully qualified SAS URL for the blob
 */
function generateBlobSasUrl(containerName, blobName) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  const separator = blobClient.url.includes('?') ? '&' : '?';
  return `${blobClient.url}${separator}${sasToken}`;
}

// -------------------------------------------
// Authentication and User Routes
// -------------------------------------------
// Handles user signup, login, logout, and profile rendering.
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/signup', (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile');
  }
  if (req.query.from === 'navbar') {
    delete req.session.returnTo;
  }
  const showMessage = req.session.returnTo ? true : false;
  res.render('signup', { showMessage });
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool
      .request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (result.recordset.length > 0) {
      return res.send('User already exists. Please sign in.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await pool
      .request()
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, hashedPassword)
      .query('INSERT INTO Users (Email, Password) OUTPUT INSERTED.UserID VALUES (@email, @password)');

    const userID = insertResult.recordset[0].UserID;
    req.session.user = { email, userID };

    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    return res.redirect(redirectTo);
  } catch (err) {
    console.error('Sign up error:', err.message);
    res.redirect('/signup');
  }
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile');
  }
  if (req.query.from === 'navbar') {
    delete req.session.returnTo;
  }
  const showMessage = req.session.returnTo ? true : false;
  res.render('login', { showMessage });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool
      .request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    const user = result.recordset[0];
    if (user && await bcrypt.compare(password, user.Password)) {
      req.session.user = { email: user.Email, userID: user.UserID };
      const redirectTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      return res.redirect(redirectTo);
    } else if (user) {
      return res.send('Incorrect password.');
    } else {
      return res.send('User not found.');
    }
  } catch (err) {
    console.error('Login error:', err.message);
    res.redirect('/login');
  }
});

app.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const preApprovalResult = await pool
      .request()
      .input('userID', sql.Int, req.session.user.userID)
      .query('SELECT TOP 1 * FROM PreApprovalApplications WHERE UserID = @userID');

    const isPreApproved = preApprovalResult.recordset.length > 0;

    // Fetching and preparing user-related data for various tasks (URLA)
    const normAppRes = await pool
      .request()
      .input('UserID', sql.Int, req.session.user.userID)
      .query(`
        SELECT TOP 1 id, type_of_credit, loan_purpose, loan_term_months, loan_type, rate_lock_flag, application_status
        FROM dbo.loan_applications
        WHERE user_id = @UserID
        ORDER BY created_at DESC
      `);

    let applicationData = null;
    if (normAppRes.recordset.length > 0) {
      const app = normAppRes.recordset[0];

      // Fetch primary borrower linked to this application
      const borRes = await pool
        .request()
        .input('ApplicationID', sql.BigInt, app.id)
        .query(`
          SELECT TOP 1 b.*
          FROM dbo.application_borrowers ab
          JOIN dbo.borrowers b ON b.id = ab.borrower_id
          WHERE ab.application_id = @ApplicationID AND ab.borrower_role = 'Primary'
        `);
      const borrower = borRes.recordset[0];

      applicationData = {
        BorrowerFirstName: borrower ? borrower.first_name : null,
        BorrowerMiddleName: borrower ? borrower.middle_name : null,
        BorrowerLastName: borrower ? borrower.last_name : null,
        BorrowerSuffix: borrower ? borrower.suffix : null,
        BorrowerDOB: borrower ? borrower.dob : null,
        AlternateNames: borrower ? borrower.alternate_names : null,
        EmailAddress: borrower ? borrower.email : null,
        HomePhone: borrower ? borrower.home_phone : null,
        CellPhone: borrower ? borrower.cell_phone : null,
        WorkPhone: borrower ? borrower.work_phone : null,
        Citizenship: borrower ? borrower.citizenship_status : null,
        MaritalStatus: borrower ? borrower.marital_status : null,
        DependentsNumber: borrower ? borrower.number_of_dependents : null,
        TypeOfCredit: app.type_of_credit,
        LoanPurpose: app.loan_purpose,
        LoanTerm: app.loan_term_months,
        LoanType: app.loan_type,
        RateLock: app.rate_lock_flag,
        ApplicationStatus: app.application_status
      };
    }

    const authResult = await pool
      .request()
      .input('UserID', sql.Int, req.session.user.userID)
      .query('SELECT TOP 1 * FROM AuthorizationsConsent WHERE UserID = @UserID ORDER BY CreatedAt DESC');

    let authorizationsData = null;
    if (authResult.recordset.length > 0) {
      const row = authResult.recordset[0];
      authorizationsData = {
        ESignature: row.ESignature,
        HasAgreed: row.HasAgreed,
        ApplicationStatus: row.ApplicationStatus
      };
    }

    const idResult = await pool
      .request()
      .input('UserID', sql.Int, req.session.user.userID)
      .query('SELECT TOP 1 * FROM IdentificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC');

    let identificationData = null;
    if (idResult.recordset.length > 0) {
      const row = idResult.recordset[0];
      identificationData = {
        IDFilePath: row.IDFilePath,
        ApplicationStatus: row.ApplicationStatus
      };

      // Generate a SAS URL for the uploaded ID, if present
      const identificationContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME_IDENTIFICATION;
      if (identificationData && identificationData.IDFilePath) {
        identificationData.IDUrl = generateBlobSasUrl(identificationContainerName, identificationData.IDFilePath);
      }      
    }

    const incomeResult = await pool.request()
    .input('UserID', sql.Int, req.session.user.userID)
    .query('SELECT TOP 1 * FROM IncomeVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC');
  
  let incomeData = null;
  if (incomeResult.recordset.length > 0) {
    const row = incomeResult.recordset[0];
    incomeData = {
      ApplicationStatus: row.ApplicationStatus,
      PayStubsFiles: row.PayStubsFiles,
      W2Files: row.W2Files,
      TaxReturnsFiles: row.TaxReturnsFiles,
      Form1099Files: row.Form1099Files,
      PnLFiles: row.PnLFiles
    };
  
    const incomeContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME_INCOME;
  
    function blobsToUrls(blobsStr) {
      if (!blobsStr) return [];
      return blobsStr.split(',').map(blobName => {
        return {
          name: blobName,
          url: generateBlobSasUrl(incomeContainerName, blobName)
        };
      });
    }
  
    incomeData.PayStubs = blobsToUrls(incomeData.PayStubsFiles);
    incomeData.W2s = blobsToUrls(incomeData.W2Files);
    incomeData.TaxReturns = blobsToUrls(incomeData.TaxReturnsFiles);
    incomeData.Form1099s = blobsToUrls(incomeData.Form1099Files);
    incomeData.PnL = blobsToUrls(incomeData.PnLFiles);
  }
  

  const assetResult = await pool.request()
  .input('UserID', sql.Int, req.session.user.userID)
  .query('SELECT TOP 1 * FROM AssetVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC');

    let assetData = null;
    if (assetResult.recordset.length > 0) {
      const row = assetResult.recordset[0];
      assetData = {
        ApplicationStatus: row.ApplicationStatus,
        BankStatementsFiles: row.BankStatementsFiles,
        InvestmentStatementsFiles: row.InvestmentStatementsFiles,
        RetirementStatementsFiles: row.RetirementStatementsFiles,
        LinkedAccountEnabled: row.LinkedAccountEnabled
      };

      const assetContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME_ASSET;

      function blobsToUrls(blobsStr) {
        if (!blobsStr || blobsStr.trim() === '') return [];
        return blobsStr.split(',').map(blobName => {
          return {
            name: blobName,
            url: generateBlobSasUrl(assetContainerName, blobName)
          };
        });
      }

      assetData.Bank = blobsToUrls(assetData.BankStatementsFiles);
      assetData.Investment = blobsToUrls(assetData.InvestmentStatementsFiles);
      assetData.Retirement = blobsToUrls(assetData.RetirementStatementsFiles);
    }

  const liabilityResult = await pool.request()
  .input('UserID', sql.Int, req.session.user.userID)
  .query('SELECT TOP 1 * FROM LiabilityVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC');
  
  let liabilityData = null;
  if (liabilityResult.recordset.length > 0) {
    const row = liabilityResult.recordset[0];
    liabilityData = {
      ApplicationStatus: row.ApplicationStatus,
      CreditCardStatementsFiles: row.CreditCardStatementsFiles,
      AutoLoanStatementsFiles: row.AutoLoanStatementsFiles,
      StudentLoanStatementsFiles: row.StudentLoanStatementsFiles,
      MortgageStatementFiles: row.MortgageStatementFiles
    };
  
    const liabilityContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME_LIABILITY;
  
    function parseFiles(str) {
      if (!str) return [];
      return str.split(',').map(blobName => ({
        name: blobName,
        url: generateBlobSasUrl(liabilityContainerName, blobName)
      }));
    }
  
    liabilityData.CreditCardStatements = parseFiles(liabilityData.CreditCardStatementsFiles);
    liabilityData.AutoLoanStatements = parseFiles(liabilityData.AutoLoanStatementsFiles);
    liabilityData.StudentLoanStatements = parseFiles(liabilityData.StudentLoanStatementsFiles);
    liabilityData.MortgageStatement = parseFiles(liabilityData.MortgageStatementFiles);
  }
  

    const disclosuresResult = await pool.request()
      .input('UserID', sql.Int, req.session.user.userID)
      .query('SELECT TOP 1 * FROM DisclosuresAndLoanEstimate WHERE UserID = @UserID ORDER BY CreatedAt DESC');

    let disclosuresData = null;
    if (disclosuresResult.recordset.length > 0) {
      const row = disclosuresResult.recordset[0];
      disclosuresData = {
        ApplicationStatus: row.ApplicationStatus
      };
    }

    const coBorrowerResult = await pool
      .request()
      .input('UserID', sql.Int, req.session.user.userID)
      .query("SELECT TOP 1 * FROM CoBorrowerInfo WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    let coBorrowerData = null;
    if (coBorrowerResult.recordset.length > 0) {
      const row = coBorrowerResult.recordset[0];
      coBorrowerData = {
        ApplicationStatus: row.ApplicationStatus
      };
    }

    const purchaseAgreementResult = await pool
    .request()
    .input('UserID', sql.Int, req.session.user.userID)
    .query("SELECT TOP 1 * FROM PurchaseAgreement WHERE UserID = @UserID ORDER BY CreatedAt DESC");
  
  let purchaseAgreementData = null;
  if (purchaseAgreementResult.recordset.length > 0) {
    const row = purchaseAgreementResult.recordset[0];
    purchaseAgreementData = {
      ApplicationStatus: row.ApplicationStatus
    };
  
    // If file uploaded
    if (row.AgreementFilePath) {
      const purchaseContainer = process.env.AZURE_STORAGE_CONTAINER_NAME_PURCHASE;
      purchaseAgreementData.AgreementUrl = generateBlobSasUrl(purchaseContainer, row.AgreementFilePath);
    }
  }
  

  const giftLetterResult = await pool
  .request()
  .input('UserID', sql.Int, req.session.user.userID)
  .query("SELECT TOP 1 * FROM GiftLetter WHERE UserID = @UserID ORDER BY CreatedAt DESC");

let giftLetterData = null;
if (giftLetterResult.recordset.length > 0) {
  const row = giftLetterResult.recordset[0];
  giftLetterData = {
    ApplicationStatus: row.ApplicationStatus,
    GiftLetterFilePath: row.GiftLetterFilePath
  };

  const giftLetterContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME_GIFTLETTER;
  if (giftLetterData.GiftLetterFilePath) {
        giftLetterData.GiftLetterUrl = generateBlobSasUrl(giftLetterContainerName, giftLetterData.GiftLetterFilePath);
      }
    }   

    res.render('profile', {
      layout: 'layouts/layoutProfile',
      title: 'My Profile',
      user: req.session.user,
      isPreApproved,
      applicationData,
      authorizationsData,
      identificationData,
      incomeData,
      assetData,
      liabilityData,
      disclosuresData,
      coBorrowerData,
      purchaseAgreementData,
      giftLetterData
    });

  } catch (err) {
    console.error('Error fetching user profile:', err.message);
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// -------------------------------------------
// Pre-Approval Routes and Steps
// -------------------------------------------
// Handles the pre-approval wizard steps, data collection, review, and submission.
app.get('/preapproval', ensureAuthenticated, preventPreApprovedAccess, (req, res) => {
  res.render('preapproval/index');
});

// External routes for mortgage and other tasks
const mortgageRoutes = require('./routes/mortgageRoutes');
app.use('/', mortgageRoutes);

const authorizationsRoutes = require('./routes/authorizationsRoutes'); 
app.use('/', authorizationsRoutes);

const identificationRoutes = require('./routes/identificationRoutes');
app.use('/', identificationRoutes);

const incomeRoutes = require('./routes/incomeRoutes');
app.use('/', incomeRoutes);

const assetRoutes = require('./routes/assetRoutes');
app.use('/', assetRoutes);

const liabilityRoutes = require('./routes/liabilityRoutes');
app.use('/', liabilityRoutes);

const disclosuresRoutes = require('./routes/disclosuresRoutes');
app.use('/', disclosuresRoutes);

const coBorrowerRoutes = require('./routes/coBorrowerRoutes');
app.use('/', coBorrowerRoutes);

const purchaseAgreementRoutes = require('./routes/purchaseAgreementRoutes');
app.use('/', purchaseAgreementRoutes);

const giftLetterRoutes = require('./routes/giftLetterRoutes');
app.use('/', giftLetterRoutes);

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
      const coBorrowerData = {
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
      req.session.preApprovalData.coBorrower = coBorrowerData;
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

app.post('/preapproval/submit', ensureAuthenticated, preventPreApprovedAccess, async (req, res) => {
  const data = req.session.preApprovalData;

  try {
    const applicationData = JSON.stringify(data);

    await pool
      .request()
      .input('userID', sql.Int, req.session.user.userID)
      .input('applicationData', sql.NVarChar(sql.MAX), applicationData)
      .query(`INSERT INTO PreApprovalApplications (UserID, ApplicationData) VALUES (@userID, @applicationData)`);

    req.session.isPreApproved = true;
    req.session.preApprovalData = null;

    res.redirect('/preapproval/thank-you');
  } catch (err) {
    console.error('Error saving pre-approval application:', err.message);
    res.redirect('/preapproval/review');
  }
});

function calculatePreApprovedLoanAmount(applicationData) {
  let annualIncome = Number(applicationData.step5.annualIncome || 0);

  if (applicationData.addCoBorrower === 'yes' && applicationData.coBorrower) {
    const coAnnualIncome = Number(applicationData.coBorrower.annualIncome || 0);
    annualIncome += coAnnualIncome;
  }

  const monthlyIncome = annualIncome / 12;
  let monthlyDebts = Number(applicationData.step5.monthlyDebt || 0);

  if (applicationData.addCoBorrower === 'yes' && applicationData.coBorrower) {
    const coMonthlyDebt = Number(applicationData.coBorrower.monthlyDebt || 0);
    monthlyDebts += coMonthlyDebt;
  }

  const maxHousingExpense = monthlyIncome * 0.28;
  const maxDebtExpense = (monthlyIncome * 0.36) - monthlyDebts;
  const maxMortgagePayment = Math.min(maxHousingExpense, maxDebtExpense);
  if (maxMortgagePayment <= 0) {
    return 0;
  }

  const annualInterestRate = 0.04;
  const monthlyInterestRate = annualInterestRate / 12;
  const loanTermYears = 30;
  const loanTermMonths = loanTermYears * 12;
  const r = monthlyInterestRate;
  const n = loanTermMonths;
  const P = maxMortgagePayment;

  let maxLoanAmount = P * (1 - Math.pow(1 + r, -n)) / r;
  return Math.round(maxLoanAmount);
}

app.get('/preapproval/thank-you', ensureAuthenticated, async (req, res) => {
  try {
    const userID = req.session.user.userID;

    const result = await pool
      .request()
      .input('userID', sql.Int, userID)
      .query(`
        SELECT TOP 1 ApplicationData, IsPreApproved FROM PreApprovalApplications
        WHERE UserID = @userID
        ORDER BY SubmissionDate DESC
      `);

    if (result.recordset.length === 0) {
      return res.redirect('/preapproval');
    }

    const applicationDataJSON = result.recordset[0].ApplicationData;
    const applicationData = JSON.parse(applicationDataJSON);
    const maximumLoanAmount = calculatePreApprovedLoanAmount(applicationData);

    res.locals.isPreApproved = result.recordset[0].IsPreApproved;
    res.render('preapproval/thank-you', {
      maximumLoanAmount,
      isPreApproved: true
    });
  } catch (error) {
    console.error('Error fetching application data:', error);
    res.redirect('/preapproval');
  }
});

// -------------------------------------------
// Other Pages and Calculators
// -------------------------------------------
// Routes for calculators, mortgage loans, and other informational pages.
app.get('/calculators', (req, res) => {
  res.render('calculators');
});

app.get('/affordability-calculator', (req, res) => {
  res.render('affordability-calculator');
});

app.get('/mortgage-calculator', (req, res) => {
  res.render('mortgage-calculator');
});

app.get('/mortgage-loans', (req, res) => {
  res.render('mortgage-loans');
});

app.get('/fixed-rate-loans', (req, res) => {
  res.render('fixed-rate-loans');
});

app.get('/variable-rate-loans', (req, res) => {
  res.render('variable-rate-loans');
});

app.get('/adjustable-rate', (req, res) => {
  res.render('adjustable-rate');
});

app.get('/f1-loan', (req, res) => {
  res.render('f1-loan');
});

app.get('/realtor-service', (req, res) => {
  res.render('realtor-service');
});

app.get('/explore-homes', (req, res) => {
  res.render('explore-homes');
});

// -------------------------------------------
// API Routes
// -------------------------------------------
// Provides JSON data for loan types.
app.get('/api/loan-types', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM LoanTypes');
    const loanTypes = result.recordset;
    const rates = {};

    loanTypes.forEach(loan => {
      rates[loan.LoanTypeCode] = {
        name: loan.Name,
        debtorInterestRate: loan.DebtorInterestRate,
        annualContributionRate: loan.AnnualContributionRate,
        apr: loan.APR,
        issuePrice: loan.IssuePrice,
        fees: {
          loanEstablishmentFee: loan.LoanEstablishmentFee,
          caseProcessingFee: loan.CaseProcessingFee,
          settlementCommission: loan.SettlementCommission,
          selfServiceDiscount: loan.SelfServiceDiscount,
          priceDeductionAtDisbursementPercent: loan.PriceDeductionAtDisbursementPercent,
          registrationFee: loan.RegistrationFee,
        },
      };
    });

    res.json(rates);
  } catch (error) {
    console.error('Error fetching loan types:', error.message);
    res.status(500).json({ error: 'Failed to fetch loan types.' });
  }
});

// -------------------------------------------
// Property Details Routes
// -------------------------------------------
// Handles property detail viewing, including images retrieved from Blob Storage.
app.get('/property/:id', async (req, res) => {
  const propertyId = parseInt(req.params.id);

  try {
    const propertyResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM Properties WHERE PropertyID = @PropertyID`);

    if (propertyResult.recordset.length === 0) {
      return res.status(404).send('Property not found');
    }

    const property = propertyResult.recordset[0];

    const imagesResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM Images WHERE PropertyID = @PropertyID ORDER BY Category, ImageNumber`);

    const images = imagesResult.recordset;

    for (const image of images) {
      const blobName = image.FileName.replace(/^images\//, '');
      image.Url = generateBlobSasUrl(propertyImagesContainer, blobName);
    }

    const bedroomsResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM Bedrooms WHERE PropertyID = @PropertyID ORDER BY BedroomNumber`);

    const bathroomsResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM Bathrooms WHERE PropertyID = @PropertyID`);

    const priceHistoryResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM PriceHistory WHERE PropertyID = @PropertyID ORDER BY DateListed DESC`);

    const taxHistoryResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM TaxHistory WHERE PropertyID = @PropertyID ORDER BY Year DESC`);

    const neighborhoodResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`
        SELECT n.*
        FROM Neighborhoods n
        JOIN PropertyNeighborhoods pn ON pn.NeighborhoodID = n.NeighborhoodID
        WHERE pn.PropertyID = @PropertyID
      `);

    const schoolsResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`
        SELECT s.*
        FROM Schools s
        JOIN PropertySchools ps ON ps.SchoolID = s.SchoolID
        WHERE ps.PropertyID = @PropertyID
      `);

    const amenitiesResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`
        SELECT a.*
        FROM Amenities a
        JOIN PropertyAmenities pa ON pa.AmenityID = a.AmenityID
        WHERE pa.PropertyID = @PropertyID
      `);

    const environmentalRisksResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM EnvironmentalRisks WHERE PropertyID = @PropertyID`);

    const marketTrendsResult = await pool
      .request()
      .input('City', sql.VarChar, property.City)
      .input('State', sql.VarChar, property.State)
      .query(`SELECT * FROM MarketTrends WHERE City = @City AND State = @State`);

    const nearbyHomeValuesResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM NearbyHomeValues WHERE PropertyID = @PropertyID`);

    res.render('property', {
      property,
      images,
      bedrooms: bedroomsResult.recordset,
      bathrooms: bathroomsResult.recordset,
      priceHistory: priceHistoryResult.recordset,
      taxHistory: taxHistoryResult.recordset,
      neighborhoods: neighborhoodResult.recordset,
      schools: schoolsResult.recordset,
      amenities: amenitiesResult.recordset,
      environmentalRisks: environmentalRisksResult.recordset,
      marketTrends: marketTrendsResult.recordset[0],
      nearbyHomeValues: nearbyHomeValuesResult.recordset,
    });
  } catch (error) {
    console.error('Error fetching property details:', error.message);
    res.status(500).send('An error occurred while fetching property details.');
  }
});

app.get('/explorer', async (req, res) => {
  try {
    const propertyResult = await pool
      .request()
      .input('PropertyID', sql.Int, 1)
      .query('SELECT * FROM Properties WHERE PropertyID = @PropertyID');

    const imagesResult = await pool
      .request()
      .input('PropertyID', sql.Int, 1)
      .query('SELECT * FROM Images WHERE PropertyID = @PropertyID ORDER BY ImageNumber');

    if (propertyResult.recordset.length === 0) {
      return res.status(404).send('Property not found');
    }

    const property = propertyResult.recordset[0];
    const images = imagesResult.recordset;

    for (const image of images) {
      const blobName = image.FileName.replace(/^images\//, '');
      image.Url = generateBlobSasUrl(propertyImagesContainer, blobName);
    }

    const properties = Array(10).fill(property);
    res.render('explorer', {
      properties,
      images,
    });
  } catch (error) {
    console.error('Error fetching properties for explorer:', error.message);
    res.status(500).send('An error occurred while fetching properties.');
  }
});

// -------------------------------------------
// Static Files Middleware
// -------------------------------------------
// Serves static assets such as CSS, JS, and images from the 'public' directory.
app.use(express.static('public'));







