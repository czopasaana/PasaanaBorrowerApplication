require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const port = process.env.PORT || 3000;

const bcrypt = require('bcrypt');
const session = require('express-session');
const { OpenAI } = require('openai');

const { DefaultAzureCredential, ManagedIdentityCredential, ChainedTokenCredential, AzureCliCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const sql = require('mssql');

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

// Set EJS as the templating engine
app.set('view engine', 'ejs');
// Optional: Set the views directory explicitly if it's not in the default location
app.set('views', path.join(__dirname, 'views'));

// Azure Key Vault and SQL Database Connection
let sqlConfig = {};

async function getSqlConfig() {
  try {
    const credential = new DefaultAzureCredential();
    const keyVaultUrl = process.env.KEY_VAULT_URL;
    const secretClient = new SecretClient(keyVaultUrl, credential);

    // Determine environment
    const isAzure = process.env.WEBSITE_SITE_NAME && process.env.WEBSITE_SITE_NAME.toLowerCase() === 'pasaana';

    let connectionStringSecretName;

    if (isAzure) {
      // Running on Azure Web App
      connectionStringSecretName = 'SqlConnectionStringWebApp';
    } else {
      // Running locally
      connectionStringSecretName = 'SqlConnectionString';
    }

    // Retrieve the connection string from Key Vault
    const connectionStringSecret = await secretClient.getSecret(connectionStringSecretName);
    const connectionString = connectionStringSecret.value;

    // Set up the SQL configuration using the connection string
    sqlConfig = {
      connectionString: connectionString,
      options: {
        encrypt: true,
      },
      connectionTimeout: 30000,
    };
  } catch (err) {
    console.error('Error retrieving SQL configuration:', err.message);
  }
}

let pool;

async function connectToDatabase() {
  try {
    await getSqlConfig(); // Ensure sqlConfig is populated
    
    // Validate that sqlConfig has the necessary properties
    if (!sqlConfig.connectionString) {
      throw new Error('SQL configuration is missing connection string.');
    }

    // Connect to the database using the connection string directly
    pool = await sql.connect(sqlConfig.connectionString);
    console.log('Connected to Azure SQL database.');
  } catch (err) {
    console.error('Database connection failed:', err);
    // Output more detailed information
    console.error('SQL Config:', sqlConfig);
    console.error('Error Stack:', err.stack);
  }
}

connectToDatabase().then(() => {
  // Start the server after successfully connecting to the database
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
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
    // Check if user has submitted a pre-approval application
    const preApprovalResult = await pool
      .request()
      .input('userID', sql.Int, req.session.user.userID)
      .query('SELECT TOP 1 * FROM PreApprovalApplications WHERE UserID = @userID');

    const isPreApproved = preApprovalResult.recordset.length > 0;

    res.render('profile', { user: req.session.user, isPreApproved });
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

// Pre-Approval Steps with Enforcement
app.get('/preapproval/step/:step', ensureAuthenticated, preventPreApprovedAccess, enforceStepOrder, (req, res) => {
  const step = parseInt(req.params.step);

  // If step is beyond the last step, redirect to review
  if (step > 8) {
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

  // Mark this step as completed
  if (!req.session.completedSteps) {
    req.session.completedSteps = [];
  }
  if (!req.session.completedSteps.includes(step)) {
    req.session.completedSteps.push(step);
  }

  if (step < 7) {
    // Redirect to the next step
    res.redirect(`/preapproval/step/${step + 1}`);
  } else {
    // Redirect to the review page
    res.redirect(`/preapproval/review`);
  }
});

// Review Pre-Approval Data
app.get('/preapproval/review', (req, res) => {
  const data = req.session.preApprovalData;
  res.render('preapproval/step7', { data });
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

// Function to calculate the pre-approved loan amount
function calculatePreApprovedLoanAmount(applicationData) {
  // Extract annual income
  let annualIncome = Number(applicationData.step4.annualIncome || 0);

  // If the user is self-employed, use selfAnnualIncome
  if (applicationData.step4.employmentStatus === 'self_employed') {
    annualIncome = Number(applicationData.step4.selfAnnualIncome || 0);
  }

  // Include additional income if applicable
  if (applicationData.step4.additionalIncome === 'yes') {
    const additionalIncomeAmounts = applicationData.step4.additionalIncomeAmount || [];
    const totalAdditionalIncome = additionalIncomeAmounts.reduce(
      (sum, amount) => sum + Number(amount || 0),
      0
    );
    annualIncome += totalAdditionalIncome;
  }

  // Calculate monthly income
  const monthlyIncome = annualIncome / 12;

  // Extract monthly debts
  let monthlyDebts = 0;
  monthlyDebts += Number(applicationData.step5.creditCardPayments || 0);
  monthlyDebts += Number(applicationData.step5.autoLoanPayments || 0);
  monthlyDebts += Number(applicationData.step5.studentLoanPayments || 0);
  if (applicationData.step5.hasOtherDebts === 'yes') {
    const otherDebtPayments = applicationData.step5.otherDebtPayment || [];
    monthlyDebts += otherDebtPayments.reduce(
      (sum, amount) => sum + Number(amount || 0),
      0
    );
  }
  if (applicationData.step5.hasAlimony === 'yes') {
    monthlyDebts += Number(applicationData.step5.alimonyPayment || 0);
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

  // Include down payment
  const downPayment = Number(applicationData.step5.savingsBalance || 0);
  maxLoanAmount += downPayment;

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
    });
  } catch (error) {
    console.error('Error fetching application data:', error);
    res.redirect('/preapproval');
  }
});

// Calculators Selection Page Route
app.get('/calculators', (req, res) => {
  res.render('calculators');
});

// Ensure existing calculator routes are defined
// Affordability Calculator Route
app.get('/affordability-calculator', (req, res) => {
  res.render('affordability-calculator', {
    isLoggedIn: req.session.user != null,
    preApprovalData: req.session.preApprovalData,
  });
});

// Mortgage Calculator Route
app.get('/mortgage-calculator', (req, res) => {
  res.render('mortgage-calculator');
});

// Chat Route using Chat Completion API
app.post('/chat', async (req, res) => {
  const message = req.body.message;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that guides users through the mortgage application process.',
        },
        { role: 'user', content: message },
      ],
      model: 'gpt-3.5-turbo',
    });

    const reply = completion.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error('Error communicating with OpenAI:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// Add a new route for AI-based predictions
app.post('/api/predict', async (req, res) => {
  const {
    annualIncome,
    monthlyDebts,
    salaryGrowthRate,
    expenseGrowthRate,
    years
  } = req.body;

  // Construct the AI prompt
  const prompt = `
    Predict the annual income and debts over ${years} years, given:
    - Starting Annual Income: $${annualIncome}
    - Monthly Debts: $${monthlyDebts}
    - Annual Salary Growth Rate: ${salaryGrowthRate * 100}%
    - Annual Expense Growth Rate: ${expenseGrowthRate * 100}%
    Provide the results in a JSON array with "year", "income", and "debts" fields.
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',
    });

    // Extract and parse AI response
    const aiResponse = completion.choices[0].message.content;
    const projections = JSON.parse(aiResponse);

    res.json({ projections });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).json({ error: 'Prediction failed.' });
  }
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

// F-Kort Variable Short Term Loan Page Route
app.get('/f-kort-variable-loan', (req, res) => {
  res.render('f-kort-variable-loan');
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

// **Add the static middleware after your routes**
app.use(express.static('public'));
