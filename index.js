require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const port = process.env.PORT || 3000;

const bcrypt = require('bcrypt');
const session = require('express-session');
const { OpenAI } = require('openai');

const { DefaultAzureCredential } = require('@azure/identity');
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

// Middleware to make 'user' available in all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Set EJS as the templating engine
app.set('view engine', 'ejs');
// Optional: Set the views directory explicitly if it's not in the default location
app.set('views', path.join(__dirname, 'views'));

// Azure Key Vault and SQL Database Connection
const credential = new DefaultAzureCredential();
const keyVaultUrl = process.env.KEY_VAULT_URL;
const secretClient = new SecretClient(keyVaultUrl, credential);

let sqlConfig;

async function getSqlConfig() {
  try {
    const secret = await secretClient.getSecret('SqlConnectionString');
    sqlConfig = {
      connectionString: secret.value, // Assuming the secret is the connection string
      options: {
        encrypt: true, // For secure connection
      },
    };
  } catch (err) {
    console.error('Error retrieving Azure SQL connection string from Key Vault:', err.message);
  }
}

getSqlConfig();

let pool;

async function connectToDatabase() {
  try {
    await getSqlConfig(); // Ensure sqlConfig is populated
    pool = await sql.connect(sqlConfig.connectionString);
    console.log('Connected to Azure SQL database.');
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
}

connectToDatabase();

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

    // Save the user
    await pool
      .request()
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, hashedPassword)
      .query('INSERT INTO Users (Email, Password) VALUES (@email, @password)');

    // Set user session
    req.session.user = { email };

    // Redirect to the original requested URL or home page
    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo; // Remove the return URL from session
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
        req.session.user = { email: user.Email };

        // Redirect to the original requested URL or home page
        const redirectTo = req.session.returnTo || '/';
        delete req.session.returnTo; // Remove the return URL from session
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
app.get('/profile', async (req, res) => {
  if (req.session.user) {
    try {
      const result = await pool
        .request()
        .input('email', sql.VarChar, req.session.user.email)
        .query('SELECT * FROM Users WHERE Email = @email');

      const user = result.recordset[0];

      if (user) {
        res.render('profile', { user });
      } else {
        res.redirect('/login');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err.message);
      res.redirect('/login');
    }
  } else {
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
app.get('/preapproval', ensureAuthenticated, (req, res) => {
  res.render('preapproval/index');
});

app.get('/preapproval/step/:step', ensureAuthenticated, (req, res) => {
  const step = parseInt(req.params.step);

  // If step is beyond the last step, redirect to review
  if (step > 8) {
    return res.redirect('/preapproval/review');
  }

  res.render(`preapproval/step${step}`, { data: req.session.preApprovalData });
});

app.post('/preapproval/step/:step', ensureAuthenticated, (req, res) => {
  const step = parseInt(req.params.step);

  // Initialize session data if it doesn't exist
  if (!req.session.preApprovalData) {
    req.session.preApprovalData = {};
  }

  // Save current step data to session
  req.session.preApprovalData[`step${step}`] = req.body;

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
app.post('/preapproval/submit', (req, res) => {
  const data = req.session.preApprovalData;

  // Here, you would typically save the data to a database or process it as needed

  // Clear session data after submission
  req.session.preApprovalData = null;

  res.redirect('/preapproval/thank-you');
});

// Thank You Page Route
app.get('/preapproval/thank-you', (req, res) => {
  res.render('preapproval/thank-you');
});

// Mortgage Calculator Route
app.get('/mortgage-calculator', (req, res) => {
  res.render('mortgage-calculator');
});

// **Affordability Calculator Route**
app.get('/affordability-calculator', (req, res) => {
  res.render('affordability-calculator');
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

// **Add the static middleware after your routes**
app.use(express.static('public'));
// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
