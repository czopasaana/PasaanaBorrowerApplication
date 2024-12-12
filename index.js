require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const port = process.env.PORT || 3000;

const bcrypt = require('bcrypt');
const session = require('express-session');
const { OpenAI } = require('openai');

// Import the getConnection function from Db.js
const { getConnection } = require('./Db');
const sql = require('mssql');

// Import necessary modules at the top
const { BlobServiceClient } = require('@azure/storage-blob');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key', // Replace with your own secret
  resave: false,
  saveUninitialized: true
}));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
// Optional: Set the views directory explicitly if it's not in the default location
app.set('views', path.join(__dirname, 'views'));

// Database connection
let pool;

async function connectToDatabase() {
  try {
    // Get a connection pool from the Db module
    pool = await getConnection();
    console.log('Connected to Azure SQL database.');
  } catch (err) {
    console.error('Database connection failed:', err);
    // Output more detailed information
    console.error('Error Stack:', err.stack);
  }
}

connectToDatabase().then(() => {
  // Make the pool accessible to other parts of the app
  app.locals.pool = pool;

  // Start the server after successfully connecting to the database
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});

// Middleware to make 'user' and 'isPreApproved' available in all EJS templates
app.use(async (req, res, next) => {
  res.locals.user = req.session.user;

  if (req.session.user) {
    try {
      // Check if the user has a pre-approved application
      const preApprovalResult = await pool
        .request()
        .input('userID', sql.Int, req.session.user.userID)
        .query(
          `SELECT TOP 1 IsPreApproved FROM PreApprovalApplications
           WHERE UserID = @userID
           ORDER BY SubmissionDate DESC`
        );

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

// **Ensure Authenticated Middleware Function**
function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  // Only set returnTo if it's not already set
  if (!req.session.returnTo) {
    req.session.returnTo = req.originalUrl;
  }
  res.redirect('/login');
}

// Middleware to enforce step order
function enforceStepOrder(req, res, next) {
  const totalSteps = 6; // Number of steps before review
  const currentStep = parseInt(req.params.step);

  if (!req.session.completedSteps) {
    req.session.completedSteps = [];
  }

  // If the user tries to access a step beyond the next immediate step
  if (currentStep > 1 && !req.session.completedSteps.includes(currentStep - 1)) {
    return res.redirect(`/preapproval/step/${req.session.completedSteps.slice(-1)[0] || 1}`);
  }

  next();
}

// Middleware to prevent pre-approved users from accessing pre-approval routes
function preventPreApprovedAccess(req, res, next) {
  if (res.locals.isPreApproved) {
    // User is already pre-approved, redirect to thank-you page
    return res.redirect('/preapproval/thank-you');
  }
  next();
}

// **[Route Definitions Start Here]**

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// Sign Up Page
app.get('/signup', (req, res) => {
  if (req.session.user) {
    // User is already logged in, redirect to profile page
    return res.redirect('/profile');
  }
  if (req.query.from === 'navbar') {
    // Clear any existing returnTo value
    delete req.session.returnTo;
  }
  const showMessage = req.session.returnTo ? true : false;
  res.render('signup', { showMessage });
});

// Sign Up Handler
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user already exists
    const result = await pool
      .request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (result.recordset.length > 0) {
      return res.send('User already exists. Please sign in.');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user and retrieve the inserted UserID
    const insertResult = await pool
      .request()
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, hashedPassword)
      .query('INSERT INTO Users (Email, Password) OUTPUT INSERTED.UserID VALUES (@email, @password)');

    const userID = insertResult.recordset[0].UserID;

    // Set user session with UserID
    req.session.user = { email, userID };

    // Redirect to the original requested URL or home page
    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    return res.redirect(redirectTo);
  } catch (err) {
    console.error('Sign up error:', err.message);
    res.redirect('/signup');
  }
});

// Sign In Page
app.get('/login', (req, res) => {
  if (req.session.user) {
    // User is already logged in, redirect to profile page
    return res.redirect('/profile');
  }
  if (req.query.from === 'navbar') {
    // Clear any existing returnTo value
    delete req.session.returnTo;
  }
  const showMessage = req.session.returnTo ? true : false;
  res.render('login', { showMessage });
});

// Sign In Handler
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Retrieve user from database
    const result = await pool
      .request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    const user = result.recordset[0];

    if (user) {
      // Compare passwords
      if (await bcrypt.compare(password, user.Password)) {
        // Authentication successful
        req.session.user = { email: user.Email, userID: user.UserID };

        // Redirect to the original requested URL or home page
        const redirectTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        return res.redirect(redirectTo);
      } else {
        // Authentication failed
        return res.send('Incorrect password.');
      }
    } else {
      return res.send('User not found.');
    }
  } catch (err) {
    console.error('Login error:', err.message);
    res.redirect('/login');
  }
});

// Profile Page
app.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    // Check if user has a pre-approved application
    const preApprovalResult = await pool
      .request()
      .input('userID', sql.Int, req.session.user.userID)
      .query('SELECT TOP 1 * FROM PreApprovalApplications WHERE UserID = @userID');

    const isPreApproved = preApprovalResult.recordset.length > 0;

    // Fetch the user's loan application data
    const loanAppResult = await pool
      .request()
      .input('UserID', sql.Int, req.session.user.userID)
      .query('SELECT TOP 1 * FROM LoanApplications WHERE UserID = @UserID ORDER BY CreatedAt DESC');

    let applicationData = null;
    if (loanAppResult.recordset.length > 0) {
      const row = loanAppResult.recordset[0];
      applicationData = {
        BorrowerFirstName: row.BorrowerFirstName,
        BorrowerLastName: row.BorrowerLastName,
        BorrowerSSN: row.BorrowerSSN,
        BorrowerDOB: row.BorrowerDOB,
        EmployerName: row.EmployerName,
        AnnualIncome: row.AnnualIncome,
        CheckingAccounts: row.CheckingAccounts,
        CreditCardDebt: row.CreditCardDebt,
        PropertyAddress: row.PropertyAddress,
        PropertyValue: row.PropertyValue,
        LoanPurpose: row.LoanPurpose,
        LoanTerm: row.LoanTerm,
        LoanType: row.LoanType,
        RateLock: row.RateLock,
        EmploymentType: row.EmploymentType,
        ApplicationStatus: row.ApplicationStatus
      };
    }

    // Fetch the user's authorizations & consent data
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

    // Fetch the user's identification documents data
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
    }

    const incomeResult = await pool.request()
  .input('UserID', sql.Int, req.session.user.userID)
  .query('SELECT TOP 1 * FROM IncomeVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC');

    let incomeData = null;
    if (incomeResult.recordset.length > 0) {
      const row = incomeResult.recordset[0];
      incomeData = {
        ApplicationStatus: row.ApplicationStatus
        // Add more fields if you want to show what’s uploaded.
        };
      }

    const assetResult = await pool.request()
    .input('UserID', sql.Int, req.session.user.userID)
    .query('SELECT TOP 1 * FROM AssetVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC');
    
    let assetData = null;
    if (assetResult.recordset.length > 0) {
      const row = assetResult.recordset[0];
      assetData = {
        ApplicationStatus: row.ApplicationStatus
        // Add fields if you want to show if accounts are linked or files uploaded
      };
    }

    const liabilityResult = await pool.request()
    .input('UserID', sql.Int, req.session.user.userID)
  .query('SELECT TOP 1 * FROM LiabilityVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC');

    let liabilityData = null;
    if (liabilityResult.recordset.length > 0) {
      const row = liabilityResult.recordset[0];
  liabilityData = {
    ApplicationStatus: row.ApplicationStatus
      };
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

    // Fetch Co-Borrower Data (Optional Task)
    const coBorrowerResult = await pool
      .request()
      .input('UserID', sql.Int, req.session.user.userID)
      .query("SELECT TOP 1 * FROM CoBorrowerInfo WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    let coBorrowerData = null;
    if (coBorrowerResult.recordset.length > 0) {
      const row = coBorrowerResult.recordset[0];
      coBorrowerData = {
        ApplicationStatus: row.ApplicationStatus
        // Add more fields if you stored co-borrower names or docs info
      };
    }

    // Fetch Purchase Agreement Data (Optional Task)
    const purchaseAgreementResult = await pool
      .request()
      .input('UserID', sql.Int, req.session.user.userID)
      .query("SELECT TOP 1 * FROM PurchaseAgreement WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    let purchaseAgreementData = null;
    if (purchaseAgreementResult.recordset.length > 0) {
      const row = purchaseAgreementResult.recordset[0];
      purchaseAgreementData = {
        ApplicationStatus: row.ApplicationStatus
        // Add fields if you stored a file path or timestamp
      };
    }

    // Fetch Gift Letter Data (Optional Task)
    const giftLetterResult = await pool
      .request()
      .input('UserID', sql.Int, req.session.user.userID)
      .query("SELECT TOP 1 * FROM GiftLetter WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    let giftLetterData = null;
    if (giftLetterResult.recordset.length > 0) {
      const row = giftLetterResult.recordset[0];
      giftLetterData = {
        ApplicationStatus: row.ApplicationStatus
        // If you stored the file path or other info, add here
      };
    }

    // Render the profile page with all the data
    res.render('profile', {
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



// Sign Out Handler
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// **Pre-Approval Routes**
app.get('/preapproval', ensureAuthenticated, preventPreApprovedAccess, (req, res) => {
  res.render('preapproval/index');
});

// Import mortgage routes
const mortgageRoutes = require('./routes/mortgageRoutes'); // Make sure this file exists
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


// Pre-Approval Steps with Enforcement
app.get('/preapproval/step/:step', ensureAuthenticated, preventPreApprovedAccess, enforceStepOrder, (req, res) => {
  const step = parseInt(req.params.step);

  // Initialize session data if it doesn't exist
  if (!req.session.preApprovalData) {
    req.session.preApprovalData = {};
  }

  // If step is beyond the last step, redirect to review or final step
  if (step > 6) {
    return res.redirect('/preapproval/review');
  }

  res.render(`preapproval/step${step}`, { data: req.session.preApprovalData });
});

app.post('/preapproval/step/:step', ensureAuthenticated, preventPreApprovedAccess, (req, res) => {
  const step = parseInt(req.params.step);

  // Initialize session data if it doesn't exist
  if (!req.session.preApprovalData) {
    req.session.preApprovalData = {};
  }

  // Save current step data to session
  req.session.preApprovalData[`step${step}`] = req.body;

  // Process special logic for certain steps
  if (step === 6) {
    // Handle co-borrower information
    const { addCoBorrower } = req.body;
    req.session.preApprovalData.addCoBorrower = addCoBorrower;

    if (addCoBorrower === 'yes') {
      // Save co-borrower data
      const coBorrowerData = {
        firstName: req.body.coFirstName,
        lastName: req.body.coLastName,
        dateOfBirth: req.body.coDateOfBirth,
        email: req.body.coEmail,
        phoneNumber: req.body.coPhoneNumber,
        ssn: req.body.coSSN,
        employmentStatus: req.body.coEmploymentStatus,
        annualIncome: req.body.coAnnualIncome,
        monthlyDebt: req.body.coMonthlyDebt || 0, // Include co-borrower's monthly debt if collected
        // Include other fields as needed
      };
      req.session.preApprovalData.coBorrower = coBorrowerData;
    }
  }

  // Mark this step as completed
  if (!req.session.completedSteps) {
    req.session.completedSteps = [];
  }
  if (!req.session.completedSteps.includes(step)) {
    req.session.completedSteps.push(step);
  }

  if (step < 6) {
    // Redirect to the next step
    res.redirect(`/preapproval/step/${step + 1}`);
  } else {
    // Redirect to the review page
    res.redirect(`/preapproval/review`);
  }
});

// Review Pre-Approval Data
app.get('/preapproval/review', ensureAuthenticated, (req, res) => {
  const data = req.session.preApprovalData;
  res.render('preapproval/review', { data });
});

// Handle Submission
app.post('/preapproval/submit', ensureAuthenticated, preventPreApprovedAccess, async (req, res) => {
  const data = req.session.preApprovalData;

  try {
    // Convert the session data to JSON
    const applicationData = JSON.stringify(data);

    // Save the application data to the database
    await pool
      .request()
      .input('userID', sql.Int, req.session.user.userID)
      .input('applicationData', sql.NVarChar(sql.MAX), applicationData)
      .query(`INSERT INTO PreApprovalApplications (UserID, ApplicationData) VALUES (@userID, @applicationData)`);

    // Update user's pre-approval status in session
    req.session.isPreApproved = true;

    // Clear session data after submission
    req.session.preApprovalData = null;

    res.redirect('/preapproval/thank-you');
  } catch (err) {
    console.error('Error saving pre-approval application:', err.message);
    res.redirect('/preapproval/review');
  }
});

function calculatePreApprovedLoanAmount(applicationData) {
  // Extract annual income from Step 5
  let annualIncome = Number(applicationData.step5.annualIncome || 0);

  // Include co-borrower's income if applicable
  if (applicationData.addCoBorrower === 'yes' && applicationData.coBorrower) {
    const coAnnualIncome = Number(applicationData.coBorrower.annualIncome || 0);
    annualIncome += coAnnualIncome;
  }

  // Calculate combined monthly income
  const monthlyIncome = annualIncome / 12;

  // Extract monthly debts from Step 5
  let monthlyDebts = Number(applicationData.step5.monthlyDebt || 0);

  // Include co-borrower's debts if applicable
  if (applicationData.addCoBorrower === 'yes' && applicationData.coBorrower) {
    const coMonthlyDebt = Number(applicationData.coBorrower.monthlyDebt || 0);
    monthlyDebts += coMonthlyDebt;
  }

  // Maximum Housing Expense (Front-End Ratio)
  const maxHousingExpense = monthlyIncome * 0.28; // 28% of monthly income

  // Maximum Debt Expense (Back-End Ratio)
  const maxDebtExpense = (monthlyIncome * 0.36) - monthlyDebts; // 36% minus existing debts

  // Maximum Mortgage Payment
  const maxMortgagePayment = Math.min(maxHousingExpense, maxDebtExpense);

  // Ensure the maxMortgagePayment is positive
  if (maxMortgagePayment <= 0) {
    return 0;
  }

  // Loan parameters
  const annualInterestRate = 0.04; // 4% interest rate
  const monthlyInterestRate = annualInterestRate / 12;
  const loanTermYears = 30; // 30-year loan term
  const loanTermMonths = loanTermYears * 12;

  // Calculate maximum loan amount using the formula for present value of an annuity
  const r = monthlyInterestRate;
  const n = loanTermMonths;
  const P = maxMortgagePayment;

  let maxLoanAmount = P * (1 - Math.pow(1 + r, -n)) / r;

  // Include down payment if collected
  // const downPayment = Number(applicationData.step5.downPayment || 0);
  // maxLoanAmount += downPayment;

  // Return the maximum loan amount rounded to the nearest dollar
  return Math.round(maxLoanAmount);
}

// Modify the thank-you route to include the loan amount
app.get('/preapproval/thank-you', ensureAuthenticated, async (req, res) => {
  try {
    const userID = req.session.user.userID;

    // Retrieve the latest pre-approval application for the user
    const result = await pool
      .request()
      .input('userID', sql.Int, userID)
      .query(
        `SELECT TOP 1 ApplicationData, IsPreApproved FROM PreApprovalApplications
         WHERE UserID = @userID
         ORDER BY SubmissionDate DESC`
      );

    if (result.recordset.length === 0) {
      // No application data found
      return res.redirect('/preapproval');
    }

    // Parse the ApplicationData JSON
    const applicationDataJSON = result.recordset[0].ApplicationData;
    const applicationData = JSON.parse(applicationDataJSON);

    // Calculate the pre-approved loan amount
    const maximumLoanAmount = calculatePreApprovedLoanAmount(applicationData);

    // Set the pre-approval status based on the database value
    res.locals.isPreApproved = result.recordset[0].IsPreApproved;

    // Render the thank-you page with the loan amount
    res.render('preapproval/thank-you', {
      maximumLoanAmount,
      isPreApproved: true, // Assuming pre-approval logic, adjust as needed
    });
  } catch (error) {
    console.error('Error fetching application data:', error);
    res.redirect('/preapproval');
  }
});

// Calculators Page Route
app.get('/calculators', (req, res) => {
  res.render('calculators');
});

// Affordability Calculator Page Route
app.get('/affordability-calculator', (req, res) => {
  res.render('affordability-calculator');
});

// Mortgage Calculator Page Route
app.get('/mortgage-calculator', (req, res) => {
  res.render('mortgage-calculator');
});
// Mortgage Loans Page Route
app.get('/mortgage-loans', (req, res) => {
  res.render('mortgage-loans');
});

// Fixed Rate Loans Page Route
app.get('/fixed-rate-loans', (req, res) => {
  res.render('fixed-rate-loans');
});

// Variable Rate Loans Page Route
app.get('/variable-rate-loans', (req, res) => {
  res.render('variable-rate-loans');
});

// Adjustable Rate Loan F3 Page Route
app.get('/adjustable-rate', (req, res) => {
  res.render('adjustable-rate');
});

// F-1 Variable Short Term Loan Page Route
app.get('/f1-loan', (req, res) => {
  res.render('f1-loan');
});

// Realtor Service Page Route
app.get('/realtor-service', (req, res) => {
  res.render('realtor-service');
});

// Explore Homes Page Route
app.get('/explore-homes', (req, res) => {
  res.render('explore-homes');
});

// Add this route in your index.js
app.get('/api/loan-types', async (req, res) => {
  try {
    // Fetch loan types from the database
    const result = await pool.request().query('SELECT * FROM LoanTypes');
    const loanTypes = result.recordset;

    // Transform data into the expected format
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

// Property Details Route
app.get('/property/:id', async (req, res) => {
  const propertyId = parseInt(req.params.id);

  try {
    // Fetch property details
    const propertyResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM Properties WHERE PropertyID = @PropertyID`);

    if (propertyResult.recordset.length === 0) {
      return res.status(404).send('Property not found');
    }

    const property = propertyResult.recordset[0];

    // Fetch images
    const imagesResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM Images WHERE PropertyID = @PropertyID ORDER BY Category, ImageNumber`);

    const images = imagesResult.recordset;

    // Generate image URLs using Azure Blob Storage SAS token
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN; 
    const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME; 

    const blobServiceClient = new BlobServiceClient(
      `https://${storageAccountName}.blob.core.windows.net`
    );

    for (const image of images) {
      // Remove 'images/' prefix from FileName
      const blobName = image.FileName.replace(/^images\//, '');

      const blobClient = blobServiceClient
        .getContainerClient(containerName)
        .getBlobClient(blobName);

      // Determine the separator ('?' or '&')
      const separator = blobClient.url.includes('?') ? '&' : '?';

      // Generate the URL with SAS token
      const urlWithSasToken = `${blobClient.url}${separator}${sasToken}`;

      image.Url = urlWithSasToken;
    }

    // Fetch related data (Bedrooms, Bathrooms, etc.)
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
      .query(`
        SELECT * FROM MarketTrends WHERE City = @City AND State = @State
      `);

    const nearbyHomeValuesResult = await pool
      .request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`SELECT * FROM NearbyHomeValues WHERE PropertyID = @PropertyID`);

    // Render the property details page
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

// Explorer Page Route
app.get('/explorer', async (req, res) => {
  try {
    // Fetch PropertyID 1 from the database
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

    // Generate image URLs using Azure Blob Storage SAS token
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN; 
    const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME; 

    const blobServiceClient = new BlobServiceClient(
      `https://${storageAccountName}.blob.core.windows.net`
    );

    for (const image of images) {
      // Remove 'images/' prefix from FileName
      const blobName = image.FileName.replace(/^images\//, '');

      const blobClient = blobServiceClient
        .getContainerClient(containerName)
        .getBlobClient(blobName);

      // Determine the separator ('?' or '&')
      const separator = blobClient.url.includes('?') ? '&' : '?';

      // Generate the URL with SAS token
      const urlWithSasToken = `${blobClient.url}${separator}${sasToken}`;

      image.Url = urlWithSasToken;
    }

    // For the purpose of the explorer page, we'll create an array with multiple instances of the same property
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

// **Add the static middleware after your routes**
app.use(express.static('public'));





