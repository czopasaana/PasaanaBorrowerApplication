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

    // Fetching and preparing user-related data for various tasks
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
        BorrowerMiddleName: row.BorrowerMiddleName,
        BorrowerSuffix: row.BorrowerSuffix,
        AlternateNames: row.AlternateNames,
        BorrowerDOB: row.BorrowerDOB,
        HomePhone: row.HomePhone,
        CellPhone: row.CellPhone,
        WorkPhone: row.WorkPhone,
        EmailAddress: row.EmailAddress,
        Citizenship: row.Citizenship,
        TypeOfCredit: row.TypeOfCredit,
        NumberOfBorrowers: row.NumberOfBorrowers,
        MaritalStatus: row.MaritalStatus,
        DependentsNumber: row.DependentsNumber,
        DependentsAges: row.DependentsAges,
        CurrentAddressStreet: row.CurrentAddressStreet,
        CurrentAddressCity: row.CurrentAddressCity,
        CurrentAddressState: row.CurrentAddressState,
        CurrentAddressZip: row.CurrentAddressZip,
        CurrentAddressYears: row.CurrentAddressYears,
        CurrentAddressMonths: row.CurrentAddressMonths,
        CurrentAddressHousing: row.CurrentAddressHousing,
        CurrentAddressRent: row.CurrentAddressRent,
        HasFormerAddress: row.HasFormerAddress,
        FormerAddressStreet: row.FormerAddressStreet,
        FormerAddressCity: row.FormerAddressCity,
        FormerAddressState: row.FormerAddressState,
        FormerAddressZip: row.FormerAddressZip,
        FormerAddressYears: row.FormerAddressYears,
        FormerAddressMonths: row.FormerAddressMonths,
        FormerAddressHousing: row.FormerAddressHousing,
        FormerAddressRent: row.FormerAddressRent,
        HasMailingAddress: row.HasMailingAddress,
        MailingAddressStreet: row.MailingAddressStreet,
        MailingAddressCity: row.MailingAddressCity,
        MailingAddressState: row.MailingAddressState,
        MailingAddressZip: row.MailingAddressZip,
        HasCurrentEmployment: row.HasCurrentEmployment,
        EmployerName: row.EmployerName,
        AnnualIncome: row.AnnualIncome,
        EmployerPhone: row.EmployerPhone,
        EmployerStreet: row.EmployerStreet,
        EmployerUnit: row.EmployerUnit,
        EmployerCity: row.EmployerCity,
        EmployerState: row.EmployerState,
        EmployerZip: row.EmployerZip,
        EmployerCountry: row.EmployerCountry,
        PositionTitle: row.PositionTitle,
        StartDate: row.StartDate,
        LineOfWorkYears: row.LineOfWorkYears,
        LineOfWorkMonths: row.LineOfWorkMonths,
        IsFamilyEmployee: row.IsFamilyEmployee,
        OwnershipShare: row.OwnershipShare,
        MonthlyIncomeOrLoss: row.MonthlyIncomeOrLoss,
        BaseIncome: row.BaseIncome,
        OvertimeIncome: row.OvertimeIncome,
        BonusIncome: row.BonusIncome,
        CommissionIncome: row.CommissionIncome,
        MilitaryEntitlements: row.MilitaryEntitlements,
        OtherIncome: row.OtherIncome,
        HasAdditionalEmployment: row.HasAdditionalEmployment,
        EmployerNameAdditional1: row.EmployerNameAdditional1,
        EmployerPhoneAdditional1: row.EmployerPhoneAdditional1,
        EmployerStreetAdditional1: row.EmployerStreetAdditional1,
        EmployerUnitAdditional1: row.EmployerUnitAdditional1,
        EmployerCityAdditional1: row.EmployerCityAdditional1,
        EmployerStateAdditional1: row.EmployerStateAdditional1,
        EmployerZipAdditional1: row.EmployerZipAdditional1,
        EmployerCountryAdditional1: row.EmployerCountryAdditional1,
        PositionTitleAdditional1: row.PositionTitleAdditional1,
        StartDateAdditional1: row.StartDateAdditional1,
        LineOfWorkYearsAdditional1: row.LineOfWorkYearsAdditional1,
        LineOfWorkMonthsAdditional1: row.LineOfWorkMonthsAdditional1,
        IsFamilyEmployeeAdditional1: row.IsFamilyEmployeeAdditional1,
        OwnershipShareAdditional1: row.OwnershipShareAdditional1,
        MonthlyIncomeOrLossAdditional1: row.MonthlyIncomeOrLossAdditional1,
        BaseIncomeAdditional1: row.BaseIncomeAdditional1,
        OvertimeIncomeAdditional1: row.OvertimeIncomeAdditional1,
        BonusIncomeAdditional1: row.BonusIncomeAdditional1,
        CommissionIncomeAdditional1: row.CommissionIncomeAdditional1,
        MilitaryEntitlementsAdditional1: row.MilitaryEntitlementsAdditional1,
        OtherIncomeAdditional1: row.OtherIncomeAdditional1,
        HasPreviousEmploymentAdditional2: row.HasPreviousEmploymentAdditional2,
        EmployerNameAdditional2: row.EmployerNameAdditional2,
        PrevGrossMonthlyIncomeAdditional2: row.PrevGrossMonthlyIncomeAdditional2,
        EmployerStreetAdditional2: row.EmployerStreetAdditional2,
        EmployerUnitAdditional2: row.EmployerUnitAdditional2,
        EmployerCityAdditional2: row.EmployerCityAdditional2,
        EmployerStateAdditional2: row.EmployerStateAdditional2,
        EmployerZipAdditional2: row.EmployerZipAdditional2,
        EmployerCountryAdditional2: row.EmployerCountryAdditional2,
        PositionTitleAdditional2: row.PositionTitleAdditional2,
        StartDateAdditional2: row.StartDateAdditional2,
        EndDateAdditional2: row.EndDateAdditional2,
        WasBusinessOwnerAdditional2: row.WasBusinessOwnerAdditional2,
        HasOtherIncome: row.HasOtherIncome,
        IncomeSource1: row.IncomeSource1,
        MonthlyIncome1: row.MonthlyIncome1,
        IncomeSource2: row.IncomeSource2,
        MonthlyIncome2: row.MonthlyIncome2,
        IncomeSource3: row.IncomeSource3,
        MonthlyIncome3: row.MonthlyIncome3,
        IncomeSource4: row.IncomeSource4,
        MonthlyIncome4: row.MonthlyIncome4,
        AccountType1: row.AccountType1,
        FinancialInstitution1: row.FinancialInstitution1,
        AccountNumber1: row.AccountNumber1,
        CashValue1: row.CashValue1,
        AccountType2: row.AccountType2,
        FinancialInstitution2: row.FinancialInstitution2,
        AccountNumber2: row.AccountNumber2,
        CashValue2: row.CashValue2,
        AccountType3: row.AccountType3,
        FinancialInstitution3: row.FinancialInstitution3,
        AccountNumber3: row.AccountNumber3,
        CashValue3: row.CashValue3,
        AccountType4: row.AccountType4,
        FinancialInstitution4: row.FinancialInstitution4,
        AccountNumber4: row.AccountNumber4,
        CashValue4: row.CashValue4,
        AccountType5: row.AccountType5,
        FinancialInstitution5: row.FinancialInstitution5,
        AccountNumber5: row.AccountNumber5,
        CashValue5: row.CashValue5,
        HasOtherAssets2b: row.HasOtherAssets2b,
        AssetCreditType1: row.AssetCreditType1,
        AssetCreditValue1: row.AssetCreditValue1,
        AssetCreditType2: row.AssetCreditType2,
        AssetCreditValue2: row.AssetCreditValue2,
        AssetCreditType3: row.AssetCreditType3,
        AssetCreditValue3: row.AssetCreditValue3,
        AssetCreditType4: row.AssetCreditType4,
        AssetCreditValue4: row.AssetCreditValue4,
        HasLiabilities2c: row.HasLiabilities2c,
        AccountType2c1: row.AccountType2c1,
        CompanyName2c1: row.CompanyName2c1,
        AccountNumber2c1: row.AccountNumber2c1,
        UnpaidBalance2c1: row.UnpaidBalance2c1,
        PayOff2c1: row.PayOff2c1,
        MonthlyPayment2c1: row.MonthlyPayment2c1, 
        AccountType2c2: row.AccountType2c2,
        CompanyName2c2: row.CompanyName2c2,
        AccountNumber2c2: row.AccountNumber2c2,
        UnpaidBalance2c2: row.UnpaidBalance2c2,
        PayOff2c2: row.PayOff2c2,
        MonthlyPayment2c2: row.MonthlyPayment2c2,
        AccountType2c3: row.AccountType2c3,
        CompanyName2c3: row.CompanyName2c3,
        AccountNumber2c3: row.AccountNumber2c3,
        UnpaidBalance2c3: row.UnpaidBalance2c3,
        PayOff2c3: row.PayOff2c3,
        MonthlyPayment2c3: row.MonthlyPayment2c3, 
        AccountType2c4: row.AccountType2c4,
        CompanyName2c4: row.CompanyName2c4,
        AccountNumber2c4: row.AccountNumber2c4,
        UnpaidBalance2c4: row.UnpaidBalance2c4,
        PayOff2c4: row.PayOff2c4,
        MonthlyPayment2c4: row.MonthlyPayment2c4,
        AccountType2c5: row.AccountType2c5,
        CompanyName2c5: row.CompanyName2c5,
        AccountNumber2c5: row.AccountNumber2c5,
        UnpaidBalance2c5: row.UnpaidBalance2c5,
        PayOff2c5: row.PayOff2c5,
        MonthlyPayment2c5: row.MonthlyPayment2c5, 
        HasOtherLiabilities2d: row.HasOtherLiabilities2d,
        LiabilityType2d1: row.LiabilityType2d1,
        MonthlyPayment2d1: row.MonthlyPayment2d1,
        LiabilityType2d2: row.LiabilityType2d2,
        MonthlyPayment2d2: row.MonthlyPayment2d2,
        LiabilityType2d3: row.LiabilityType2d3,
        MonthlyPayment2d3: row.MonthlyPayment2d3,
        LiabilityType2d4: row.LiabilityType2d4,
        MonthlyPayment2d4: row.MonthlyPayment2d4,
        HasRealEstate3: row.HasRealEstate3,
        PropertyStreet1: row.PropertyStreet1,
        PropertyCity1: row.PropertyCity1,
        PropertyState1: row.PropertyState1,
        PropertyZip1: row.PropertyZip1,
        PropertyValue1: row.PropertyValue1,
        PropertyStatus1: row.PropertyStatus1,
        IntendedOccupancy1: row.IntendedOccupancy1,
        MonthlyInsurance1: row.MonthlyInsurance1,
        MonthlyRentalIncome1: row.MonthlyRentalIncome1,
        HasMortgageLoans1: row.HasMortgageLoans1,
        CreditorName1: row.CreditorName1,
        CreditorAccount1: row.CreditorAccount1,
        MortgagePayment1: row.MortgagePayment1,
        UnpaidBalance1: row.UnpaidBalance1,
        PayOffMortgage1: row.PayOffMortgage1,
        MortgageType1: row.MortgageType1,
        HasProperty2: row.HasProperty2,
        PropertyStreet2: row.PropertyStreet2,
        PropertyCity2: row.PropertyCity2,
        PropertyState2: row.PropertyState2,
        PropertyZip2: row.PropertyZip2,
        PropertyValue2: row.PropertyValue2,
        PropertyStatus2: row.PropertyStatus2,
        IntendedOccupancy2: row.IntendedOccupancy2,
        MonthlyInsurance2: row.MonthlyInsurance2,
        MonthlyRentalIncome2: row.MonthlyRentalIncome2,
        HasMortgageLoans2: row.HasMortgageLoans2,
        CreditorName2: row.CreditorName2,
        CreditorAccount2: row.CreditorAccount2,
        MortgagePayment2: row.MortgagePayment2,
        UnpaidBalance2: row.UnpaidBalance2,
        PayOffMortgage2: row.PayOffMortgage2,
        MortgageType2: row.MortgageType2,
        HasProperty3: row.HasProperty3,
        PropertyStreet3: row.PropertyStreet3,
        PropertyCity3: row.PropertyCity3,
        PropertyState3: row.PropertyState3,
        PropertyZip3: row.PropertyZip3,
        PropertyValue3: row.PropertyValue3,
        PropertyStatus3: row.PropertyStatus3,
        IntendedOccupancy3: row.IntendedOccupancy3,
        MonthlyInsurance3: row.MonthlyInsurance3,
        MonthlyRentalIncome3: row.MonthlyRentalIncome3,
        HasMortgageLoans3: row.HasMortgageLoans3,
        CreditorName3: row.CreditorName3,
        CreditorAccount3: row.CreditorAccount3,
        MortgagePayment3: row.MortgagePayment3,
        UnpaidBalance3: row.UnpaidBalance3,
        PayOffMortgage3: row.PayOffMortgage3,
        MortgageType3: row.MortgageType3,
        LoanAmount4: row.LoanAmount4,
        LoanPurpose4: row.LoanPurpose4,
        LoanPurposeOtherDesc4: row.LoanPurposeOtherDesc4,
        PropertyStreet4: row.PropertyStreet4,
        PropertyCity4: row.PropertyCity4,
        PropertyState4: row.PropertyState4,
        PropertyZip4: row.PropertyZip4,
        PropertyCounty4: row.PropertyCounty4,
        PropertyUnit4: row.PropertyUnit4,
        NumberOfUnits4: row.NumberOfUnits4,
        PropertyValue4: row.PropertyValue4,
        Occupancy4: row.Occupancy4,
        FHASecondaryResidence4: row.FHASecondaryResidence4,
        MixedUse4: row.MixedUse4,
        ManufacturedHome4: row.ManufacturedHome4,
        HasNewMortgages4b: row.HasNewMortgages4b,
        CreditorName4b1: row.CreditorName4b1,
        LienType4b1: row.LienType4b1,
        MonthlyPayment4b1: row.MonthlyPayment4b1,
        LoanAmount4b1: row.LoanAmount4b1,
        CreditLimit4b1: row.CreditLimit4b1,
        CreditorName4b2: row.CreditorName4b2,
        LienType4b2: row.LienType4b2,
        MonthlyPayment4b2: row.MonthlyPayment4b2,
        LoanAmount4b2: row.LoanAmount4b2,
        CreditLimit4b2: row.CreditLimit4b2,
        HasRentalIncome4c: row.HasRentalIncome4c,
        ExpectedRentalIncome4c: row.ExpectedRentalIncome4c,
        NetRentalIncome4c: row.NetRentalIncome4c,
        HasGiftsGrants4d: row.HasGiftsGrants4d,
        GiftAssetType4d1: row.GiftAssetType4d1,
        Deposited4d1: row.Deposited4d1,
        GiftSource4d1: row.GiftSource4d1,
        GiftValue4d1: row.GiftValue4d1,
        GiftAssetType4d2: row.GiftAssetType4d2,
        Deposited4d2: row.Deposited4d2,
        GiftSource4d2: row.GiftSource4d2,
        GiftValue4d2: row.GiftValue4d2,
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







