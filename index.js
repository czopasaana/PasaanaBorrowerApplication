require('dotenv').config();
const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const port = process.env.PORT || 3000;

const bcrypt = require('bcrypt');
const session = require('express-session');
const { getConnection } = require('./Db');
const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');

// White-label branding configuration
const branding = require('./config/branding');

// -------------------------------------------
// Middleware Setup
// -------------------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
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

// -------------------------------------------
// Danish Realkredit Model Configuration
// -------------------------------------------
const REALKREDIT_CONFIG = {
  bondRate: 0.04,           // 4% bond rate
  bidragRate: 0.0075,       // 0.75% administration fee (bidrag)
  maxLTV: 0.80,             // 80% max loan-to-value
  loanTermYears: 30,        // Standard 30-year term
  maxHousingDTI: 0.30,      // Max 30% of gross income for housing
  maxTotalDTI: 0.40,        // Max 40% of gross income for total debt
  stressTestBuffer: 0.01,   // 1% buffer for stress testing affordability
};

// Helper function to calculate pre-approved loan amount (Danish Realkredit Model)
function calculatePreApprovedLoanAmount(applicationData) {
  let annualIncome = Number(applicationData.step5?.annualIncome || 0);

  if (applicationData.addCoBorrower === 'yes' && applicationData.coBorrower) {
    const coAnnualIncome = Number(applicationData.coBorrower.annualIncome || 0);
    annualIncome += coAnnualIncome;
  }

  const monthlyIncome = annualIncome / 12;
  let monthlyDebts = Number(applicationData.step5?.monthlyDebt || 0);

  if (applicationData.addCoBorrower === 'yes' && applicationData.coBorrower) {
    const coMonthlyDebt = Number(applicationData.coBorrower.monthlyDebt || 0);
    monthlyDebts += coMonthlyDebt;
  }

  // Danish affordability calculation
  // Use total rate (bond + bidrag) plus stress test buffer for conservative estimate
  const totalRate = REALKREDIT_CONFIG.bondRate + REALKREDIT_CONFIG.bidragRate + REALKREDIT_CONFIG.stressTestBuffer;
  const monthlyRate = totalRate / 12;
  const loanTermMonths = REALKREDIT_CONFIG.loanTermYears * 12;

  // Calculate max housing expense (30% of gross income)
  const maxHousingExpense = monthlyIncome * REALKREDIT_CONFIG.maxHousingDTI;
  
  // Calculate max total debt expense (40% of gross income minus existing debts)
  const maxDebtExpense = (monthlyIncome * REALKREDIT_CONFIG.maxTotalDTI) - monthlyDebts;
  
  // Take the lower of the two limits
  const maxMortgagePayment = Math.min(maxHousingExpense, maxDebtExpense);
  
  if (maxMortgagePayment <= 0) {
    return 0;
  }

  // Calculate max loan using annuity formula
  const r = monthlyRate;
  const n = loanTermMonths;
  const P = maxMortgagePayment;

  let maxLoanAmount = P * (1 - Math.pow(1 + r, -n)) / r;
  return Math.round(maxLoanAmount);
}

// Helper function to calculate monthly payment (Danish Realkredit Model)
function calculateMonthlyPayment(loanAmount, includeExtras = true) {
  const totalRate = REALKREDIT_CONFIG.bondRate + REALKREDIT_CONFIG.bidragRate;
  const monthlyRate = totalRate / 12;
  const loanTermMonths = REALKREDIT_CONFIG.loanTermYears * 12;
  
  // Annuity payment formula
  const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) / 
                    (Math.pow(1 + monthlyRate, loanTermMonths) - 1);
  
  if (!includeExtras) {
    return Math.round(monthlyPI);
  }
  
  // Add estimated taxes (~1.2% annually) and insurance (~$150/mo)
  const monthlyTaxes = (loanAmount * 0.012) / 12;
  const monthlyInsurance = 150;
  
  return Math.round(monthlyPI + monthlyTaxes + monthlyInsurance);
}

// -------------------------------------------
// Azure Blob Storage Setup
// -------------------------------------------
const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;

const blobServiceClient = new BlobServiceClient(
  `https://${storageAccountName}.blob.core.windows.net`
);

/**
 * Generates a SAS URL for a given blob to allow secure, temporary access.
 */
function generateBlobSasUrl(containerName, blobName) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  const separator = blobClient.url.includes('?') ? '&' : '?';
  return `${blobClient.url}${separator}${sasToken}`;
}

// -------------------------------------------
// Home Route - Redirect to Login or Profile
// -------------------------------------------
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile');
  }
  res.redirect('/login');
});

// -------------------------------------------
// Authentication Routes
// -------------------------------------------
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

    const redirectTo = req.session.returnTo || '/profile';
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
      const redirectTo = req.session.returnTo || '/profile';
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

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/profile');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// -------------------------------------------
// Profile Route - Main Application Dashboard
// -------------------------------------------
app.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const preApprovalResult = await pool
      .request()
      .input('userID', sql.Int, req.session.user.userID)
      .query('SELECT TOP 1 * FROM PreApprovalApplications WHERE UserID = @userID ORDER BY SubmissionDate DESC');

    // Check if pre-approved: must have a record AND IsPreApproved must be truthy (handles SQL bit/boolean)
    const isPreApproved = preApprovalResult.recordset.length > 0 && (preApprovalResult.recordset[0].IsPreApproved === true || preApprovalResult.recordset[0].IsPreApproved === 1 || preApprovalResult.recordset[0].IsPreApproved === 'True');
    
    // Get pre-approval data if exists (for pre-filling application)
    let preApprovalData = null;
    if (preApprovalResult.recordset.length > 0) {
      try {
        preApprovalData = JSON.parse(preApprovalResult.recordset[0].ApplicationData);
      } catch (e) {
        console.error('Error parsing pre-approval data:', e);
      }
    }

    // Fetching and preparing user-related data for URLA (Mortgage Application)
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

    // ============================================
    // NEW ENHANCED FEATURES DATA
    // ============================================

    // Fetch Loan Officer Assignment
    let loanOfficer = null;
    try {
      const loResult = await pool
        .request()
        .input('UserID', sql.Int, req.session.user.userID)
        .query(`
          SELECT lo.* 
          FROM LoanOfficers lo
          INNER JOIN UserLoanOfficerAssignments uloa ON lo.OfficerID = uloa.OfficerID
          WHERE uloa.UserID = @UserID AND uloa.IsActive = 1
        `);
      if (loResult.recordset.length > 0) {
        loanOfficer = loResult.recordset[0];
      } else {
        // No loan officer assigned - try to assign default one
        // First check if any loan officers exist
        const defaultLoResult = await pool.request().query(`
          SELECT TOP 1 * FROM LoanOfficers WHERE IsActive = 1
        `);
        
        if (defaultLoResult.recordset.length > 0) {
          // Assign the first available loan officer to this user
          const defaultOfficer = defaultLoResult.recordset[0];
          await pool
            .request()
            .input('UserID', sql.Int, req.session.user.userID)
            .input('OfficerID', sql.Int, defaultOfficer.OfficerID)
            .query(`
              INSERT INTO UserLoanOfficerAssignments (UserID, OfficerID, IsActive)
              VALUES (@UserID, @OfficerID, 1)
            `);
          loanOfficer = defaultOfficer;
        }
      }
    } catch (err) {
      console.log('LoanOfficers table may not exist yet:', err.message);
    }

    // Fetch Loan Timeline
    let loanTimeline = [];
    try {
      const timelineResult = await pool
        .request()
        .input('UserID', sql.Int, req.session.user.userID)
        .query(`
          SELECT * FROM LoanTimeline
          WHERE UserID = @UserID
          ORDER BY MilestoneOrder ASC
        `);
      loanTimeline = timelineResult.recordset;
    } catch (err) {
      console.log('LoanTimeline table may not exist yet:', err.message);
    }

    // Fetch Documents
    let documents = [];
    try {
      const docsResult = await pool
        .request()
        .input('UserID', sql.Int, req.session.user.userID)
        .query(`
          SELECT * FROM Documents
          WHERE UserID = @UserID
          ORDER BY DocumentCategory, DocumentType
        `);
      documents = docsResult.recordset;
    } catch (err) {
      console.log('Documents table may not exist yet:', err.message);
    }

    // Fetch Messages (last 20)
    let messages = [];
    let unreadMessageCount = 0;
    try {
      const msgResult = await pool
        .request()
        .input('UserID', sql.Int, req.session.user.userID)
        .query(`
          SELECT TOP 20 m.*, 
                 lo.FirstName as SenderFirstName, 
                 lo.LastName as SenderLastName,
                 lo.PhotoURL as SenderPhoto
          FROM Messages m
          LEFT JOIN LoanOfficers lo ON m.SenderType = 'LoanOfficer' AND m.SenderID = lo.OfficerID
          WHERE (m.RecipientType = 'Borrower' AND m.RecipientID = @UserID)
             OR (m.SenderType = 'Borrower' AND m.SenderID = @UserID)
          ORDER BY m.CreatedAt DESC
        `);
      messages = msgResult.recordset;
      
      const unreadResult = await pool
        .request()
        .input('UserID', sql.Int, req.session.user.userID)
        .query(`
          SELECT COUNT(*) as count FROM Messages 
          WHERE RecipientType = 'Borrower' AND RecipientID = @UserID AND IsRead = 0
        `);
      unreadMessageCount = unreadResult.recordset[0].count;
    } catch (err) {
      console.log('Messages table may not exist yet:', err.message);
    }

    // Fetch Notifications (unread)
    let notifications = [];
    let unreadNotificationCount = 0;
    try {
      const notifResult = await pool
        .request()
        .input('UserID', sql.Int, req.session.user.userID)
        .query(`
          SELECT TOP 10 * FROM Notifications
          WHERE UserID = @UserID AND IsDismissed = 0
          ORDER BY CreatedAt DESC
        `);
      notifications = notifResult.recordset;
      unreadNotificationCount = notifications.filter(n => !n.IsRead).length;
    } catch (err) {
      console.log('Notifications table may not exist yet:', err.message);
    }

    // Fetch Loan Estimate
    let loanEstimate = null;
    try {
      const estResult = await pool
        .request()
        .input('UserID', sql.Int, req.session.user.userID)
        .query(`
          SELECT TOP 1 * FROM LoanEstimates
          WHERE UserID = @UserID AND IsActive = 1
          ORDER BY CreatedAt DESC
        `);
      if (estResult.recordset.length > 0) {
        loanEstimate = estResult.recordset[0];
      }
    } catch (err) {
      console.log('LoanEstimates table may not exist yet:', err.message);
    }

    // Fetch Rate Lock
    let rateLock = null;
    try {
      const rlResult = await pool
        .request()
        .input('UserID', sql.Int, req.session.user.userID)
        .query(`
          SELECT TOP 1 * FROM RateLocks
          WHERE UserID = @UserID AND Status = 'Active'
          ORDER BY CreatedAt DESC
        `);
      if (rlResult.recordset.length > 0) {
        rateLock = rlResult.recordset[0];
      }
    } catch (err) {
      console.log('RateLocks table may not exist yet:', err.message);
    }

    // Fetch Action Items
    let actionItems = [];
    try {
      const aiResult = await pool
        .request()
        .input('UserID', sql.Int, req.session.user.userID)
        .query(`
          SELECT * FROM ActionItems
          WHERE UserID = @UserID AND AssignedTo = 'Borrower' AND Status != 'Completed'
          ORDER BY Priority DESC, DueDate ASC
        `);
      actionItems = aiResult.recordset;
    } catch (err) {
      console.log('ActionItems table may not exist yet:', err.message);
    }

    // Fetch Loan Products for comparison
    let loanProducts = [];
    try {
      const lpResult = await pool
        .request()
        .query(`
          SELECT * FROM LoanProducts
          WHERE IsActive = 1
          ORDER BY DisplayOrder ASC
        `);
      loanProducts = lpResult.recordset;
    } catch (err) {
      console.log('LoanProducts table may not exist yet:', err.message);
    }

    // Get pre-approved amount - use stored value if available, otherwise calculate
    let preApprovedAmount = 0;
    if (isPreApproved) {
      // First try to use stored PreApprovedAmount from database
      if (preApprovalResult.recordset[0].PreApprovedAmount) {
        preApprovedAmount = parseFloat(preApprovalResult.recordset[0].PreApprovedAmount);
      } else if (preApprovalData) {
        // Fallback: calculate for older records that don't have stored amount
        preApprovedAmount = calculatePreApprovedLoanAmount(preApprovalData);
      }
    }

    // Calculate document stats from existing document tables (not the new Documents table)
    // Count from existing verification tables
    let completedDocSections = 0;
    let totalDocSections = 6; // Total document sections: ID, Income, Assets, Liabilities, Purchase Agreement, Gift Letter
    
    if (identificationData && identificationData.IDFilePath) completedDocSections++;
    if (incomeData && (incomeData.PayStubsFiles || incomeData.W2Files || incomeData.TaxReturnsFiles)) completedDocSections++;
    if (assetData && (assetData.BankStatementsFiles || assetData.InvestmentStatementsFiles || assetData.RetirementStatementsFiles)) completedDocSections++;
    if (liabilityData && (liabilityData.CreditCardStatementsFiles || liabilityData.AutoLoanStatementsFiles || liabilityData.StudentLoanStatementsFiles || liabilityData.MortgageStatementFiles)) completedDocSections++;
    if (purchaseAgreementData && purchaseAgreementData.AgreementUrl) completedDocSections++;
    if (giftLetterData && giftLetterData.GiftLetterFilePath) completedDocSections++;
    
    const pendingDocs = totalDocSections - completedDocSections;
    const totalRequiredDocs = totalDocSections;
    const approvedDocs = completedDocSections;

    res.render('profile', {
      layout: 'layouts/layoutProfile',
      title: 'My Profile',
      user: req.session.user,
      isPreApproved,
      preApprovalData,
      preApprovedAmount,
      applicationData,
      authorizationsData,
      identificationData,
      incomeData,
      assetData,
      liabilityData,
      disclosuresData,
      coBorrowerData,
      purchaseAgreementData,
      giftLetterData,
      // New enhanced features data
      loanOfficer,
      loanTimeline,
      documents,
      pendingDocs,
      totalRequiredDocs,
      approvedDocs,
      messages,
      unreadMessageCount,
      notifications,
      unreadNotificationCount,
      loanEstimate,
      rateLock,
      actionItems,
      loanProducts
    });

  } catch (err) {
    console.error('Error fetching user profile:', err.message);
    res.redirect('/login');
  }
});

// -------------------------------------------
// Mortgage Application Routes
// -------------------------------------------
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

// -------------------------------------------
// Pre-Approval Routes
// -------------------------------------------
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
    
    // Calculate and store the pre-approved amount for external systems
    const preApprovedAmount = calculatePreApprovedLoanAmount(data);
    
    // Store calculation parameters for audit trail
    const calculationParams = JSON.stringify({
      ...REALKREDIT_CONFIG,
      calculatedAt: new Date().toISOString()
    });

    await pool
      .request()
      .input('userID', sql.Int, req.session.user.userID)
      .input('applicationData', sql.NVarChar(sql.MAX), applicationData)
      .input('preApprovedAmount', sql.Decimal(18, 2), preApprovedAmount)
      .input('calculationParams', sql.NVarChar(sql.MAX), calculationParams)
      .query(`
        INSERT INTO PreApprovalApplications (UserID, ApplicationData, PreApprovedAmount, CalculationParams) 
        VALUES (@userID, @applicationData, @preApprovedAmount, @calculationParams)
      `);

    req.session.isPreApproved = true;
    req.session.preApprovalData = null;

    res.redirect('/preapproval/thank-you');
  } catch (err) {
    console.error('Error saving pre-approval application:', err.message);
    res.redirect('/preapproval/review');
  }
});

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
// Messaging Routes
// -------------------------------------------
app.post('/api/messages/send', ensureAuthenticated, async (req, res) => {
  try {
    const { recipientId, subject, messageBody } = req.body;
    const userId = req.session.user.userID;

    await pool
      .request()
      .input('SenderType', sql.NVarChar, 'Borrower')
      .input('SenderID', sql.Int, userId)
      .input('RecipientType', sql.NVarChar, 'LoanOfficer')
      .input('RecipientID', sql.Int, recipientId)
      .input('Subject', sql.NVarChar, subject || null)
      .input('MessageBody', sql.NVarChar, messageBody)
      .query(`
        INSERT INTO Messages (SenderType, SenderID, RecipientType, RecipientID, Subject, MessageBody)
        VALUES (@SenderType, @SenderID, @RecipientType, @RecipientID, @Subject, @MessageBody)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/messages/mark-read', ensureAuthenticated, async (req, res) => {
  try {
    const { messageId } = req.body;
    const userId = req.session.user.userID;

    await pool
      .request()
      .input('MessageID', sql.Int, messageId)
      .input('UserID', sql.Int, userId)
      .query(`
        UPDATE Messages SET IsRead = 1, ReadAt = GETDATE()
        WHERE MessageID = @MessageID AND RecipientType = 'Borrower' AND RecipientID = @UserID
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking message read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------
// Notification Routes
// -------------------------------------------
app.post('/api/notifications/mark-read', ensureAuthenticated, async (req, res) => {
  try {
    const { notificationId } = req.body;
    const userId = req.session.user.userID;

    await pool
      .request()
      .input('NotificationID', sql.Int, notificationId)
      .input('UserID', sql.Int, userId)
      .query(`
        UPDATE Notifications SET IsRead = 1, ReadAt = GETDATE()
        WHERE NotificationID = @NotificationID AND UserID = @UserID
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/dismiss', ensureAuthenticated, async (req, res) => {
  try {
    const { notificationId } = req.body;
    const userId = req.session.user.userID;

    await pool
      .request()
      .input('NotificationID', sql.Int, notificationId)
      .input('UserID', sql.Int, userId)
      .query(`
        UPDATE Notifications SET IsDismissed = 1, DismissedAt = GETDATE()
        WHERE NotificationID = @NotificationID AND UserID = @UserID
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error dismissing notification:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/notifications/count', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;

    const result = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT COUNT(*) as count FROM Notifications 
        WHERE UserID = @UserID AND IsRead = 0 AND IsDismissed = 0
      `);

    res.json({ count: result.recordset[0].count });
  } catch (err) {
    console.error('Error getting notification count:', err);
    res.status(500).json({ count: 0 });
  }
});

// -------------------------------------------
// Document Upload Routes
// -------------------------------------------
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/documents/upload', ensureAuthenticated, upload.single('document'), async (req, res) => {
  try {
    const { documentId } = req.body;
    const userId = req.session.user.userID;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Upload to Azure Blob Storage
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME_DOCUMENTS || 'documents';
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const blobName = `${userId}/${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype }
    });

    const blobUrl = blockBlobClient.url;

    // Update document record
    await pool
      .request()
      .input('DocumentID', sql.Int, documentId)
      .input('UserID', sql.Int, userId)
      .input('FileName', sql.NVarChar, file.originalname)
      .input('BlobURL', sql.NVarChar, blobUrl)
      .input('FileSize', sql.Int, file.size)
      .input('MimeType', sql.NVarChar, file.mimetype)
      .query(`
        UPDATE Documents 
        SET FileName = @FileName, BlobURL = @BlobURL, FileSize = @FileSize, 
            MimeType = @MimeType, Status = 'Uploaded', UploadedAt = GETDATE(),
            UpdatedAt = GETDATE()
        WHERE DocumentID = @DocumentID AND UserID = @UserID
      `);

    res.json({ success: true, fileName: file.originalname });
  } catch (err) {
    console.error('Error uploading document:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------
// Action Item Routes
// -------------------------------------------
app.post('/api/action-items/complete', ensureAuthenticated, async (req, res) => {
  try {
    const { actionItemId } = req.body;
    const userId = req.session.user.userID;

    await pool
      .request()
      .input('ActionItemID', sql.Int, actionItemId)
      .input('UserID', sql.Int, userId)
      .query(`
        UPDATE ActionItems 
        SET Status = 'Completed', CompletedAt = GETDATE(), CompletedBy = @UserID
        WHERE ActionItemID = @ActionItemID AND UserID = @UserID
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error completing action item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------
// Calculator Routes
// -------------------------------------------
app.post('/api/calculator/save', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    const { 
      homePrice, downPayment, downPaymentPercent, interestRate, bidrag, 
      loanTermYears, loanType, paymentFrequency, interestOnlyYears,
      propertyTax, homeInsurance 
    } = req.body;
    
    const loanAmount = homePrice - downPayment;
    const bondRate = interestRate || 0;
    const bidragRate = bidrag || 0;
    const totalRate = bondRate + bidragRate;
    
    // Calculate based on Danish realkredit model
    const periodsPerYear = paymentFrequency === 'quarterly' ? 4 : 12;
    const totalPeriods = loanTermYears * periodsPerYear;
    const ioPeriods = (interestOnlyYears || 0) * periodsPerYear;
    const amortPeriods = totalPeriods - ioPeriods;
    
    const bondPeriodRate = bondRate / 100 / periodsPerYear;
    const bidragPeriodRate = bidragRate / 100 / periodsPerYear;
    
    let periodPayment = 0;
    let totalInterest = 0;
    let totalBidrag = 0;
    
    if (loanType === 'annuity') {
      // Annuity calculation
      if (bondPeriodRate > 0 && amortPeriods > 0) {
        const piPayment = loanAmount * (bondPeriodRate * Math.pow(1 + bondPeriodRate, amortPeriods)) / 
                          (Math.pow(1 + bondPeriodRate, amortPeriods) - 1);
        periodPayment = piPayment + (loanAmount * bidragPeriodRate);
        
        // Calculate total interest
        let balance = loanAmount;
        for (let p = 0; p < ioPeriods; p++) {
          totalInterest += balance * bondPeriodRate;
          totalBidrag += balance * bidragPeriodRate;
        }
        for (let p = 0; p < amortPeriods; p++) {
          const intPmt = balance * bondPeriodRate;
          const prinPmt = piPayment - intPmt;
          totalInterest += intPmt;
          totalBidrag += balance * bidragPeriodRate;
          balance -= prinPmt;
        }
      }
    } else {
      // Serial loan calculation
      const fixedPrincipal = amortPeriods > 0 ? loanAmount / amortPeriods : 0;
      periodPayment = fixedPrincipal + (loanAmount * bondPeriodRate) + (loanAmount * bidragPeriodRate);
      
      let balance = loanAmount;
      for (let p = 0; p < ioPeriods; p++) {
        totalInterest += balance * bondPeriodRate;
        totalBidrag += balance * bidragPeriodRate;
      }
      for (let p = 0; p < amortPeriods; p++) {
        totalInterest += balance * bondPeriodRate;
        totalBidrag += balance * bidragPeriodRate;
        balance -= fixedPrincipal;
      }
    }
    
    const periodTax = (propertyTax || 0) / periodsPerYear;
    const periodInsurance = (homeInsurance || 0) / periodsPerYear;
    const totalPeriodPayment = periodPayment + periodTax + periodInsurance;
    
    await pool
      .request()
      .input('UserID', sql.Int, userId)
      .input('HomePrice', sql.Decimal(18, 2), homePrice)
      .input('DownPayment', sql.Decimal(18, 2), downPayment)
      .input('DownPaymentPercent', sql.Decimal(5, 2), downPaymentPercent)
      .input('LoanAmount', sql.Decimal(18, 2), loanAmount)
      .input('InterestRate', sql.Decimal(5, 4), bondRate / 100)
      .input('BidragRate', sql.Decimal(5, 4), bidragRate / 100)
      .input('LoanTermYears', sql.Int, loanTermYears)
      .input('LoanType', sql.NVarChar(20), loanType || 'annuity')
      .input('PaymentFrequency', sql.NVarChar(20), paymentFrequency || 'monthly')
      .input('InterestOnlyYears', sql.Int, interestOnlyYears || 0)
      .input('PropertyTaxAnnual', sql.Decimal(18, 2), propertyTax || 0)
      .input('HomeInsuranceAnnual', sql.Decimal(18, 2), homeInsurance || 0)
      .input('PeriodPayment', sql.Decimal(18, 2), periodPayment)
      .input('PeriodTax', sql.Decimal(18, 2), periodTax)
      .input('PeriodInsurance', sql.Decimal(18, 2), periodInsurance)
      .input('TotalPeriodPayment', sql.Decimal(18, 2), totalPeriodPayment)
      .input('TotalInterestPaid', sql.Decimal(18, 2), totalInterest)
      .input('TotalBidragPaid', sql.Decimal(18, 2), totalBidrag)
      .input('IsSaved', sql.Bit, 1)
      .query(`
        INSERT INTO MortgageCalculations 
        (UserID, HomePrice, DownPayment, DownPaymentPercent, LoanAmount, InterestRate, BidragRate,
         LoanTermYears, LoanType, PaymentFrequency, InterestOnlyYears,
         PropertyTaxAnnual, HomeInsuranceAnnual, PeriodPayment, PeriodTax, PeriodInsurance,
         TotalPeriodPayment, TotalInterestPaid, TotalBidragPaid, IsSaved)
        VALUES (@UserID, @HomePrice, @DownPayment, @DownPaymentPercent, @LoanAmount, @InterestRate, @BidragRate,
                @LoanTermYears, @LoanType, @PaymentFrequency, @InterestOnlyYears,
                @PropertyTaxAnnual, @HomeInsuranceAnnual, @PeriodPayment, @PeriodTax, @PeriodInsurance,
                @TotalPeriodPayment, @TotalInterestPaid, @TotalBidragPaid, @IsSaved)
      `);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving calculation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------
// Property Routes
// -------------------------------------------
app.post('/api/properties/save', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    const { address, city, state, zipCode, price, listingUrl, notes, propertySource } = req.body;
    
    await pool
      .request()
      .input('UserID', sql.Int, userId)
      .input('PropertySource', sql.NVarChar, propertySource || 'Manual')
      .input('Address', sql.NVarChar, address)
      .input('City', sql.NVarChar, city)
      .input('State', sql.NVarChar, state)
      .input('ZipCode', sql.NVarChar, zipCode)
      .input('Price', sql.Decimal(18, 2), price || null)
      .input('ListingURL', sql.NVarChar, listingUrl || null)
      .input('Notes', sql.NVarChar, notes || null)
      .input('IsFavorite', sql.Bit, 1)
      .query(`
        INSERT INTO SavedProperties 
        (UserID, PropertySource, Address, City, State, ZipCode, Price, ListingURL, Notes, IsFavorite)
        VALUES (@UserID, @PropertySource, @Address, @City, @State, @ZipCode, @Price, @ListingURL, @Notes, @IsFavorite)
      `);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving property:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/properties/saved', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    
    const result = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT * FROM SavedProperties
        WHERE UserID = @UserID
        ORDER BY IsFavorite DESC, CreatedAt DESC
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching saved properties:', err);
    res.json([]);
  }
});

app.delete('/api/properties/:id', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    const propertyId = req.params.id;
    
    await pool
      .request()
      .input('UserID', sql.Int, userId)
      .input('PropertyID', sql.Int, propertyId)
      .query(`DELETE FROM SavedProperties WHERE SavedPropertyID = @PropertyID AND UserID = @UserID`);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------
// Video Call Routes
// -------------------------------------------
app.post('/api/video-calls/schedule', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    const { date, time, topic, duration, notes } = req.body;
    
    // Get assigned loan officer
    const loResult = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT OfficerID FROM UserLoanOfficerAssignments
        WHERE UserID = @UserID AND IsActive = 1
      `);
    
    const officerId = loResult.recordset.length > 0 ? loResult.recordset[0].OfficerID : null;
    
    // Generate a placeholder meeting link
    const meetingLink = `https://meet.bankabc.com/${Date.now()}`;
    
    await pool
      .request()
      .input('UserID', sql.Int, userId)
      .input('OfficerID', sql.Int, officerId)
      .input('ScheduledDate', sql.Date, date)
      .input('ScheduledTime', sql.NVarChar, time)
      .input('Duration', sql.Int, duration || 30)
      .input('Topic', sql.NVarChar, topic)
      .input('Notes', sql.NVarChar, notes || null)
      .input('MeetingLink', sql.NVarChar, meetingLink)
      .input('MeetingProvider', sql.NVarChar, 'Internal')
      .query(`
        INSERT INTO VideoCallBookings 
        (UserID, OfficerID, ScheduledDate, ScheduledTime, Duration, Topic, Notes, MeetingLink, MeetingProvider)
        VALUES (@UserID, @OfficerID, @ScheduledDate, @ScheduledTime, @Duration, @Topic, @Notes, @MeetingLink, @MeetingProvider)
      `);
    
    res.json({ success: true, meetingLink });
  } catch (err) {
    console.error('Error scheduling video call:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/video-calls/upcoming', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    
    const result = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT * FROM VideoCallBookings
        WHERE UserID = @UserID AND Status = 'Scheduled' AND ScheduledDate >= CAST(GETDATE() AS DATE)
        ORDER BY ScheduledDate ASC, ScheduledTime ASC
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching upcoming calls:', err);
    res.json([]);
  }
});

app.post('/api/video-calls/cancel', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    const { bookingId } = req.body;
    
    await pool
      .request()
      .input('UserID', sql.Int, userId)
      .input('BookingID', sql.Int, bookingId)
      .query(`
        UPDATE VideoCallBookings 
        SET Status = 'Cancelled', UpdatedAt = GETDATE()
        WHERE BookingID = @BookingID AND UserID = @UserID
      `);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error cancelling video call:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------
// Badge/Achievement Routes
// -------------------------------------------
app.get('/api/badges', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    
    const allBadges = await pool.request().query(`SELECT * FROM Badges WHERE IsActive = 1 ORDER BY DisplayOrder`);
    const userBadges = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT BadgeID, EarnedAt FROM UserBadges WHERE UserID = @UserID`);
    
    const earnedIds = new Set(userBadges.recordset.map(b => b.BadgeID));
    
    const badges = allBadges.recordset.map(badge => ({
      ...badge,
      earned: earnedIds.has(badge.BadgeID),
      earnedAt: userBadges.recordset.find(ub => ub.BadgeID === badge.BadgeID)?.EarnedAt
    }));
    
    res.json(badges);
  } catch (err) {
    console.error('Error fetching badges:', err);
    res.json([]);
  }
});

app.post('/api/badges/award', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    const { badgeId } = req.body;
    
    // Check if already earned
    const existing = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .input('BadgeID', sql.Int, badgeId)
      .query(`SELECT * FROM UserBadges WHERE UserID = @UserID AND BadgeID = @BadgeID`);
    
    if (existing.recordset.length === 0) {
      await pool
        .request()
        .input('UserID', sql.Int, userId)
        .input('BadgeID', sql.Int, badgeId)
        .query(`INSERT INTO UserBadges (UserID, BadgeID) VALUES (@UserID, @BadgeID)`);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error awarding badge:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------
// Change Password API
// -------------------------------------------
app.post('/api/auth/change-password', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    const { currentPassword, newPassword } = req.body;
    
    // Get current password hash
    const userResult = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT PasswordHash FROM Users WHERE UserID = @UserID`);
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userResult.recordset[0].PasswordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool
      .request()
      .input('UserID', sql.Int, userId)
      .input('PasswordHash', sql.NVarChar, newPasswordHash)
      .query(`UPDATE Users SET PasswordHash = @PasswordHash WHERE UserID = @UserID`);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// -------------------------------------------
// User Preferences (Dark Mode, Language)
// -------------------------------------------
app.get('/api/preferences', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    
    const result = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT * FROM UserPreferences WHERE UserID = @UserID`);
    
    if (result.recordset.length > 0) {
      const prefs = result.recordset[0];
      res.json({
        DarkMode: prefs.DarkModeEnabled,
        Language: prefs.PreferredLanguage || 'en',
        EmailNotifications: prefs.EmailNotificationsEnabled,
        SMSNotifications: prefs.SMSNotificationsEnabled
      });
    } else {
      res.json({
        DarkMode: false,
        Language: 'en',
        EmailNotifications: true,
        SMSNotifications: false
      });
    }
  } catch (err) {
    console.error('Error fetching preferences:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/preferences/update', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    const { darkMode, language, emailNotifications, smsNotifications } = req.body;
    
    // Check if preferences exist
    const existing = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT * FROM UserPreferences WHERE UserID = @UserID`);
    
    if (existing.recordset.length === 0) {
      await pool
        .request()
        .input('UserID', sql.Int, userId)
        .input('DarkMode', sql.Bit, darkMode || 0)
        .input('Language', sql.NVarChar, language || 'en')
        .input('EmailNotifications', sql.Bit, emailNotifications !== false)
        .input('SMSNotifications', sql.Bit, smsNotifications !== false)
        .query(`
          INSERT INTO UserPreferences (UserID, DarkModeEnabled, PreferredLanguage, EmailNotificationsEnabled, SMSNotificationsEnabled)
          VALUES (@UserID, @DarkMode, @Language, @EmailNotifications, @SMSNotifications)
        `);
    } else {
      await pool
        .request()
        .input('UserID', sql.Int, userId)
        .input('DarkMode', sql.Bit, darkMode || 0)
        .input('Language', sql.NVarChar, language || 'en')
        .input('EmailNotifications', sql.Bit, emailNotifications !== false)
        .input('SMSNotifications', sql.Bit, smsNotifications !== false)
        .query(`
          UPDATE UserPreferences 
          SET DarkModeEnabled = @DarkMode, PreferredLanguage = @Language,
              EmailNotificationsEnabled = @EmailNotifications, SMSNotificationsEnabled = @SMSNotifications,
              UpdatedAt = GETDATE()
          WHERE UserID = @UserID
        `);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating preferences:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------
// FAQ Analytics (track views)
// -------------------------------------------
app.post('/api/faq/view', ensureAuthenticated, async (req, res) => {
  try {
    const { articleId } = req.body;
    
    await pool
      .request()
      .input('ArticleID', sql.Int, articleId)
      .query(`UPDATE FAQArticles SET ViewCount = ViewCount + 1 WHERE ArticleID = @ArticleID`);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error tracking FAQ view:', err);
    res.status(500).json({ success: false });
  }
});

app.post('/api/faq/helpful', ensureAuthenticated, async (req, res) => {
  try {
    const { articleId, helpful } = req.body;
    
    if (helpful) {
      await pool
        .request()
        .input('ArticleID', sql.Int, articleId)
        .query(`UPDATE FAQArticles SET HelpfulCount = HelpfulCount + 1 WHERE ArticleID = @ArticleID`);
    } else {
      await pool
        .request()
        .input('ArticleID', sql.Int, articleId)
        .query(`UPDATE FAQArticles SET NotHelpfulCount = NotHelpfulCount + 1 WHERE ArticleID = @ArticleID`);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error tracking FAQ feedback:', err);
    res.status(500).json({ success: false });
  }
});

// -------------------------------------------
// Static Files Middleware
// -------------------------------------------
app.use(express.static('public'));
