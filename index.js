const express = require('express');
const app = express();
const path = require('path');
const port = 3000;

const bcrypt = require('bcrypt');
const session = require('express-session');

// In-memory user store (Use a database in production)
const users = [];

// Middleware
app.use(express.urlencoded({ extended: true }));
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
  const showMessage = req.session.returnTo ? true : false;
  res.render('signup', { showMessage });
});

// Sign Up Handler
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return res.send('User already exists. Please sign in.');
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user
    users.push({ email, password: hashedPassword });

    // Set user session
    req.session.user = { email };

    // Redirect to the original requested URL or home page
    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo; // Remove the return URL from session
    return res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    res.redirect('/signup');
  }
});

// Sign In Page
app.get('/login', (req, res) => {
  const showMessage = req.session.returnTo ? true : false;
  res.render('login', { showMessage });
});

// Sign In Handler
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (user) {
    try {
      // Compare passwords
      if (await bcrypt.compare(password, user.password)) {
        // Authentication successful
        req.session.user = { email: user.email };

        // Redirect to the original requested URL or home page
        const redirectTo = req.session.returnTo || '/';
        delete req.session.returnTo; // Remove the return URL from session
        return res.redirect(redirectTo);
      } else {
        // Authentication failed
        return res.send('Incorrect password.');
      }
    } catch (err) {
      console.error(err);
      return res.redirect('/login');
    }
  } else {
    return res.send('User not found.');
  }
});

// Profile Page
app.get('/profile', (req, res) => {
  if (req.session.user) {
    res.render('profile');
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

// **Add the static middleware after your routes**
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
