const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const sql = require('mssql');

router.post('/saveLoanApplication', upload.array('loanDocs'), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  // Helper functions to handle empty fields
  function toNullIfEmpty(val) {
    return val && val.trim() !== '' ? val.trim() : null;
  }
  function toDecimal(val) {
    if (!val || val.trim() === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }
  function toInt(val) {
    if (!val || val.trim() === '') return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  }

  // -----------------------------------------------------------------------------------
  // Extract fields from req.body
  // -----------------------------------------------------------------------------------
  // Borrower Name Parts
  const borrowerFirstName     = toNullIfEmpty(req.body.borrowerFirstName);
  const borrowerMiddleName    = toNullIfEmpty(req.body.borrowerMiddleName);
  const borrowerSuffix        = toNullIfEmpty(req.body.borrowerSuffix);
  const alternateNames        = toNullIfEmpty(req.body.alternateNames);

  // Basic Info
  const borrowerLastName      = toNullIfEmpty(req.body.borrowerLastName);
  const borrowerSSN           = toNullIfEmpty(req.body.borrowerSSN);
  const borrowerDOB           = toNullIfEmpty(req.body.borrowerDOB);
  const citizenship           = toNullIfEmpty(req.body.citizenship);

  // Extract contact info
  const homePhone = toNullIfEmpty(req.body.homePhone);
  const cellPhone = toNullIfEmpty(req.body.cellPhone);
  const workPhone = toNullIfEmpty(req.body.workPhone);
  const emailAddress = toNullIfEmpty(req.body.emailAddress);

  // Credit Type
  const typeOfCredit          = toNullIfEmpty(req.body.typeOfCredit);
  const numberOfBorrowers     = toInt(req.body.numberOfBorrowers);

  // Marital / Dependents
  const maritalStatus         = toNullIfEmpty(req.body.maritalStatus);
  const dependentsNumber      = toInt(req.body.dependentsNumber);
  const dependentsAges        = toNullIfEmpty(req.body.dependentsAges);

  // Current Address
  const currentAddressStreet  = toNullIfEmpty(req.body.currentAddressStreet);
  const currentAddressCity    = toNullIfEmpty(req.body.currentAddressCity);
  const currentAddressState   = toNullIfEmpty(req.body.currentAddressState);
  const currentAddressZip     = toNullIfEmpty(req.body.currentAddressZip);
  const currentAddressYears   = toInt(req.body.currentAddressYears);
  const currentAddressMonths  = toInt(req.body.currentAddressMonths);
  const currentAddressHousing = toNullIfEmpty(req.body.currentAddressHousing);
  const currentAddressRent    = toDecimal(req.body.currentAddressRent);

  // Former Address (if applicable, per your EJS design or future plan)
  const hasFormerAddress = (req.body.hasFormerAddress === 'true');
  const formerAddressStreet   = toNullIfEmpty(req.body.formerAddressStreet);
  const formerAddressCity     = toNullIfEmpty(req.body.formerAddressCity);
  const formerAddressState    = toNullIfEmpty(req.body.formerAddressState);
  const formerAddressZip      = toNullIfEmpty(req.body.formerAddressZip);
  const formerAddressYears    = toInt(req.body.formerAddressYears);
  const formerAddressMonths   = toInt(req.body.formerAddressMonths);
  const formerAddressHousing  = toNullIfEmpty(req.body.formerAddressHousing);
  const formerAddressRent     = toDecimal(req.body.formerAddressRent);

  // Mailing Address (if applicable)
  const hasMailingAddress = (req.body.hasMailingAddress === 'true');
  const mailingAddressStreet  = toNullIfEmpty(req.body.mailingAddressStreet);
  const mailingAddressCity    = toNullIfEmpty(req.body.mailingAddressCity);
  const mailingAddressState   = toNullIfEmpty(req.body.mailingAddressState);
  const mailingAddressZip     = toNullIfEmpty(req.body.mailingAddressZip);

  // Employment / Income (Section 1b)
  const hasCurrentEmployment = (req.body.hasCurrentEmployment === 'true');
  const employmentType        = toNullIfEmpty(req.body.employmentType);
  const employerName          = toNullIfEmpty(req.body.employerName);
  const annualIncome          = toDecimal(req.body.annualIncome);

  // Current Employment
  const employerPhone         = toNullIfEmpty(req.body.employerPhone);
  const employerStreet        = toNullIfEmpty(req.body.employerStreet);
  const employerUnit          = toNullIfEmpty(req.body.employerUnit);
  const employerCity          = toNullIfEmpty(req.body.employerCity);
  const employerState         = toNullIfEmpty(req.body.employerState);
  const employerZip           = toNullIfEmpty(req.body.employerZip);
  const employerCountry       = toNullIfEmpty(req.body.employerCountry);

  const positionTitle         = toNullIfEmpty(req.body.positionTitle);
  const startDate             = toNullIfEmpty(req.body.startDate); // handle as date

  const lineOfWorkYears       = toInt(req.body.lineOfWorkYears);
  const lineOfWorkMonths      = toInt(req.body.lineOfWorkMonths);

  const isFamilyEmployee      = req.body.isFamilyEmployee === 'true'; // boolean
  const ownershipShare        = toNullIfEmpty(req.body.ownershipShare);
  const monthlyIncomeOrLoss   = toDecimal(req.body.monthlyIncomeOrLoss);

  const baseIncome            = toDecimal(req.body.baseIncome);
  const overtimeIncome        = toDecimal(req.body.overtimeIncome);
  const bonusIncome           = toDecimal(req.body.bonusIncome);
  const commissionIncome      = toDecimal(req.body.commissionIncome);
  const militaryEntitlements  = toDecimal(req.body.militaryEntitlements);
  const otherIncome           = toDecimal(req.body.otherIncome);

  // Section 1c Additional1 fields
  const hasAdditionalEmployment = (req.body.hasAdditionalEmployment === 'true');
  const employerNameAdditional1          = toNullIfEmpty(req.body.employerNameAdditional1);
  const employerPhoneAdditional1         = toNullIfEmpty(req.body.employerPhoneAdditional1);
  const employerStreetAdditional1        = toNullIfEmpty(req.body.employerStreetAdditional1);
  const employerUnitAdditional1          = toNullIfEmpty(req.body.employerUnitAdditional1);
  const employerCityAdditional1          = toNullIfEmpty(req.body.employerCityAdditional1);
  const employerStateAdditional1         = toNullIfEmpty(req.body.employerStateAdditional1);
  const employerZipAdditional1           = toNullIfEmpty(req.body.employerZipAdditional1);
  const employerCountryAdditional1       = toNullIfEmpty(req.body.employerCountryAdditional1);

  const positionTitleAdditional1         = toNullIfEmpty(req.body.positionTitleAdditional1);
  const startDateAdditional1             = toNullIfEmpty(req.body.startDateAdditional1);

  const lineOfWorkYearsAdditional1       = toInt(req.body.lineOfWorkYearsAdditional1);
  const lineOfWorkMonthsAdditional1      = toInt(req.body.lineOfWorkMonthsAdditional1);

  const isFamilyEmployeeAdditional1      = req.body.isFamilyEmployeeAdditional1 === 'true';
  const ownershipShareAdditional1        = toNullIfEmpty(req.body.ownershipShareAdditional1);
  const monthlyIncomeOrLossAdditional1   = toDecimal(req.body.monthlyIncomeOrLossAdditional1);

  const baseIncomeAdditional1            = toDecimal(req.body.baseIncomeAdditional1);
  const overtimeIncomeAdditional1        = toDecimal(req.body.overtimeIncomeAdditional1);
  const bonusIncomeAdditional1           = toDecimal(req.body.bonusIncomeAdditional1);
  const commissionIncomeAdditional1      = toDecimal(req.body.commissionIncomeAdditional1);
  const militaryEntitlementsAdditional1  = toDecimal(req.body.militaryEntitlementsAdditional1);
  const otherIncomeAdditional1           = toDecimal(req.body.otherIncomeAdditional1);

  // Section 1d: Additional2 (Previous Employment)
  const hasPreviousEmploymentAdditional2 = (req.body.hasPreviousEmploymentAdditional2 === 'true');
  const employerNameAdditional2         = toNullIfEmpty(req.body.employerNameAdditional2);
  const prevGrossMonthlyIncomeAdditional2 = toDecimal(req.body.prevGrossMonthlyIncomeAdditional2);

  const employerStreetAdditional2       = toNullIfEmpty(req.body.employerStreetAdditional2);
  const employerUnitAdditional2         = toNullIfEmpty(req.body.employerUnitAdditional2);
  const employerCityAdditional2         = toNullIfEmpty(req.body.employerCityAdditional2);
  const employerStateAdditional2        = toNullIfEmpty(req.body.employerStateAdditional2);
  const employerZipAdditional2          = toNullIfEmpty(req.body.employerZipAdditional2);
  const employerCountryAdditional2      = toNullIfEmpty(req.body.employerCountryAdditional2);

  const positionTitleAdditional2        = toNullIfEmpty(req.body.positionTitleAdditional2);
  const startDateAdditional2            = toNullIfEmpty(req.body.startDateAdditional2);
  const endDateAdditional2              = toNullIfEmpty(req.body.endDateAdditional2);

  const wasBusinessOwnerAdditional2     = (req.body.wasBusinessOwnerAdditional2 === 'true');

  // Section 1e: Income From Other Sources
  const hasOtherIncome    = (req.body.hasOtherIncome === 'true');
  const incomeSource1     = toNullIfEmpty(req.body.incomeSource1);
  const monthlyIncome1    = toDecimal(req.body.monthlyIncome1);
  const incomeSource2     = toNullIfEmpty(req.body.incomeSource2);
  const monthlyIncome2    = toDecimal(req.body.monthlyIncome2);
  const incomeSource3     = toNullIfEmpty(req.body.incomeSource3);
  const monthlyIncome3    = toDecimal(req.body.monthlyIncome3);
  const incomeSource4     = toNullIfEmpty(req.body.incomeSource4);
  const monthlyIncome4    = toDecimal(req.body.monthlyIncome4);

  // Section 2a: Assets
  const accountType1          = toNullIfEmpty(req.body.accountType1);
  const financialInstitution1 = toNullIfEmpty(req.body.financialInstitution1);
  const accountNumber1        = toNullIfEmpty(req.body.accountNumber1);
  const cashValue1            = toDecimal(req.body.cashValue1);

  const accountType2          = toNullIfEmpty(req.body.accountType2);
  const financialInstitution2 = toNullIfEmpty(req.body.financialInstitution2);
  const accountNumber2        = toNullIfEmpty(req.body.accountNumber2);
  const cashValue2            = toDecimal(req.body.cashValue2);

  const accountType3          = toNullIfEmpty(req.body.accountType3);
  const financialInstitution3 = toNullIfEmpty(req.body.financialInstitution3);
  const accountNumber3        = toNullIfEmpty(req.body.accountNumber3);
  const cashValue3            = toDecimal(req.body.cashValue3);

  const accountType4          = toNullIfEmpty(req.body.accountType4);
  const financialInstitution4 = toNullIfEmpty(req.body.financialInstitution4);
  const accountNumber4        = toNullIfEmpty(req.body.accountNumber4);
  const cashValue4            = toDecimal(req.body.cashValue4);

  const accountType5          = toNullIfEmpty(req.body.accountType5);
  const financialInstitution5 = toNullIfEmpty(req.body.financialInstitution5);
  const accountNumber5        = toNullIfEmpty(req.body.accountNumber5);
  const cashValue5            = toDecimal(req.body.cashValue5);

  // Section 2b: Other Assets & Credits
  const hasOtherAssets2b = (req.body.hasOtherAssets2b === 'true');
  const assetCreditType1  = toNullIfEmpty(req.body.assetCreditType1);
  const assetCreditValue1 = toDecimal(req.body.assetCreditValue1);
  const assetCreditType2  = toNullIfEmpty(req.body.assetCreditType2);
  const assetCreditValue2 = toDecimal(req.body.assetCreditValue2);
  const assetCreditType3  = toNullIfEmpty(req.body.assetCreditType3);
  const assetCreditValue3 = toDecimal(req.body.assetCreditValue3);
  const assetCreditType4  = toNullIfEmpty(req.body.assetCreditType4);
  const assetCreditValue4 = toDecimal(req.body.assetCreditValue4);

  // Section 2c: Liabilities
  const hasLiabilities2c = (req.body.hasLiabilities2c === 'true');

  const accountType2c1     = toNullIfEmpty(req.body.accountType2c1);
  const companyName2c1     = toNullIfEmpty(req.body.companyName2c1);
  const accountNumber2c1   = toNullIfEmpty(req.body.accountNumber2c1);
  const unpaidBalance2c1   = toDecimal(req.body.unpaidBalance2c1);
  const payOff2c1          = (req.body.payOff2c1 === 'true');
  const monthlyPayment2c1  = toDecimal(req.body.monthlyPayment2c1);

  const accountType2c2     = toNullIfEmpty(req.body.accountType2c2);
  const companyName2c2     = toNullIfEmpty(req.body.companyName2c2);
  const accountNumber2c2   = toNullIfEmpty(req.body.accountNumber2c2);
  const unpaidBalance2c2   = toDecimal(req.body.unpaidBalance2c2);
  const payOff2c2          = (req.body.payOff2c2 === 'true');
  const monthlyPayment2c2  = toDecimal(req.body.monthlyPayment2c2); 

  const accountType2c3     = toNullIfEmpty(req.body.accountType2c3);
  const companyName2c3     = toNullIfEmpty(req.body.companyName2c3);
  const accountNumber2c3   = toNullIfEmpty(req.body.accountNumber2c3);
  const unpaidBalance2c3   = toDecimal(req.body.unpaidBalance2c3);
  const payOff2c3          = (req.body.payOff2c3 === 'true');
  const monthlyPayment2c3  = toDecimal(req.body.monthlyPayment2c3);

  const accountType2c4     = toNullIfEmpty(req.body.accountType2c4);
  const companyName2c4     = toNullIfEmpty(req.body.companyName2c4);
  const accountNumber2c4   = toNullIfEmpty(req.body.accountNumber2c4);
  const unpaidBalance2c4   = toDecimal(req.body.unpaidBalance2c4);
  const payOff2c4          = (req.body.payOff2c4 === 'true');
  const monthlyPayment2c4  = toDecimal(req.body.monthlyPayment2c4);

  const accountType2c5     = toNullIfEmpty(req.body.accountType2c5);
  const companyName2c5     = toNullIfEmpty(req.body.companyName2c5);
  const accountNumber2c5   = toNullIfEmpty(req.body.accountNumber2c5);
  const unpaidBalance2c5   = toDecimal(req.body.unpaidBalance2c5);
  const payOff2c5          = (req.body.payOff2c5 === 'true');
  const monthlyPayment2c5  = toDecimal(req.body.monthlyPayment2c5);

  // Section 2d: Other Liabilities
  const hasOtherLiabilities2d = (req.body.hasOtherLiabilities2d === 'true');

  const liabilityType2d1  = toNullIfEmpty(req.body.liabilityType2d1);
  const monthlyPayment2d1 = toDecimal(req.body.monthlyPayment2d1);
  
  const liabilityType2d2  = toNullIfEmpty(req.body.liabilityType2d2);
  const monthlyPayment2d2 = toDecimal(req.body.monthlyPayment2d2);
  
  const liabilityType2d3  = toNullIfEmpty(req.body.liabilityType2d3);
  const monthlyPayment2d3 = toDecimal(req.body.monthlyPayment2d3);
  
  const liabilityType2d4  = toNullIfEmpty(req.body.liabilityType2d4);
  const monthlyPayment2d4 = toDecimal(req.body.monthlyPayment2d4);
  
  // Section 3: Real Estate
  const hasRealEstate3 = (req.body.hasRealEstate3 === 'true');

  // Section 3a: Property #1
  const propertyStreet1      = toNullIfEmpty(req.body.propertyStreet1);
  const propertyCity1        = toNullIfEmpty(req.body.propertyCity1);
  const propertyState1       = toNullIfEmpty(req.body.propertyState1);
  const propertyZip1         = toNullIfEmpty(req.body.propertyZip1);
  const propertyValue1       = toDecimal(req.body.propertyValue1);
  const propertyStatus1      = toNullIfEmpty(req.body.propertyStatus1);
  const intendedOccupancy1   = toNullIfEmpty(req.body.intendedOccupancy1);
  const monthlyInsurance1    = toDecimal(req.body.monthlyInsurance1);
  const monthlyRentalIncome1 = toDecimal(req.body.monthlyRentalIncome1);

  const hasMortgageLoans1    = (req.body.hasMortgageLoans1 === 'true');
  const creditorName1        = toNullIfEmpty(req.body.creditorName1);
  const creditorAccount1     = toNullIfEmpty(req.body.creditorAccount1);
  const mortgagePayment1     = toDecimal(req.body.mortgagePayment1);
  const unpaidBalance1       = toDecimal(req.body.unpaidBalance1);
  const payOffMortgage1      = (req.body.payOffMortgage1 === 'true');
  const mortgageType1        = toNullIfEmpty(req.body.mortgageType1);

  // Section 3b: Property #2
  const hasProperty2 = (req.body.hasProperty2 === 'true');
  const propertyStreet2      = toNullIfEmpty(req.body.propertyStreet2);
  const propertyCity2        = toNullIfEmpty(req.body.propertyCity2);
  const propertyState2       = toNullIfEmpty(req.body.propertyState2);
  const propertyZip2         = toNullIfEmpty(req.body.propertyZip2);
  const propertyValue2       = toDecimal(req.body.propertyValue2);
  const propertyStatus2      = toNullIfEmpty(req.body.propertyStatus2);
  const intendedOccupancy2   = toNullIfEmpty(req.body.intendedOccupancy2);
  const monthlyInsurance2    = toDecimal(req.body.monthlyInsurance2);
  const monthlyRentalIncome2 = toDecimal(req.body.monthlyRentalIncome2);

  const hasMortgageLoans2    = (req.body.hasMortgageLoans2 === 'true');
  const creditorName2        = toNullIfEmpty(req.body.creditorName2);
  const creditorAccount2     = toNullIfEmpty(req.body.creditorAccount2);
  const mortgagePayment2     = toDecimal(req.body.mortgagePayment2);
  const unpaidBalance2       = toDecimal(req.body.unpaidBalance2);
  const payOffMortgage2      = (req.body.payOffMortgage2 === 'true');
  const mortgageType2        = toNullIfEmpty(req.body.mortgageType2);

  // Section 3c: Property #3
  const hasProperty3 = (req.body.hasProperty3 === 'true');
  const propertyStreet3      = toNullIfEmpty(req.body.propertyStreet3);
  const propertyCity3        = toNullIfEmpty(req.body.propertyCity3);
  const propertyState3       = toNullIfEmpty(req.body.propertyState3);
  const propertyZip3         = toNullIfEmpty(req.body.propertyZip3);
  const propertyValue3       = toDecimal(req.body.propertyValue3);
  const propertyStatus3      = toNullIfEmpty(req.body.propertyStatus3);
  const intendedOccupancy3   = toNullIfEmpty(req.body.intendedOccupancy3);
  const monthlyInsurance3    = toDecimal(req.body.monthlyInsurance3);
  const monthlyRentalIncome3 = toDecimal(req.body.monthlyRentalIncome3);

  const hasMortgageLoans3    = (req.body.hasMortgageLoans3 === 'true');
  const creditorName3        = toNullIfEmpty(req.body.creditorName3);
  const creditorAccount3     = toNullIfEmpty(req.body.creditorAccount3);
  const mortgagePayment3     = toDecimal(req.body.mortgagePayment3);
  const unpaidBalance3       = toDecimal(req.body.unpaidBalance3);
  const payOffMortgage3      = (req.body.payOffMortgage3 === 'true');
  const mortgageType3        = toNullIfEmpty(req.body.mortgageType3);

  // Section 4: Loan and Property Information

  // Section 4a:

  // Helper: interpret radio "Yes"/"No" as boolean
  function toBoolFromYesNo(val) {
    if (!val) return null;       
    return (val.toLowerCase() === 'yes');
  }

  const loanAmount4      = toDecimal(req.body.loanAmount4);
  const loanPurpose4     = toNullIfEmpty(req.body.loanPurpose4); // 'Purchase','Refinance','Other'
  const loanPurposeOtherDesc4 = toNullIfEmpty(req.body.loanPurposeOtherDesc4);

  const propertyStreet4   = toNullIfEmpty(req.body.propertyStreet4);
  const propertyCity4     = toNullIfEmpty(req.body.propertyCity4);
  const propertyState4    = toNullIfEmpty(req.body.propertyState4);
  const propertyZip4      = toNullIfEmpty(req.body.propertyZip4);
  const propertyCounty4   = toNullIfEmpty(req.body.propertyCounty4);
  const propertyUnit4     = toNullIfEmpty(req.body.propertyUnit4);

  const numberOfUnits4    = toInt(req.body.numberOfUnits4);
  const propertyValue4    = toDecimal(req.body.propertyValue4);

  const occupancy4        = toNullIfEmpty(req.body.occupancy4); 

  const fhaSecondaryResidence4 = (req.body.fhaSecondaryResidence4 === 'true');

  // MixedUse4 => parse 'true'/'false' or interpret 'Yes'/'No'
  let mixedUse4 = null;
  if (req.body.mixedUse4 === 'true') mixedUse4 = true;
  if (req.body.mixedUse4 === 'false') mixedUse4 = false;

  let manufacturedHome4 = null;
  if (req.body.manufacturedHome4 === 'true') manufacturedHome4 = true;
  if (req.body.manufacturedHome4 === 'false') manufacturedHome4 = false;

  // Section 4b: Other New Mortgage Loans on the Property You Are Buying or Refinancing
  const hasNewMortgages4b = (req.body.hasNewMortgages4b === 'true');

  
  const creditorName4b1    = toNullIfEmpty(req.body.creditorName4b1);
  const lienType4b1        = toNullIfEmpty(req.body.lienType4b1);
  const monthlyPayment4b1  = toDecimal(req.body.monthlyPayment4b1);
  const loanAmount4b1      = toDecimal(req.body.loanAmount4b1);
  const creditLimit4b1     = toDecimal(req.body.creditLimit4b1);

  
  const creditorName4b2    = toNullIfEmpty(req.body.creditorName4b2);
  const lienType4b2        = toNullIfEmpty(req.body.lienType4b2);
  const monthlyPayment4b2  = toDecimal(req.body.monthlyPayment4b2);
  const loanAmount4b2      = toDecimal(req.body.loanAmount4b2);
  const creditLimit4b2     = toDecimal(req.body.creditLimit4b2);

  // Section 4c: Rental Income on the Property You Want to Purchase
  const hasRentalIncome4c = (req.body.hasRentalIncome4c === 'true');
  const expectedRentalIncome4c = toDecimal(req.body.expectedRentalIncome4c);
  const netRentalIncome4c = toDecimal(req.body.netRentalIncome4c);

  // Section 4d: Gifts or Grants
  const hasGiftsGrants4d = (req.body.hasGiftsGrants4d === 'true');

  const giftAssetType4d1 = toNullIfEmpty(req.body.giftAssetType4d1);
  const deposited4d1     = toNullIfEmpty(req.body.deposited4d1); // 'Deposited' or 'Not Deposited'
  const giftSource4d1    = toNullIfEmpty(req.body.giftSource4d1);
  const giftValue4d1     = toDecimal(req.body.giftValue4d1);

  const giftAssetType4d2 = toNullIfEmpty(req.body.giftAssetType4d2);
  const deposited4d2     = toNullIfEmpty(req.body.deposited4d2);
  const giftSource4d2    = toNullIfEmpty(req.body.giftSource4d2);
  const giftValue4d2     = toDecimal(req.body.giftValue4d2);

  // Assets & Liabilities
  const checkingAccounts      = toDecimal(req.body.checkingAccounts);
  const creditCardDebt        = toDecimal(req.body.creditCardDebt);

  // Property Details
  const propertyAddress       = toNullIfEmpty(req.body.propertyAddress);
  const propertyValue         = toDecimal(req.body.propertyValue);

  // Loan Preferences
  const loanPurpose           = toNullIfEmpty(req.body.loanPurpose);
  const loanTerm              = toInt(req.body.loanTerm);
  const loanType              = toNullIfEmpty(req.body.loanType);
  const rateLock              = toNullIfEmpty(req.body.rateLock);

  // Determine status
  const newStatus             = req.body.newStatus || 'Not Started';

  // -----------------------------------------------------------------------------------
  // SQL Setup & Insert/Update Logic
  // -----------------------------------------------------------------------------------
  const userId = req.session.user.userID;
  const pool   = req.app.locals.pool;

  try {
    // Check if user already has a record
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT TOP 1 * 
        FROM LoanApplications 
        WHERE UserID = @UserID 
        ORDER BY CreatedAt DESC
      `);

    // -------------------------------------------------------------------
    // UPDATE: If record exists
    // -------------------------------------------------------------------
    if (existingRecord.recordset.length > 0) {
      await pool.request()
        .input('UserID',                 sql.Int,           userId)
        
        // New or extended fields
        .input('BorrowerMiddleName',     sql.NVarChar(100), borrowerMiddleName)
        .input('BorrowerSuffix',         sql.NVarChar(50),  borrowerSuffix)
        .input('AlternateNames',         sql.NVarChar(255), alternateNames)
        .input('Citizenship',            sql.NVarChar(50),  citizenship)
        .input('TypeOfCredit',           sql.NVarChar(50),  typeOfCredit)
        .input('NumberOfBorrowers',      sql.Int,           numberOfBorrowers)
        .input('MaritalStatus',          sql.NVarChar(50),  maritalStatus)
        .input('DependentsNumber',       sql.Int,           dependentsNumber)
        .input('DependentsAges',         sql.NVarChar(100), dependentsAges)

        .input('HomePhone',           sql.NVarChar(50), homePhone)
        .input('CellPhone',           sql.NVarChar(50), cellPhone)
        .input('WorkPhone',           sql.NVarChar(50), workPhone)
        .input('EmailAddress',        sql.NVarChar(100), emailAddress)

        .input('CurrentAddressStreet',   sql.NVarChar(255), currentAddressStreet)
        .input('CurrentAddressCity',     sql.NVarChar(100), currentAddressCity)
        .input('CurrentAddressState',    sql.NVarChar(50),  currentAddressState)
        .input('CurrentAddressZip',      sql.NVarChar(20),  currentAddressZip)
        .input('CurrentAddressYears',    sql.Int,           currentAddressYears)
        .input('CurrentAddressMonths',   sql.Int,           currentAddressMonths)
        .input('CurrentAddressHousing',  sql.NVarChar(50),  currentAddressHousing)
        .input('CurrentAddressRent',     sql.Decimal(18,2), currentAddressRent)

        .input('HasFormerAddress',       sql.Bit,           hasFormerAddress)
        .input('FormerAddressStreet',    sql.NVarChar(255), formerAddressStreet)
        .input('FormerAddressCity',      sql.NVarChar(100), formerAddressCity)
        .input('FormerAddressState',     sql.NVarChar(50),  formerAddressState)
        .input('FormerAddressZip',       sql.NVarChar(20),  formerAddressZip)
        .input('FormerAddressYears',     sql.Int,           formerAddressYears)
        .input('FormerAddressMonths',    sql.Int,           formerAddressMonths)
        .input('FormerAddressHousing',   sql.NVarChar(50),  formerAddressHousing)
        .input('FormerAddressRent',      sql.Decimal(18,2), formerAddressRent)

        .input('HasMailingAddress',       sql.Bit,           hasMailingAddress)
        .input('MailingAddressStreet',   sql.NVarChar(255), mailingAddressStreet)
        .input('MailingAddressCity',     sql.NVarChar(100), mailingAddressCity)
        .input('MailingAddressState',    sql.NVarChar(50),  mailingAddressState)
        .input('MailingAddressZip',      sql.NVarChar(20),  mailingAddressZip)

        // Employment / Income (Section 1b)
        .input('HasCurrentEmployment',   sql.Bit,           hasCurrentEmployment)
        .input('EmployerPhone',         sql.NVarChar(50),  employerPhone)
        .input('EmployerStreet',        sql.NVarChar(255), employerStreet)
        .input('EmployerUnit',          sql.NVarChar(50),  employerUnit)
        .input('EmployerCity',          sql.NVarChar(100), employerCity)
        .input('EmployerState',         sql.NVarChar(50),  employerState)
        .input('EmployerZip',           sql.NVarChar(20),  employerZip)
        .input('EmployerCountry',       sql.NVarChar(100), employerCountry)
        .input('PositionTitle',         sql.NVarChar(255), positionTitle)
        .input('StartDate',             sql.Date,          startDate)
        .input('LineOfWorkYears',       sql.Int,           lineOfWorkYears)
        .input('LineOfWorkMonths',      sql.Int,           lineOfWorkMonths)
        .input('IsFamilyEmployee',      sql.Bit,           isFamilyEmployee)
        .input('OwnershipShare',        sql.NVarChar(50),  ownershipShare) 
        .input('MonthlyIncomeOrLoss',   sql.Decimal(18,2), monthlyIncomeOrLoss)
        .input('BaseIncome',            sql.Decimal(18,2), baseIncome)
        .input('OvertimeIncome',        sql.Decimal(18,2), overtimeIncome)
        .input('BonusIncome',           sql.Decimal(18,2), bonusIncome)
        .input('CommissionIncome',      sql.Decimal(18,2), commissionIncome)
        .input('MilitaryEntitlements',  sql.Decimal(18,2), militaryEntitlements)
        .input('OtherIncome',           sql.Decimal(18,2), otherIncome)

        // Section 1c Additional1 fields
        .input('HasAdditionalEmployment',      sql.Bit,           hasAdditionalEmployment)
        .input('EmployerNameAdditional1',          sql.NVarChar(255), employerNameAdditional1)
        .input('EmployerPhoneAdditional1',         sql.NVarChar(50),  employerPhoneAdditional1)
        .input('EmployerStreetAdditional1',        sql.NVarChar(255), employerStreetAdditional1)
        .input('EmployerUnitAdditional1',          sql.NVarChar(50),  employerUnitAdditional1)
        .input('EmployerCityAdditional1',          sql.NVarChar(100), employerCityAdditional1)
        .input('EmployerStateAdditional1',         sql.NVarChar(50),  employerStateAdditional1)
        .input('EmployerZipAdditional1',           sql.NVarChar(20),  employerZipAdditional1)
        .input('EmployerCountryAdditional1',       sql.NVarChar(100), employerCountryAdditional1)
        .input('PositionTitleAdditional1',         sql.NVarChar(255), positionTitleAdditional1)
        .input('StartDateAdditional1',             sql.Date,          startDateAdditional1)
        .input('LineOfWorkYearsAdditional1',       sql.Int,           lineOfWorkYearsAdditional1)
        .input('LineOfWorkMonthsAdditional1',      sql.Int,           lineOfWorkMonthsAdditional1)
        .input('IsFamilyEmployeeAdditional1',      sql.Bit,           isFamilyEmployeeAdditional1)
        .input('OwnershipShareAdditional1',        sql.NVarChar(50),  ownershipShareAdditional1)
        .input('MonthlyIncomeOrLossAdditional1',   sql.Decimal(18,2), monthlyIncomeOrLossAdditional1)
        .input('BaseIncomeAdditional1',            sql.Decimal(18,2), baseIncomeAdditional1)
        .input('OvertimeIncomeAdditional1',        sql.Decimal(18,2), overtimeIncomeAdditional1)
        .input('BonusIncomeAdditional1',           sql.Decimal(18,2), bonusIncomeAdditional1)
        .input('CommissionIncomeAdditional1',      sql.Decimal(18,2), commissionIncomeAdditional1)
        .input('MilitaryEntitlementsAdditional1',  sql.Decimal(18,2), militaryEntitlementsAdditional1)
        .input('OtherIncomeAdditional1',           sql.Decimal(18,2), otherIncomeAdditional1)

        // Section 1d: Additional2 (Previous Employment)
        .input('HasPreviousEmploymentAdditional2', sql.Bit,           hasPreviousEmploymentAdditional2)
        .input('EmployerNameAdditional2',          sql.NVarChar(255), employerNameAdditional2)
        .input('PrevGrossMonthlyIncomeAdditional2',sql.Decimal(18,2), prevGrossMonthlyIncomeAdditional2)
        .input('EmployerStreetAdditional2',        sql.NVarChar(255), employerStreetAdditional2)
        .input('EmployerUnitAdditional2',          sql.NVarChar(50),  employerUnitAdditional2)
        .input('EmployerCityAdditional2',          sql.NVarChar(100), employerCityAdditional2)
        .input('EmployerStateAdditional2',         sql.NVarChar(50),  employerStateAdditional2)
        .input('EmployerZipAdditional2',           sql.NVarChar(20),  employerZipAdditional2)
        .input('EmployerCountryAdditional2',       sql.NVarChar(100), employerCountryAdditional2)
        .input('PositionTitleAdditional2',         sql.NVarChar(255), positionTitleAdditional2)
        .input('StartDateAdditional2',             sql.Date,          startDateAdditional2)
        .input('EndDateAdditional2',               sql.Date,          endDateAdditional2)
        .input('WasBusinessOwnerAdditional2',      sql.Bit,           wasBusinessOwnerAdditional2)

        // Section 1e: Income From Other Sources
        .input('HasOtherIncome',     sql.Bit,           hasOtherIncome)
        .input('IncomeSource1',      sql.NVarChar(100), incomeSource1)
        .input('MonthlyIncome1',     sql.Decimal(18,2), monthlyIncome1)
        .input('IncomeSource2',      sql.NVarChar(100), incomeSource2)
        .input('MonthlyIncome2',     sql.Decimal(18,2), monthlyIncome2)
        .input('IncomeSource3',      sql.NVarChar(100), incomeSource3)
        .input('MonthlyIncome3',     sql.Decimal(18,2), monthlyIncome3)
        .input('IncomeSource4',      sql.NVarChar(100), incomeSource4)
        .input('MonthlyIncome4',     sql.Decimal(18,2), monthlyIncome4)

        // Section 2a: Assets
        .input('AccountType1',          sql.NVarChar(100), accountType1)
        .input('FinancialInstitution1',  sql.NVarChar(100), financialInstitution1)
        .input('AccountNumber1',        sql.NVarChar(100), accountNumber1)
        .input('CashValue1',            sql.Decimal(18,2), cashValue1)  

        .input('AccountType2',          sql.NVarChar(100), accountType2)
        .input('FinancialInstitution2',  sql.NVarChar(100), financialInstitution2)
        .input('AccountNumber2',        sql.NVarChar(100), accountNumber2)
        .input('CashValue2',            sql.Decimal(18,2), cashValue2)      

        .input('AccountType3',          sql.NVarChar(100), accountType3)
        .input('FinancialInstitution3',  sql.NVarChar(100), financialInstitution3)
        .input('AccountNumber3',        sql.NVarChar(100), accountNumber3)
        .input('CashValue3',            sql.Decimal(18,2), cashValue3)      

        .input('AccountType4',          sql.NVarChar(100), accountType4)
        .input('FinancialInstitution4',  sql.NVarChar(100), financialInstitution4)
        .input('AccountNumber4',        sql.NVarChar(100), accountNumber4)
        .input('CashValue4',            sql.Decimal(18,2), cashValue4)      

        .input('AccountType5',          sql.NVarChar(100), accountType5)
        .input('FinancialInstitution5',  sql.NVarChar(100), financialInstitution5)
        .input('AccountNumber5',        sql.NVarChar(100), accountNumber5)
        .input('CashValue5',            sql.Decimal(18,2), cashValue5) 
        
        // Section 2b: Other Assets & Credits
        .input('HasOtherAssets2b',       sql.Bit,           hasOtherAssets2b)
        .input('AssetCreditType1',       sql.NVarChar(100), assetCreditType1)
        .input('AssetCreditValue1',      sql.Decimal(18,2), assetCreditValue1)
        .input('AssetCreditType2',       sql.NVarChar(100), assetCreditType2)
        .input('AssetCreditValue2',      sql.Decimal(18,2), assetCreditValue2)
        .input('AssetCreditType3',       sql.NVarChar(100), assetCreditType3)
        .input('AssetCreditValue3',      sql.Decimal(18,2), assetCreditValue3)
        .input('AssetCreditType4',       sql.NVarChar(100), assetCreditType4)
        .input('AssetCreditValue4',      sql.Decimal(18,2), assetCreditValue4)

        // Section 2c: Liabilities
        .input('HasLiabilities2c',       sql.Bit,           hasLiabilities2c)

        .input('AccountType2c1',          sql.NVarChar(100), accountType2c1)
        .input('CompanyName2c1',          sql.NVarChar(100), companyName2c1)
        .input('AccountNumber2c1',        sql.NVarChar(100), accountNumber2c1)
        .input('UnpaidBalance2c1',      sql.Decimal(18,2), unpaidBalance2c1)
        .input('PayOff2c1',              sql.Bit,           payOff2c1)
        .input('MonthlyPayment2c1',      sql.Decimal(18,2), monthlyPayment2c1)

        .input('AccountType2c2',          sql.NVarChar(100), accountType2c2)
        .input('CompanyName2c2',          sql.NVarChar(100), companyName2c2)
        .input('AccountNumber2c2',        sql.NVarChar(100), accountNumber2c2)
        .input('UnpaidBalance2c2',      sql.Decimal(18,2), unpaidBalance2c2)
        .input('PayOff2c2',              sql.Bit,           payOff2c2)
        .input('MonthlyPayment2c2',      sql.Decimal(18,2), monthlyPayment2c2)

        .input('AccountType2c3',          sql.NVarChar(100), accountType2c3)
        .input('CompanyName2c3',          sql.NVarChar(100), companyName2c3)
        .input('AccountNumber2c3',        sql.NVarChar(100), accountNumber2c3)
        .input('UnpaidBalance2c3',      sql.Decimal(18,2), unpaidBalance2c3)
        .input('PayOff2c3',              sql.Bit,           payOff2c3)
        .input('MonthlyPayment2c3',      sql.Decimal(18,2), monthlyPayment2c3)

        .input('AccountType2c4',          sql.NVarChar(100), accountType2c4)
        .input('CompanyName2c4',          sql.NVarChar(100), companyName2c4)
        .input('AccountNumber2c4',        sql.NVarChar(100), accountNumber2c4)
        .input('UnpaidBalance2c4',      sql.Decimal(18,2), unpaidBalance2c4)
        .input('PayOff2c4',              sql.Bit,           payOff2c4)
        .input('MonthlyPayment2c4',      sql.Decimal(18,2), monthlyPayment2c4)

        .input('AccountType2c5',          sql.NVarChar(100), accountType2c5)
        .input('CompanyName2c5',          sql.NVarChar(100), companyName2c5)
        .input('AccountNumber2c5',        sql.NVarChar(100), accountNumber2c5)
        .input('UnpaidBalance2c5',      sql.Decimal(18,2), unpaidBalance2c5)
        .input('PayOff2c5',              sql.Bit,           payOff2c5)
        .input('MonthlyPayment2c5',      sql.Decimal(18,2), monthlyPayment2c5)

        // Section 2d: Other Liabilities
        .input('HasOtherLiabilities2d', sql.Bit, hasOtherLiabilities2d)

        .input('LiabilityType2d1',  sql.NVarChar(100), liabilityType2d1)
        .input('MonthlyPayment2d1', sql.Decimal(18,2), monthlyPayment2d1)
        .input('LiabilityType2d2',  sql.NVarChar(100), liabilityType2d2)
        .input('MonthlyPayment2d2', sql.Decimal(18,2), monthlyPayment2d2)
        .input('LiabilityType2d3',  sql.NVarChar(100), liabilityType2d3)
        .input('MonthlyPayment2d3', sql.Decimal(18,2), monthlyPayment2d3)
        .input('LiabilityType2d4',  sql.NVarChar(100), liabilityType2d4)
        .input('MonthlyPayment2d4', sql.Decimal(18,2), monthlyPayment2d4)

        // Section 3: Real Estate
        .input('HasRealEstate3',      sql.Bit,           hasRealEstate3)

        // Section 3a: Property #1
        .input('PropertyStreet1',     sql.NVarChar(255), propertyStreet1)
        .input('PropertyCity1',       sql.NVarChar(100), propertyCity1)
        .input('PropertyState1',      sql.NVarChar(50),  propertyState1)
        .input('PropertyZip1',        sql.NVarChar(20),  propertyZip1)
        .input('PropertyValue1',      sql.Decimal(18,2), propertyValue1)
        .input('PropertyStatus1',     sql.NVarChar(50),  propertyStatus1)
        .input('IntendedOccupancy1',  sql.NVarChar(50),  intendedOccupancy1)
        .input('MonthlyInsurance1',   sql.Decimal(18,2), monthlyInsurance1)
        .input('MonthlyRentalIncome1',sql.Decimal(18,2), monthlyRentalIncome1)
        
        .input('HasMortgageLoans1',   sql.Bit,           hasMortgageLoans1)
        .input('CreditorName1',       sql.NVarChar(100), creditorName1)
        .input('CreditorAccount1',    sql.NVarChar(50),  creditorAccount1)
        .input('MortgagePayment1',    sql.Decimal(18,2), mortgagePayment1)
        .input('UnpaidBalance1',      sql.Decimal(18,2), unpaidBalance1)
        .input('PayOffMortgage1',     sql.Bit,           payOffMortgage1)
        .input('MortgageType1',       sql.NVarChar(50),  mortgageType1)

        // Section 3b: Property #2
        .input('HasProperty2',         sql.Bit,           hasProperty2)
        .input('PropertyStreet2',      sql.NVarChar(255), propertyStreet2)
        .input('PropertyCity2',        sql.NVarChar(100), propertyCity2)
        .input('PropertyState2',       sql.NVarChar(50),  propertyState2)
        .input('PropertyZip2',         sql.NVarChar(20),  propertyZip2)
        .input('PropertyValue2',       sql.Decimal(18,2), propertyValue2)
        .input('PropertyStatus2',      sql.NVarChar(50),  propertyStatus2)
        .input('IntendedOccupancy2',   sql.NVarChar(50),  intendedOccupancy2)
        .input('MonthlyInsurance2',    sql.Decimal(18,2), monthlyInsurance2)
        .input('MonthlyRentalIncome2', sql.Decimal(18,2), monthlyRentalIncome2)
      
        .input('HasMortgageLoans2',    sql.Bit,           hasMortgageLoans2)
        .input('CreditorName2',        sql.NVarChar(100), creditorName2)
        .input('CreditorAccount2',     sql.NVarChar(50),  creditorAccount2)
        .input('MortgagePayment2',     sql.Decimal(18,2), mortgagePayment2)
        .input('UnpaidBalance2',       sql.Decimal(18,2), unpaidBalance2)
        .input('PayOffMortgage2',      sql.Bit,           payOffMortgage2)
        .input('MortgageType2',        sql.NVarChar(50),  mortgageType2)

        // Section 3c: Property #3
        .input('HasProperty3',         sql.Bit,           hasProperty3)
        .input('PropertyStreet3',      sql.NVarChar(255), propertyStreet3)
        .input('PropertyCity3',        sql.NVarChar(100), propertyCity3)
        .input('PropertyState3',       sql.NVarChar(50),  propertyState3)
        .input('PropertyZip3',         sql.NVarChar(20),  propertyZip3)
        .input('PropertyValue3',       sql.Decimal(18,2), propertyValue3)
        .input('PropertyStatus3',      sql.NVarChar(50),  propertyStatus3)
        .input('IntendedOccupancy3',   sql.NVarChar(50),  intendedOccupancy3)
        .input('MonthlyInsurance3',    sql.Decimal(18,2), monthlyInsurance3)
        .input('MonthlyRentalIncome3', sql.Decimal(18,2), monthlyRentalIncome3)
        
        .input('HasMortgageLoans3',    sql.Bit,           hasMortgageLoans3)
        .input('CreditorName3',        sql.NVarChar(100), creditorName3)
        .input('CreditorAccount3',     sql.NVarChar(50),  creditorAccount3)
        .input('MortgagePayment3',     sql.Decimal(18,2), mortgagePayment3)
        .input('UnpaidBalance3',       sql.Decimal(18,2), unpaidBalance3)
        .input('PayOffMortgage3',      sql.Bit,           payOffMortgage3)
        .input('MortgageType3',        sql.NVarChar(50),  mortgageType3)

        // Section 4: Loan and Property Information

        // Section 4a:
        .input('LoanAmount4',              sql.Decimal(18,2), loanAmount4)
        .input('LoanPurpose4',             sql.NVarChar(50),  loanPurpose4)
        .input('LoanPurposeOtherDesc4',    sql.NVarChar(255), loanPurposeOtherDesc4)
      
        .input('PropertyStreet4',          sql.NVarChar(255), propertyStreet4)
        .input('PropertyCity4',            sql.NVarChar(100), propertyCity4)
        .input('PropertyState4',           sql.NVarChar(50),  propertyState4)
        .input('PropertyZip4',             sql.NVarChar(20),  propertyZip4)
        .input('PropertyCounty4',          sql.NVarChar(100), propertyCounty4)
        .input('PropertyUnit4',            sql.NVarChar(50),  propertyUnit4)
      
        .input('NumberOfUnits4',           sql.Int,           numberOfUnits4)
        .input('PropertyValue4',           sql.Decimal(18,2), propertyValue4)
        .input('Occupancy4',               sql.NVarChar(50),  occupancy4)
        .input('FHASecondaryResidence4',   sql.Bit,           fhaSecondaryResidence4)
      
        .input('MixedUse4',                sql.Bit,           mixedUse4)
        .input('ManufacturedHome4',        sql.Bit,           manufacturedHome4)

        // Section 4b: Other New Mortgage Loans on the Property You Are Buying or Refinancing
        .input('HasNewMortgages4b', sql.Bit, hasNewMortgages4b)

        .input('CreditorName4b1',   sql.NVarChar(100), creditorName4b1)
        .input('LienType4b1',       sql.NVarChar(50),  lienType4b1)
        .input('MonthlyPayment4b1', sql.Decimal(18,2), monthlyPayment4b1)
        .input('LoanAmount4b1',     sql.Decimal(18,2), loanAmount4b1)
        .input('CreditLimit4b1',    sql.Decimal(18,2), creditLimit4b1)
      
        .input('CreditorName4b2',   sql.NVarChar(100), creditorName4b2)
        .input('LienType4b2',       sql.NVarChar(50),  lienType4b2)
        .input('MonthlyPayment4b2', sql.Decimal(18,2), monthlyPayment4b2)
        .input('LoanAmount4b2',     sql.Decimal(18,2), loanAmount4b2)
        .input('CreditLimit4b2',    sql.Decimal(18,2), creditLimit4b2)

        // Section 4c: Rental Income on the Property You Want to Purchase
        .input('HasRentalIncome4c',       sql.Bit,           hasRentalIncome4c)
        .input('ExpectedRentalIncome4c',  sql.Decimal(18,2), expectedRentalIncome4c)
        .input('NetRentalIncome4c',       sql.Decimal(18,2), netRentalIncome4c)

        // Section 4d: Gifts or Grants
        .input('HasGiftsGrants4d',    sql.Bit,           hasGiftsGrants4d)

        .input('GiftAssetType4d1',    sql.NVarChar(100), giftAssetType4d1)
        .input('Deposited4d1',        sql.NVarChar(50),  deposited4d1)
        .input('GiftSource4d1',       sql.NVarChar(100), giftSource4d1)
        .input('GiftValue4d1',        sql.Decimal(18,2), giftValue4d1)
      
        .input('GiftAssetType4d2',    sql.NVarChar(100), giftAssetType4d2)
        .input('Deposited4d2',        sql.NVarChar(50),  deposited4d2)
        .input('GiftSource4d2',       sql.NVarChar(100), giftSource4d2)
        .input('GiftValue4d2',        sql.Decimal(18,2), giftValue4d2)

        // Existing fields
        .input('FirstName',              sql.NVarChar(100), borrowerFirstName)
        .input('LastName',               sql.NVarChar(100), borrowerLastName)
        .input('SSN',                    sql.NVarChar(20),  borrowerSSN)
        .input('DOB',                    sql.Date,          borrowerDOB)
        .input('EmployerName',           sql.NVarChar(255), employerName)
        .input('AnnualIncome',           sql.Decimal(18,2), annualIncome)
        .input('CheckingAccounts',       sql.Decimal(18,2), checkingAccounts)
        .input('CreditCardDebt',         sql.Decimal(18,2), creditCardDebt)
        .input('PropertyAddress',        sql.NVarChar(500), propertyAddress)
        .input('PropertyValue',          sql.Decimal(18,2), propertyValue)
        .input('LoanPurpose',            sql.NVarChar(50),  loanPurpose)
        .input('LoanTerm',               sql.Int,           loanTerm)
        .input('LoanType',               sql.NVarChar(50),  loanType)
        .input('RateLock',               sql.NVarChar(50),  rateLock)
        .input('EmploymentType',         sql.NVarChar(50),  employmentType)
        .input('ApplicationStatus',      sql.NVarChar(50),  newStatus)

        .query(`
          UPDATE LoanApplications
          SET 
            -- Names
            BorrowerFirstName       = @FirstName,
            BorrowerMiddleName      = @BorrowerMiddleName,
            BorrowerSuffix          = @BorrowerSuffix,
            AlternateNames          = @AlternateNames,
            BorrowerLastName        = @LastName,
            BorrowerSSN             = @SSN,
            BorrowerDOB             = @DOB,
            
            -- Contact Info
            HomePhone               = @HomePhone,
            CellPhone               = @CellPhone,
            WorkPhone               = @WorkPhone,
            EmailAddress            = @EmailAddress,

            -- Additional Info
            Citizenship             = @Citizenship,
            TypeOfCredit            = @TypeOfCredit,
            NumberOfBorrowers       = @NumberOfBorrowers,
            MaritalStatus           = @MaritalStatus,
            DependentsNumber        = @DependentsNumber,
            DependentsAges          = @DependentsAges,

            -- Current Address
            CurrentAddressStreet    = @CurrentAddressStreet,
            CurrentAddressCity      = @CurrentAddressCity,
            CurrentAddressState     = @CurrentAddressState,
            CurrentAddressZip       = @CurrentAddressZip,
            CurrentAddressYears     = @CurrentAddressYears,
            CurrentAddressMonths    = @CurrentAddressMonths,
            CurrentAddressHousing   = @CurrentAddressHousing,
            CurrentAddressRent      = @CurrentAddressRent,

            -- Former Address
            HasFormerAddress        = @HasFormerAddress,
            FormerAddressStreet     = @FormerAddressStreet,
            FormerAddressCity       = @FormerAddressCity,
            FormerAddressState      = @FormerAddressState,
            FormerAddressZip        = @FormerAddressZip,
            FormerAddressYears      = @FormerAddressYears,
            FormerAddressMonths     = @FormerAddressMonths,
            FormerAddressHousing    = @FormerAddressHousing,
            FormerAddressRent       = @FormerAddressRent,

            -- Mailing Address
            HasMailingAddress       = @HasMailingAddress,
            MailingAddressStreet    = @MailingAddressStreet,
            MailingAddressCity      = @MailingAddressCity,
            MailingAddressState     = @MailingAddressState,
            MailingAddressZip       = @MailingAddressZip,

            -- Employment & Income
            HasCurrentEmployment    = @HasCurrentEmployment,
            EmployerName            = @EmployerName, 
            AnnualIncome            = @AnnualIncome,

            -- Current Employment
            EmployerPhone           = @EmployerPhone,
            EmployerStreet          = @EmployerStreet,
            EmployerUnit            = @EmployerUnit,
            EmployerCity            = @EmployerCity,
            EmployerState           = @EmployerState,
            EmployerZip             = @EmployerZip,
            EmployerCountry         = @EmployerCountry,
            PositionTitle           = @PositionTitle,
            StartDate               = @StartDate,
            LineOfWorkYears         = @LineOfWorkYears,
            LineOfWorkMonths        = @LineOfWorkMonths,
            IsFamilyEmployee        = @IsFamilyEmployee,
            OwnershipShare          = @OwnershipShare,
            MonthlyIncomeOrLoss     = @MonthlyIncomeOrLoss, 
            BaseIncome              = @BaseIncome,
            OvertimeIncome          = @OvertimeIncome,
            BonusIncome             = @BonusIncome,
            CommissionIncome        = @CommissionIncome,
            MilitaryEntitlements    = @MilitaryEntitlements,
            OtherIncome             = @OtherIncome,

            -- Additional Employment 1
            HasAdditionalEmployment     = @HasAdditionalEmployment,
            EmployerNameAdditional1          = @EmployerNameAdditional1,
            EmployerPhoneAdditional1         = @EmployerPhoneAdditional1,
            EmployerStreetAdditional1        = @EmployerStreetAdditional1,
            EmployerUnitAdditional1          = @EmployerUnitAdditional1,
            EmployerCityAdditional1          = @EmployerCityAdditional1,
            EmployerStateAdditional1         = @EmployerStateAdditional1,
            EmployerZipAdditional1           = @EmployerZipAdditional1,
            EmployerCountryAdditional1       = @EmployerCountryAdditional1,
            PositionTitleAdditional1         = @PositionTitleAdditional1,
            StartDateAdditional1             = @StartDateAdditional1,
            LineOfWorkYearsAdditional1       = @LineOfWorkYearsAdditional1,
            LineOfWorkMonthsAdditional1      = @LineOfWorkMonthsAdditional1,
            IsFamilyEmployeeAdditional1      = @IsFamilyEmployeeAdditional1,
            OwnershipShareAdditional1        = @OwnershipShareAdditional1,
            MonthlyIncomeOrLossAdditional1   = @MonthlyIncomeOrLossAdditional1,
            BaseIncomeAdditional1            = @BaseIncomeAdditional1,
            OvertimeIncomeAdditional1        = @OvertimeIncomeAdditional1,
            BonusIncomeAdditional1           = @BonusIncomeAdditional1,
            CommissionIncomeAdditional1      = @CommissionIncomeAdditional1,
            MilitaryEntitlementsAdditional1  = @MilitaryEntitlementsAdditional1,
            OtherIncomeAdditional1           = @OtherIncomeAdditional1,

            -- Section 1d: Additional2 (Previous Employment)
            HasPreviousEmploymentAdditional2 = @HasPreviousEmploymentAdditional2,
            EmployerNameAdditional2          = @EmployerNameAdditional2,
            PrevGrossMonthlyIncomeAdditional2 = @PrevGrossMonthlyIncomeAdditional2,
            EmployerStreetAdditional2        = @EmployerStreetAdditional2,
            EmployerUnitAdditional2          = @EmployerUnitAdditional2,
            EmployerCityAdditional2          = @EmployerCityAdditional2,
            EmployerStateAdditional2         = @EmployerStateAdditional2,
            EmployerZipAdditional2           = @EmployerZipAdditional2,
            EmployerCountryAdditional2       = @EmployerCountryAdditional2,
            PositionTitleAdditional2         = @PositionTitleAdditional2,
            StartDateAdditional2             = @StartDateAdditional2,
            EndDateAdditional2               = @EndDateAdditional2,
            WasBusinessOwnerAdditional2      = @WasBusinessOwnerAdditional2,

            -- Section 1e: Income From Other Sources
            HasOtherIncome = @HasOtherIncome,
            IncomeSource1  = @IncomeSource1,
            MonthlyIncome1 = @MonthlyIncome1,
            IncomeSource2  = @IncomeSource2,
            MonthlyIncome2 = @MonthlyIncome2,
            IncomeSource3  = @IncomeSource3,
            MonthlyIncome3 = @MonthlyIncome3,
            IncomeSource4  = @IncomeSource4,
            MonthlyIncome4 = @MonthlyIncome4,

            -- Section 2a: Assets
            AccountType1          = @AccountType1,
            FinancialInstitution1 = @FinancialInstitution1,
            AccountNumber1        = @AccountNumber1,
            CashValue1            = @CashValue1,  

            AccountType2          = @AccountType2,
            FinancialInstitution2 = @FinancialInstitution2,
            AccountNumber2        = @AccountNumber2,
            CashValue2            = @CashValue2,      

            AccountType3          = @AccountType3,
            FinancialInstitution3 = @FinancialInstitution3,
            AccountNumber3        = @AccountNumber3,
            CashValue3            = @CashValue3,  
            
            AccountType4          = @AccountType4,
            FinancialInstitution4 = @FinancialInstitution4,
            AccountNumber4        = @AccountNumber4,
            CashValue4            = @CashValue4,  

            AccountType5          = @AccountType5,
            FinancialInstitution5 = @FinancialInstitution5,
            AccountNumber5        = @AccountNumber5,
            CashValue5            = @CashValue5,  

            -- Section 2b: Other Assets & Credits
            HasOtherAssets2b       = @HasOtherAssets2b,
            AssetCreditType1       = @AssetCreditType1,
            AssetCreditValue1      = @AssetCreditValue1,
            AssetCreditType2       = @AssetCreditType2,
            AssetCreditValue2      = @AssetCreditValue2,    
            AssetCreditType3       = @AssetCreditType3,
            AssetCreditValue3      = @AssetCreditValue3,
            AssetCreditType4       = @AssetCreditType4,
            AssetCreditValue4      = @AssetCreditValue4,

            -- Section 2c: Liabilities
            HasLiabilities2c       = @HasLiabilities2c,

            AccountType2c1         = @AccountType2c1,
            CompanyName2c1         = @CompanyName2c1,
            AccountNumber2c1       = @AccountNumber2c1,
            UnpaidBalance2c1      = @UnpaidBalance2c1,
            PayOff2c1             = @PayOff2c1,
            MonthlyPayment2c1      = @MonthlyPayment2c1,  

            AccountType2c2         = @AccountType2c2,
            CompanyName2c2         = @CompanyName2c2,
            AccountNumber2c2       = @AccountNumber2c2,
            UnpaidBalance2c2      = @UnpaidBalance2c2,
            PayOff2c2             = @PayOff2c2,
            MonthlyPayment2c2      = @MonthlyPayment2c2,

            AccountType2c3         = @AccountType2c3,
            CompanyName2c3         = @CompanyName2c3,
            AccountNumber2c3       = @AccountNumber2c3,
            UnpaidBalance2c3      = @UnpaidBalance2c3,
            PayOff2c3             = @PayOff2c3,
            MonthlyPayment2c3      = @MonthlyPayment2c3,

            AccountType2c4         = @AccountType2c4,
            CompanyName2c4         = @CompanyName2c4,
            AccountNumber2c4       = @AccountNumber2c4,
            UnpaidBalance2c4      = @UnpaidBalance2c4,
            PayOff2c4             = @PayOff2c4,
            MonthlyPayment2c4      = @MonthlyPayment2c4,

            AccountType2c5         = @AccountType2c5,
            CompanyName2c5         = @CompanyName2c5,
            AccountNumber2c5       = @AccountNumber2c5,
            UnpaidBalance2c5      = @UnpaidBalance2c5,
            PayOff2c5             = @PayOff2c5,
            MonthlyPayment2c5      = @MonthlyPayment2c5,

            -- Section 2d: Other Liabilities
            HasOtherLiabilities2d   = @HasOtherLiabilities2d,

            LiabilityType2d1       = @LiabilityType2d1,
            MonthlyPayment2d1      = @MonthlyPayment2d1,

            LiabilityType2d2       = @LiabilityType2d2,
            MonthlyPayment2d2      = @MonthlyPayment2d2,

            LiabilityType2d3       = @LiabilityType2d3,
            MonthlyPayment2d3      = @MonthlyPayment2d3,

            LiabilityType2d4       = @LiabilityType2d4,
            MonthlyPayment2d4      = @MonthlyPayment2d4,  

            -- Section 3: Real Estate
            HasRealEstate3          = @HasRealEstate3,

            -- Section 3a: Property #1
            PropertyStreet1     = @PropertyStreet1,
            PropertyCity1       = @PropertyCity1,
            PropertyState1      = @PropertyState1,
            PropertyZip1        = @PropertyZip1,
            PropertyValue1      = @PropertyValue1,
            PropertyStatus1     = @PropertyStatus1,
            IntendedOccupancy1  = @IntendedOccupancy1,
            MonthlyInsurance1   = @MonthlyInsurance1,
            MonthlyRentalIncome1= @MonthlyRentalIncome1,

            HasMortgageLoans1   = @HasMortgageLoans1,
            CreditorName1       = @CreditorName1,
            CreditorAccount1    = @CreditorAccount1,
            MortgagePayment1    = @MortgagePayment1,
            UnpaidBalance1      = @UnpaidBalance1,
            PayOffMortgage1     = @PayOffMortgage1,
            MortgageType1       = @MortgageType1,

            -- Section 3b: Property #2
            HasProperty2          = @HasProperty2,
            PropertyStreet2       = @PropertyStreet2,
            PropertyCity2         = @PropertyCity2,
            PropertyState2        = @PropertyState2,
            PropertyZip2          = @PropertyZip2,
            PropertyValue2        = @PropertyValue2,
            PropertyStatus2       = @PropertyStatus2,
            IntendedOccupancy2    = @IntendedOccupancy2,
            MonthlyInsurance2     = @MonthlyInsurance2,
            MonthlyRentalIncome2  = @MonthlyRentalIncome2,

            HasMortgageLoans2     = @HasMortgageLoans2,
            CreditorName2         = @CreditorName2,
            CreditorAccount2      = @CreditorAccount2,
            MortgagePayment2      = @MortgagePayment2,
            UnpaidBalance2        = @UnpaidBalance2,
            PayOffMortgage2       = @PayOffMortgage2,
            MortgageType2         = @MortgageType2,

            -- Section 3c: Property #3
            HasProperty3       = @HasProperty3,
            PropertyStreet3    = @PropertyStreet3,
            PropertyCity3      = @PropertyCity3,
            PropertyState3     = @PropertyState3,
            PropertyZip3       = @PropertyZip3,
            PropertyValue3     = @PropertyValue3,
            PropertyStatus3    = @PropertyStatus3,
            IntendedOccupancy3 = @IntendedOccupancy3,
            MonthlyInsurance3  = @MonthlyInsurance3,
            MonthlyRentalIncome3 = @MonthlyRentalIncome3,

            HasMortgageLoans3  = @HasMortgageLoans3,
            CreditorName3      = @CreditorName3,
            CreditorAccount3   = @CreditorAccount3,
            MortgagePayment3   = @MortgagePayment3,
            UnpaidBalance3     = @UnpaidBalance3,
            PayOffMortgage3    = @PayOffMortgage3,
            MortgageType3      = @MortgageType3,

            -- Section 4: Loan and Property Information

            -- Section 4a:
            LoanAmount4 = @LoanAmount4,
            LoanPurpose4 = @LoanPurpose4,
            LoanPurposeOtherDesc4 = @LoanPurposeOtherDesc4,

            PropertyStreet4 = @PropertyStreet4,
            PropertyCity4 = @PropertyCity4,
            PropertyState4 = @PropertyState4,
            PropertyZip4 = @PropertyZip4,
            PropertyCounty4 = @PropertyCounty4,
            PropertyUnit4 = @PropertyUnit4,

            NumberOfUnits4 = @NumberOfUnits4,
            PropertyValue4 = @PropertyValue4,
            Occupancy4 = @Occupancy4,
            FHASecondaryResidence4 = @FHASecondaryResidence4,

            MixedUse4 = @MixedUse4,
            ManufacturedHome4 = @ManufacturedHome4,

            -- Section 4b: Other New Mortgage Loans on the Property You Are Buying or Refinancing
            HasNewMortgages4b = @HasNewMortgages4b,

            CreditorName4b1   = @CreditorName4b1,
            LienType4b1       = @LienType4b1,
            MonthlyPayment4b1 = @MonthlyPayment4b1,
            LoanAmount4b1     = @LoanAmount4b1,
            CreditLimit4b1    = @CreditLimit4b1,

            CreditorName4b2   = @CreditorName4b2,
            LienType4b2       = @LienType4b2,
            MonthlyPayment4b2 = @MonthlyPayment4b2,
            LoanAmount4b2     = @LoanAmount4b2,
            CreditLimit4b2    = @CreditLimit4b2,

            -- Section 4c: Rental Income on the Property You Want to Purchase
            HasRentalIncome4c       = @HasRentalIncome4c,
            ExpectedRentalIncome4c  = @ExpectedRentalIncome4c,
            NetRentalIncome4c       = @NetRentalIncome4c,

            -- Section 4d: Gifts or Grants
            HasGiftsGrants4d       = @HasGiftsGrants4d,
            GiftAssetType4d1       = @GiftAssetType4d1,
            Deposited4d1           = @Deposited4d1,
            GiftSource4d1          = @GiftSource4d1,
            GiftValue4d1           = @GiftValue4d1,

            GiftAssetType4d2       = @GiftAssetType4d2,
            Deposited4d2           = @Deposited4d2,
            GiftSource4d2          = @GiftSource4d2,
            GiftValue4d2           = @GiftValue4d2,

            -- Assets & Liabilities
            CheckingAccounts        = @CheckingAccounts, 
            CreditCardDebt          = @CreditCardDebt,

            -- Property
            PropertyAddress         = @PropertyAddress, 
            PropertyValue           = @PropertyValue,

            -- Loan Preferences
            LoanPurpose             = @LoanPurpose, 
            LoanTerm                = @LoanTerm, 
            LoanType                = @LoanType,
            RateLock                = @RateLock, 
            EmploymentType          = @EmploymentType,

            -- Status
            ApplicationStatus       = @ApplicationStatus, 
            UpdatedAt               = SYSUTCDATETIME()

          WHERE UserID = @UserID
        `);

    // -------------------------------------------------------------------
    // INSERT: If no existing record
    // -------------------------------------------------------------------
    } else {
      await pool.request()
        .input('UserID',                 sql.Int,           userId)

        // New or extended fields
        .input('BorrowerMiddleName',     sql.NVarChar(100), borrowerMiddleName)
        .input('BorrowerSuffix',         sql.NVarChar(50),  borrowerSuffix)
        .input('AlternateNames',         sql.NVarChar(255), alternateNames)
        .input('Citizenship',            sql.NVarChar(50),  citizenship)
        .input('TypeOfCredit',           sql.NVarChar(50),  typeOfCredit)
        .input('NumberOfBorrowers',      sql.Int,           numberOfBorrowers)
        .input('MaritalStatus',          sql.NVarChar(50),  maritalStatus)
        .input('DependentsNumber',       sql.Int,           dependentsNumber)
        .input('DependentsAges',         sql.NVarChar(100), dependentsAges)

        .input('HomePhone',           sql.NVarChar(50), homePhone)
        .input('CellPhone',           sql.NVarChar(50), cellPhone)
        .input('WorkPhone',           sql.NVarChar(50), workPhone)
        .input('EmailAddress',        sql.NVarChar(100), emailAddress)

        .input('CurrentAddressStreet',   sql.NVarChar(255), currentAddressStreet)
        .input('CurrentAddressCity',     sql.NVarChar(100), currentAddressCity)
        .input('CurrentAddressState',    sql.NVarChar(50),  currentAddressState)
        .input('CurrentAddressZip',      sql.NVarChar(20),  currentAddressZip)
        .input('CurrentAddressYears',    sql.Int,           currentAddressYears)
        .input('CurrentAddressMonths',   sql.Int,           currentAddressMonths)
        .input('CurrentAddressHousing',  sql.NVarChar(50),  currentAddressHousing)
        .input('CurrentAddressRent',     sql.Decimal(18,2), currentAddressRent)

        .input('HasFormerAddress',       sql.Bit,           hasFormerAddress)
        .input('FormerAddressStreet',    sql.NVarChar(255), formerAddressStreet)
        .input('FormerAddressCity',      sql.NVarChar(100), formerAddressCity)
        .input('FormerAddressState',     sql.NVarChar(50),  formerAddressState)
        .input('FormerAddressZip',       sql.NVarChar(20),  formerAddressZip)
        .input('FormerAddressYears',     sql.Int,           formerAddressYears)
        .input('FormerAddressMonths',    sql.Int,           formerAddressMonths)
        .input('FormerAddressHousing',   sql.NVarChar(50),  formerAddressHousing)
        .input('FormerAddressRent',      sql.Decimal(18,2), formerAddressRent)

        .input('HasMailingAddress',       sql.Bit,           hasMailingAddress)
        .input('MailingAddressStreet',   sql.NVarChar(255), mailingAddressStreet)
        .input('MailingAddressCity',     sql.NVarChar(100), mailingAddressCity)
        .input('MailingAddressState',    sql.NVarChar(50),  mailingAddressState)
        .input('MailingAddressZip',      sql.NVarChar(20),  mailingAddressZip)


        // Current Employment
        .input('HasCurrentEmployment',   sql.Bit,           hasCurrentEmployment)
        .input('EmployerPhone',         sql.NVarChar(50),  employerPhone)
        .input('EmployerStreet',        sql.NVarChar(255), employerStreet)
        .input('EmployerUnit',          sql.NVarChar(50),  employerUnit)
        .input('EmployerCity',          sql.NVarChar(100), employerCity)
        .input('EmployerState',         sql.NVarChar(50),  employerState)
        .input('EmployerZip',           sql.NVarChar(20),  employerZip)
        .input('EmployerCountry',       sql.NVarChar(100), employerCountry)
        .input('PositionTitle',         sql.NVarChar(255), positionTitle)
        .input('StartDate',             sql.Date,          startDate)
        .input('LineOfWorkYears',       sql.Int,           lineOfWorkYears)
        .input('LineOfWorkMonths',      sql.Int,           lineOfWorkMonths)
        .input('IsFamilyEmployee',      sql.Bit,           isFamilyEmployee)
        .input('OwnershipShare',        sql.NVarChar(50),  ownershipShare) 
        .input('MonthlyIncomeOrLoss',   sql.Decimal(18,2), monthlyIncomeOrLoss)
        .input('BaseIncome',            sql.Decimal(18,2), baseIncome)
        .input('OvertimeIncome',        sql.Decimal(18,2), overtimeIncome)
        .input('BonusIncome',           sql.Decimal(18,2), bonusIncome)
        .input('CommissionIncome',      sql.Decimal(18,2), commissionIncome)
        .input('MilitaryEntitlements',  sql.Decimal(18,2), militaryEntitlements)
        .input('OtherIncome',           sql.Decimal(18,2), otherIncome)

        // Additional Employment 1
        .input('HasAdditionalEmployment',      sql.Bit,           hasAdditionalEmployment)
        .input('EmployerNameAdditional1',          sql.NVarChar(255), employerNameAdditional1)
        .input('EmployerPhoneAdditional1',         sql.NVarChar(50),  employerPhoneAdditional1)
        .input('EmployerStreetAdditional1',        sql.NVarChar(255), employerStreetAdditional1)
        .input('EmployerUnitAdditional1',          sql.NVarChar(50),  employerUnitAdditional1)
        .input('EmployerCityAdditional1',          sql.NVarChar(100), employerCityAdditional1)
        .input('EmployerStateAdditional1',         sql.NVarChar(50),  employerStateAdditional1)
        .input('EmployerZipAdditional1',           sql.NVarChar(20),  employerZipAdditional1)
        .input('EmployerCountryAdditional1',       sql.NVarChar(100), employerCountryAdditional1)
        .input('PositionTitleAdditional1',         sql.NVarChar(255), positionTitleAdditional1)
        .input('StartDateAdditional1',             sql.Date,          startDateAdditional1)
        .input('LineOfWorkYearsAdditional1',       sql.Int,           lineOfWorkYearsAdditional1)
        .input('LineOfWorkMonthsAdditional1',      sql.Int,           lineOfWorkMonthsAdditional1)
        .input('IsFamilyEmployeeAdditional1',      sql.Bit,           isFamilyEmployeeAdditional1)
        .input('OwnershipShareAdditional1',        sql.NVarChar(50),  ownershipShareAdditional1)
        .input('MonthlyIncomeOrLossAdditional1',   sql.Decimal(18,2), monthlyIncomeOrLossAdditional1)
        .input('BaseIncomeAdditional1',            sql.Decimal(18,2), baseIncomeAdditional1)
        .input('OvertimeIncomeAdditional1',        sql.Decimal(18,2), overtimeIncomeAdditional1)
        .input('BonusIncomeAdditional1',           sql.Decimal(18,2), bonusIncomeAdditional1)
        .input('CommissionIncomeAdditional1',      sql.Decimal(18,2), commissionIncomeAdditional1)
        .input('MilitaryEntitlementsAdditional1',  sql.Decimal(18,2), militaryEntitlementsAdditional1)
        .input('OtherIncomeAdditional1',           sql.Decimal(18,2), otherIncomeAdditional1)

        // Section 1d: Additional2 (Previous Employment)
        .input('HasPreviousEmploymentAdditional2', sql.Bit,           hasPreviousEmploymentAdditional2)
        .input('EmployerNameAdditional2',          sql.NVarChar(255), employerNameAdditional2)
        .input('PrevGrossMonthlyIncomeAdditional2',sql.Decimal(18,2), prevGrossMonthlyIncomeAdditional2)
        .input('EmployerStreetAdditional2',        sql.NVarChar(255), employerStreetAdditional2)
        .input('EmployerUnitAdditional2',          sql.NVarChar(50),  employerUnitAdditional2)
        .input('EmployerCityAdditional2',          sql.NVarChar(100), employerCityAdditional2)
        .input('EmployerStateAdditional2',         sql.NVarChar(50),  employerStateAdditional2)
        .input('EmployerZipAdditional2',           sql.NVarChar(20),  employerZipAdditional2)
        .input('EmployerCountryAdditional2',       sql.NVarChar(100), employerCountryAdditional2)
        .input('PositionTitleAdditional2',         sql.NVarChar(255), positionTitleAdditional2)
        .input('StartDateAdditional2',             sql.Date,          startDateAdditional2)
        .input('EndDateAdditional2',               sql.Date,          endDateAdditional2)
        .input('WasBusinessOwnerAdditional2',      sql.Bit,           wasBusinessOwnerAdditional2)

        // Section 1e: Income From Other Sources
        .input('HasOtherIncome',     sql.Bit,           hasOtherIncome)
        .input('IncomeSource1',      sql.NVarChar(100), incomeSource1)
        .input('MonthlyIncome1',     sql.Decimal(18,2), monthlyIncome1)
        .input('IncomeSource2',      sql.NVarChar(100), incomeSource2)
        .input('MonthlyIncome2',     sql.Decimal(18,2), monthlyIncome2)
        .input('IncomeSource3',      sql.NVarChar(100), incomeSource3)
        .input('MonthlyIncome3',     sql.Decimal(18,2), monthlyIncome3)
        .input('IncomeSource4',      sql.NVarChar(100), incomeSource4)
        .input('MonthlyIncome4',     sql.Decimal(18,2), monthlyIncome4)

        // Section 2a: Assets
        .input('AccountType1',          sql.NVarChar(100), accountType1)
        .input('FinancialInstitution1',  sql.NVarChar(100), financialInstitution1)
        .input('AccountNumber1',        sql.NVarChar(100), accountNumber1)
        .input('CashValue1',            sql.Decimal(18,2), cashValue1)

        .input('AccountType2',          sql.NVarChar(100), accountType2)
        .input('FinancialInstitution2',  sql.NVarChar(100), financialInstitution2)
        .input('AccountNumber2',        sql.NVarChar(100), accountNumber2)
        .input('CashValue2',            sql.Decimal(18,2), cashValue2)

        .input('AccountType3',          sql.NVarChar(100), accountType3)
        .input('FinancialInstitution3',  sql.NVarChar(100), financialInstitution3)
        .input('AccountNumber3',        sql.NVarChar(100), accountNumber3)
        .input('CashValue3',            sql.Decimal(18,2), cashValue3)

        .input('AccountType4',          sql.NVarChar(100), accountType4)
        .input('FinancialInstitution4',  sql.NVarChar(100), financialInstitution4)
        .input('AccountNumber4',        sql.NVarChar(100), accountNumber4)
        .input('CashValue4',            sql.Decimal(18,2), cashValue4)

        .input('AccountType5',          sql.NVarChar(100), accountType5)
        .input('FinancialInstitution5',  sql.NVarChar(100), financialInstitution5)
        .input('AccountNumber5',        sql.NVarChar(100), accountNumber5)
        .input('CashValue5',            sql.Decimal(18,2), cashValue5)

        // Section 2b: Other Assets & Credits
        .input('HasOtherAssets2b',       sql.Bit,           hasOtherAssets2b)
        .input('AssetCreditType1',       sql.NVarChar(100), assetCreditType1)
        .input('AssetCreditValue1',      sql.Decimal(18,2), assetCreditValue1)
        .input('AssetCreditType2',       sql.NVarChar(100), assetCreditType2)
        .input('AssetCreditValue2',      sql.Decimal(18,2), assetCreditValue2)
        .input('AssetCreditType3',       sql.NVarChar(100), assetCreditType3)
        .input('AssetCreditValue3',      sql.Decimal(18,2), assetCreditValue3)
        .input('AssetCreditType4',       sql.NVarChar(100), assetCreditType4)
        .input('AssetCreditValue4',      sql.Decimal(18,2), assetCreditValue4)

        // Section 2c: Liabilities
        .input('HasLiabilities2c',       sql.Bit,           hasLiabilities2c)   

        .input('AccountType2c1',          sql.NVarChar(100), accountType2c1)
        .input('CompanyName2c1',          sql.NVarChar(100), companyName2c1)
        .input('AccountNumber2c1',        sql.NVarChar(100), accountNumber2c1)
        .input('UnpaidBalance2c1',      sql.Decimal(18,2), unpaidBalance2c1)
        .input('PayOff2c1',              sql.Bit,           payOff2c1)
        .input('MonthlyPayment2c1',      sql.Decimal(18,2), monthlyPayment2c1)    

        .input('AccountType2c2',          sql.NVarChar(100), accountType2c2)
        .input('CompanyName2c2',          sql.NVarChar(100), companyName2c2)
        .input('AccountNumber2c2',        sql.NVarChar(100), accountNumber2c2)
        .input('UnpaidBalance2c2',      sql.Decimal(18,2), unpaidBalance2c2)
        .input('PayOff2c2',              sql.Bit,           payOff2c2)
        .input('MonthlyPayment2c2',      sql.Decimal(18,2), monthlyPayment2c2)    

        .input('AccountType2c3',          sql.NVarChar(100), accountType2c3)
        .input('CompanyName2c3',          sql.NVarChar(100), companyName2c3)
        .input('AccountNumber2c3',        sql.NVarChar(100), accountNumber2c3)
        .input('UnpaidBalance2c3',      sql.Decimal(18,2), unpaidBalance2c3)
        .input('PayOff2c3',              sql.Bit,           payOff2c3)
        .input('MonthlyPayment2c3',      sql.Decimal(18,2), monthlyPayment2c3)      

        .input('AccountType2c4',          sql.NVarChar(100), accountType2c4)
        .input('CompanyName2c4',          sql.NVarChar(100), companyName2c4)
        .input('AccountNumber2c4',        sql.NVarChar(100), accountNumber2c4)
        .input('UnpaidBalance2c4',      sql.Decimal(18,2), unpaidBalance2c4)
        .input('PayOff2c4',              sql.Bit,           payOff2c4)
        .input('MonthlyPayment2c4',      sql.Decimal(18,2), monthlyPayment2c4)        

        .input('AccountType2c5',          sql.NVarChar(100), accountType2c5)
        .input('CompanyName2c5',          sql.NVarChar(100), companyName2c5)
        .input('AccountNumber2c5',        sql.NVarChar(100), accountNumber2c5)
        .input('UnpaidBalance2c5',      sql.Decimal(18,2), unpaidBalance2c5)
        .input('PayOff2c5',              sql.Bit,           payOff2c5)
        .input('MonthlyPayment2c5',      sql.Decimal(18,2), monthlyPayment2c5)          

        // Section 2d: Other Liabilities
        .input('HasOtherLiabilities2d', sql.Bit, hasOtherLiabilities2d)

        .input('LiabilityType2d1',  sql.NVarChar(100), liabilityType2d1)
        .input('MonthlyPayment2d1', sql.Decimal(18,2), monthlyPayment2d1) 

        .input('LiabilityType2d2',  sql.NVarChar(100), liabilityType2d2)
        .input('MonthlyPayment2d2', sql.Decimal(18,2), monthlyPayment2d2) 

        .input('LiabilityType2d3',  sql.NVarChar(100), liabilityType2d3)
        .input('MonthlyPayment2d3', sql.Decimal(18,2), monthlyPayment2d3) 

        .input('LiabilityType2d4',  sql.NVarChar(100), liabilityType2d4)
        .input('MonthlyPayment2d4', sql.Decimal(18,2), monthlyPayment2d4) 

        // Section 3: Real Estate
        .input('HasRealEstate3',      sql.Bit,           hasRealEstate3)

        // Section 3a: Property #1
        .input('PropertyStreet1',    sql.NVarChar(255), propertyStreet1)
        .input('PropertyCity1',      sql.NVarChar(100), propertyCity1)
        .input('PropertyState1',     sql.NVarChar(50),  propertyState1)
        .input('PropertyZip1',       sql.NVarChar(20),  propertyZip1)
        .input('PropertyValue1',     sql.Decimal(18,2), propertyValue1)
        .input('PropertyStatus1',    sql.NVarChar(50),  propertyStatus1)
        .input('IntendedOccupancy1', sql.NVarChar(50),  intendedOccupancy1)
        .input('MonthlyInsurance1',  sql.Decimal(18,2), monthlyInsurance1)
        .input('MonthlyRentalIncome1', sql.Decimal(18,2), monthlyRentalIncome1)

        .input('HasMortgageLoans1',  sql.Bit,           hasMortgageLoans1)
        .input('CreditorName1',      sql.NVarChar(100), creditorName1)
        .input('CreditorAccount1',   sql.NVarChar(50),  creditorAccount1)
        .input('MortgagePayment1',   sql.Decimal(18,2), mortgagePayment1)
        .input('UnpaidBalance1',     sql.Decimal(18,2), unpaidBalance1)
        .input('PayOffMortgage1',    sql.Bit,           payOffMortgage1)
        .input('MortgageType1',      sql.NVarChar(50),  mortgageType1)

        // Section 3b: Property #2
        .input('HasProperty2',         sql.Bit,           hasProperty2)
        .input('PropertyStreet2',      sql.NVarChar(255), propertyStreet2)
        .input('PropertyCity2',        sql.NVarChar(100), propertyCity2)
        .input('PropertyState2',       sql.NVarChar(50),  propertyState2)
        .input('PropertyZip2',         sql.NVarChar(20),  propertyZip2)
        .input('PropertyValue2',       sql.Decimal(18,2), propertyValue2)
        .input('PropertyStatus2',      sql.NVarChar(50),  propertyStatus2)
        .input('IntendedOccupancy2',   sql.NVarChar(50),  intendedOccupancy2)
        .input('MonthlyInsurance2',    sql.Decimal(18,2), monthlyInsurance2)
        .input('MonthlyRentalIncome2', sql.Decimal(18,2), monthlyRentalIncome2)
      
        .input('HasMortgageLoans2',    sql.Bit,           hasMortgageLoans2)
        .input('CreditorName2',        sql.NVarChar(100), creditorName2)
        .input('CreditorAccount2',     sql.NVarChar(50),  creditorAccount2)
        .input('MortgagePayment2',     sql.Decimal(18,2), mortgagePayment2)
        .input('UnpaidBalance2',       sql.Decimal(18,2), unpaidBalance2)
        .input('PayOffMortgage2',      sql.Bit,           payOffMortgage2)
        .input('MortgageType2',        sql.NVarChar(50),  mortgageType2)

        // Section 3c: Property #3
        .input('HasProperty3',         sql.Bit,           hasProperty3)
        .input('PropertyStreet3',      sql.NVarChar(255), propertyStreet3)
        .input('PropertyCity3',        sql.NVarChar(100), propertyCity3)
        .input('PropertyState3',       sql.NVarChar(50),  propertyState3)
        .input('PropertyZip3',         sql.NVarChar(20),  propertyZip3)
        .input('PropertyValue3',       sql.Decimal(18,2), propertyValue3)
        .input('PropertyStatus3',      sql.NVarChar(50),  propertyStatus3)
        .input('IntendedOccupancy3',   sql.NVarChar(50),  intendedOccupancy3)
        .input('MonthlyInsurance3',    sql.Decimal(18,2), monthlyInsurance3)
        .input('MonthlyRentalIncome3', sql.Decimal(18,2), monthlyRentalIncome3)
        
        .input('HasMortgageLoans3',    sql.Bit,           hasMortgageLoans3)
        .input('CreditorName3',        sql.NVarChar(100), creditorName3)
        .input('CreditorAccount3',     sql.NVarChar(50),  creditorAccount3)
        .input('MortgagePayment3',     sql.Decimal(18,2), mortgagePayment3)
        .input('UnpaidBalance3',       sql.Decimal(18,2), unpaidBalance3)
        .input('PayOffMortgage3',      sql.Bit,           payOffMortgage3)
        .input('MortgageType3',        sql.NVarChar(50),  mortgageType3)

        // Section 4: Loan and Property Information

        // Section 4a:
        .input('LoanAmount4',              sql.Decimal(18,2), loanAmount4)
        .input('LoanPurpose4',             sql.NVarChar(50),  loanPurpose4)
        .input('LoanPurposeOtherDesc4',    sql.NVarChar(255), loanPurposeOtherDesc4)
      
        .input('PropertyStreet4',          sql.NVarChar(255), propertyStreet4)
        .input('PropertyCity4',            sql.NVarChar(100), propertyCity4)
        .input('PropertyState4',           sql.NVarChar(50),  propertyState4)
        .input('PropertyZip4',             sql.NVarChar(20),  propertyZip4)
        .input('PropertyCounty4',          sql.NVarChar(100), propertyCounty4)
        .input('PropertyUnit4',            sql.NVarChar(50),  propertyUnit4)
      
        .input('NumberOfUnits4',           sql.Int,           numberOfUnits4)
        .input('PropertyValue4',           sql.Decimal(18,2), propertyValue4)
        .input('Occupancy4',               sql.NVarChar(50),  occupancy4)
        .input('FHASecondaryResidence4',   sql.Bit,           fhaSecondaryResidence4)
      
        .input('MixedUse4',                sql.Bit,           mixedUse4)
        .input('ManufacturedHome4',        sql.Bit,           manufacturedHome4)

        // Section 4b: Other New Mortgage Loans on the Property You Are Buying or Refinancing
        .input('HasNewMortgages4b', sql.Bit, hasNewMortgages4b)

        .input('CreditorName4b1',   sql.NVarChar(100), creditorName4b1)
        .input('LienType4b1',       sql.NVarChar(50),  lienType4b1)
        .input('MonthlyPayment4b1', sql.Decimal(18,2), monthlyPayment4b1)
        .input('LoanAmount4b1',     sql.Decimal(18,2), loanAmount4b1)
        .input('CreditLimit4b1',    sql.Decimal(18,2), creditLimit4b1)
      
        .input('CreditorName4b2',   sql.NVarChar(100), creditorName4b2)
        .input('LienType4b2',       sql.NVarChar(50),  lienType4b2)
        .input('MonthlyPayment4b2', sql.Decimal(18,2), monthlyPayment4b2)
        .input('LoanAmount4b2',     sql.Decimal(18,2), loanAmount4b2)
        .input('CreditLimit4b2',    sql.Decimal(18,2), creditLimit4b2)

        // Section 4c: Rental Income on the Property You Want to Purchase
        .input('HasRentalIncome4c',       sql.Bit,           hasRentalIncome4c)
        .input('ExpectedRentalIncome4c',  sql.Decimal(18,2), expectedRentalIncome4c)
        .input('NetRentalIncome4c',       sql.Decimal(18,2), netRentalIncome4c)

        // Section 4d: Gifts or Grants
        .input('HasGiftsGrants4d',    sql.Bit,           hasGiftsGrants4d)

        .input('GiftAssetType4d1',    sql.NVarChar(100), giftAssetType4d1)
        .input('Deposited4d1',        sql.NVarChar(50),  deposited4d1)
        .input('GiftSource4d1',       sql.NVarChar(100), giftSource4d1)
        .input('GiftValue4d1',        sql.Decimal(18,2), giftValue4d1)
      
        .input('GiftAssetType4d2',    sql.NVarChar(100), giftAssetType4d2)
        .input('Deposited4d2',        sql.NVarChar(50),  deposited4d2)
        .input('GiftSource4d2',       sql.NVarChar(100), giftSource4d2)
        .input('GiftValue4d2',        sql.Decimal(18,2), giftValue4d2)

        // Existing fields
        .input('FirstName',              sql.NVarChar(100), borrowerFirstName)
        .input('LastName',               sql.NVarChar(100), borrowerLastName)
        .input('SSN',                    sql.NVarChar(20),  borrowerSSN)
        .input('DOB',                    sql.Date,          borrowerDOB)
        .input('EmployerName',           sql.NVarChar(255), employerName)
        .input('AnnualIncome',           sql.Decimal(18,2), annualIncome)
        .input('CheckingAccounts',       sql.Decimal(18,2), checkingAccounts)
        .input('CreditCardDebt',         sql.Decimal(18,2), creditCardDebt)
        .input('PropertyAddress',        sql.NVarChar(500), propertyAddress)
        .input('PropertyValue',          sql.Decimal(18,2), propertyValue)
        .input('LoanPurpose',            sql.NVarChar(50),  loanPurpose)
        .input('LoanTerm',               sql.Int,           loanTerm)
        .input('LoanType',               sql.NVarChar(50),  loanType)
        .input('RateLock',               sql.NVarChar(50),  rateLock)
        .input('EmploymentType',         sql.NVarChar(50),  employmentType)
        .input('ApplicationStatus',      sql.NVarChar(50),  newStatus)

        .query(`
          INSERT INTO LoanApplications (
            UserID,
            
            -- Names
            BorrowerFirstName,
            BorrowerMiddleName,
            BorrowerSuffix,
            AlternateNames,
            BorrowerLastName,
            BorrowerSSN,
            BorrowerDOB,

            -- Contact Info
            HomePhone,
            CellPhone,
            WorkPhone,
            EmailAddress,

            -- Additional Info
            Citizenship,
            TypeOfCredit,
            NumberOfBorrowers,
            MaritalStatus,
            DependentsNumber,
            DependentsAges,

            -- Current Address
            CurrentAddressStreet,
            CurrentAddressCity,
            CurrentAddressState,
            CurrentAddressZip,
            CurrentAddressYears,
            CurrentAddressMonths,
            CurrentAddressHousing,
            CurrentAddressRent,

            -- Former Address
            HasFormerAddress,
            FormerAddressStreet,
            FormerAddressCity,
            FormerAddressState,
            FormerAddressZip,
            FormerAddressYears,
            FormerAddressMonths,
            FormerAddressHousing,
            FormerAddressRent,

            -- Mailing Address
            HasMailingAddress,
            MailingAddressStreet,
            MailingAddressCity,
            MailingAddressState,
            MailingAddressZip,

            -- Employment & Income
            HasCurrentEmployment,
            EmployerName,
            AnnualIncome,

            -- Current Employment
            EmployerPhone,
            EmployerStreet,
            EmployerUnit,
            EmployerCity,
            EmployerState,
            EmployerZip,
            EmployerCountry,
            PositionTitle,
            StartDate,
            LineOfWorkYears,
            LineOfWorkMonths,
            IsFamilyEmployee,
            OwnershipShare,
            MonthlyIncomeOrLoss, 
            BaseIncome,
            OvertimeIncome,
            BonusIncome,
            CommissionIncome,
            MilitaryEntitlements,
            OtherIncome,

            -- Additional Employment 1
            HasAdditionalEmployment,
            EmployerNameAdditional1,
            EmployerPhoneAdditional1,
            EmployerStreetAdditional1,
            EmployerUnitAdditional1,
            EmployerCityAdditional1,
            EmployerStateAdditional1,
            EmployerZipAdditional1,
            EmployerCountryAdditional1,
            PositionTitleAdditional1,
            StartDateAdditional1,
            LineOfWorkYearsAdditional1,
            LineOfWorkMonthsAdditional1,
            IsFamilyEmployeeAdditional1,
            OwnershipShareAdditional1,
            MonthlyIncomeOrLossAdditional1,
            BaseIncomeAdditional1,
            OvertimeIncomeAdditional1,
            BonusIncomeAdditional1,
            CommissionIncomeAdditional1,
            MilitaryEntitlementsAdditional1,
            OtherIncomeAdditional1,

            -- Section 1d: Additional2 (Previous Employment)
            HasPreviousEmploymentAdditional2,
            EmployerNameAdditional2,
            PrevGrossMonthlyIncomeAdditional2,
            EmployerStreetAdditional2,
            EmployerUnitAdditional2,
            EmployerCityAdditional2,
            EmployerStateAdditional2,
            EmployerZipAdditional2,
            EmployerCountryAdditional2,
            PositionTitleAdditional2,
            StartDateAdditional2,
            EndDateAdditional2,
            WasBusinessOwnerAdditional2,

            -- Section 1e: Income From Other Sources
            HasOtherIncome,
            IncomeSource1,
            MonthlyIncome1,
            IncomeSource2,
            MonthlyIncome2,
            IncomeSource3,
            MonthlyIncome3,
            IncomeSource4,
            MonthlyIncome4,

            -- Section 2a: Assets
            AccountType1,
            FinancialInstitution1,
            AccountNumber1,
            CashValue1,

            AccountType2,
            FinancialInstitution2,
            AccountNumber2,
            CashValue2,

            AccountType3,
            FinancialInstitution3,
            AccountNumber3,
            CashValue3,

            AccountType4,
            FinancialInstitution4,
            AccountNumber4,
            CashValue4,

            AccountType5,
            FinancialInstitution5,
            AccountNumber5,
            CashValue5,

            -- Section 2b: Other Assets & Credits
            HasOtherAssets2b,
            AssetCreditType1,
            AssetCreditValue1,
            AssetCreditType2,
            AssetCreditValue2,
            AssetCreditType3,
            AssetCreditValue3,
            AssetCreditType4,
            AssetCreditValue4,

            -- Section 2c: Liabilities
            HasLiabilities2c,

            LiabilityType2c1,
            MonthlyPayment2c1,

            LiabilityType2c2,
            MonthlyPayment2c2,

            LiabilityType2c3,
            MonthlyPayment2c3,

            LiabilityType2c4,
            MonthlyPayment2c4,

            -- Section 2d: Other Liabilities
            HasOtherLiabilities2d,

            LiabilityType2d1,
            MonthlyPayment2d1,

            LiabilityType2d2,
            MonthlyPayment2d2,

            LiabilityType2d3,
            MonthlyPayment2d3,

            LiabilityType2d4,
            MonthlyPayment2d4,

            -- Section 3: Real Estate
            HasRealEstate3,

            -- Section 3a: Property #1
            PropertyStreet1,
            PropertyCity1,
            PropertyState1,
            PropertyZip1,
            PropertyValue1,
            PropertyStatus1,
            IntendedOccupancy1,
            MonthlyInsurance1,
            MonthlyRentalIncome1,

            HasMortgageLoans1,
            CreditorName1,
            CreditorAccount1,
            MortgagePayment1,
            UnpaidBalance1,
            PayOffMortgage1,
            MortgageType1,

            -- Section 3b: Property #2
            HasProperty2,
            PropertyStreet2,
            PropertyCity2,
            PropertyState2,
            PropertyZip2,
            PropertyValue2,
            PropertyStatus2,
            IntendedOccupancy2,
            MonthlyInsurance2,
            MonthlyRentalIncome2,

            HasMortgageLoans2,
            CreditorName2,
            CreditorAccount2,
            MortgagePayment2,
            UnpaidBalance2,
            PayOffMortgage2,
            MortgageType2,

            -- Section 3c: Property #3
            HasProperty3,
            PropertyStreet3,
            PropertyCity3,
            PropertyState3,
            PropertyZip3,
            PropertyValue3,
            PropertyStatus3,
            IntendedOccupancy3,
            MonthlyInsurance3,
            MonthlyRentalIncome3,

            HasMortgageLoans3,
            CreditorName3,
            CreditorAccount3,
            MortgagePayment3,
            UnpaidBalance3,
            PayOffMortgage3,
            MortgageType3,

            -- Section 4: Loan and Property Information

            -- Section 4a:
            LoanAmount4,
            LoanPurpose4,
            LoanPurposeOtherDesc4,

            PropertyStreet4,
            PropertyCity4,
            PropertyState4,
            PropertyZip4,
            PropertyCounty4,
            PropertyUnit4,

            NumberOfUnits4,
            PropertyValue4,
            Occupancy4,
            FHASecondaryResidence4,
            MixedUse4,
            ManufacturedHome4,

            -- Section 4b: Other New Mortgage Loans on the Property You Are Buying or Refinancing
            HasNewMortgages4b,
            CreditorName4b1,
            LienType4b1,
            MonthlyPayment4b1,
            LoanAmount4b1,
            CreditLimit4b1,

            CreditorName4b2,
            LienType4b2,
            MonthlyPayment4b2,
            LoanAmount4b2,
            CreditLimit4b2,

            -- Section 4c: Rental Income on the Property You Want to Purchase
            HasRentalIncome4c,
            ExpectedRentalIncome4c,
            NetRentalIncome4c,

            -- Section 4d: Gifts or Grants
            HasGiftsGrants4d,
            GiftAssetType4d1,
            Deposited4d1,
            GiftSource4d1,
            GiftValue4d1,

            GiftAssetType4d2,
            Deposited4d2,
            GiftSource4d2,
            GiftValue4d2,

            -- Assets & Liabilities
            CheckingAccounts,
            CreditCardDebt,

            -- Property
            PropertyAddress,
            PropertyValue,

            -- Loan Preferences
            LoanPurpose,
            LoanTerm,
            LoanType,
            RateLock,
            EmploymentType,

            -- Status
            ApplicationStatus
          ) VALUES (
            @UserID,
            
            @FirstName,
            @BorrowerMiddleName,
            @BorrowerSuffix,
            @AlternateNames,
            @LastName,
            @SSN,
            @DOB,

            @Citizenship,
            @TypeOfCredit,
            @NumberOfBorrowers,
            @MaritalStatus,
            @DependentsNumber,
            @DependentsAges,

            @CurrentAddressStreet,
            @CurrentAddressCity,
            @CurrentAddressState,
            @CurrentAddressZip,
            @CurrentAddressYears,
            @CurrentAddressMonths,
            @CurrentAddressHousing,
            @CurrentAddressRent,

            @HasFormerAddress,
            @FormerAddressStreet,
            @FormerAddressCity,
            @FormerAddressState,
            @FormerAddressZip,
            @FormerAddressYears,
            @FormerAddressMonths,
            @FormerAddressHousing,
            @FormerAddressRent,

            @HasMailingAddress,
            @MailingAddressStreet,
            @MailingAddressCity,
            @MailingAddressState,
            @MailingAddressZip,

            @HasCurrentEmployment,
            @EmployerName,
            @AnnualIncome,

            @EmployerPhone,
            @EmployerStreet,
            @EmployerUnit,
            @EmployerCity,
            @EmployerState,
            @EmployerZip,
            @EmployerCountry,
            @PositionTitle,
            @StartDate,
            @LineOfWorkYears,
            @LineOfWorkMonths,
            @IsFamilyEmployee,
            @OwnershipShare,
            @MonthlyIncomeOrLoss,
            @BaseIncome,
            @OvertimeIncome,
            @BonusIncome,
            @CommissionIncome,
            @MilitaryEntitlements,
            @OtherIncome,

            @HasAdditionalEmployment,
            @EmployerNameAdditional1,
            @EmployerPhoneAdditional1,
            @EmployerStreetAdditional1,
            @EmployerUnitAdditional1,
            @EmployerCityAdditional1,
            @EmployerStateAdditional1,
            @EmployerZipAdditional1,
            @EmployerCountryAdditional1,
            @PositionTitleAdditional1,
            @StartDateAdditional1,
            @LineOfWorkYearsAdditional1,
            @LineOfWorkMonthsAdditional1,
            @IsFamilyEmployeeAdditional1,
            @OwnershipShareAdditional1,
            @MonthlyIncomeOrLossAdditional1,
            @BaseIncomeAdditional1,
            @OvertimeIncomeAdditional1,
            @BonusIncomeAdditional1,
            @CommissionIncomeAdditional1,
            @MilitaryEntitlementsAdditional1,
            @OtherIncomeAdditional1,

            @HasPreviousEmploymentAdditional2,
            @EmployerNameAdditional2,
            @PrevGrossMonthlyIncomeAdditional2,
            @EmployerStreetAdditional2,
            @EmployerUnitAdditional2,
            @EmployerCityAdditional2,
            @EmployerStateAdditional2,
            @EmployerZipAdditional2,
            @EmployerCountryAdditional2,
            @PositionTitleAdditional2,
            @StartDateAdditional2,
            @EndDateAdditional2,
            @WasBusinessOwnerAdditional2,

            @HasOtherIncome,
            @IncomeSource1,
            @MonthlyIncome1,
            @IncomeSource2,
            @MonthlyIncome2,
            @IncomeSource3,
            @MonthlyIncome3,
            @IncomeSource4,
            @MonthlyIncome4,

            @AccountType1,
            @FinancialInstitution1,
            @AccountNumber1,
            @CashValue1,

            @AccountType2,
            @FinancialInstitution2,
            @AccountNumber2,
            @CashValue2,

            @AccountType3,
            @FinancialInstitution3,
            @AccountNumber3,
            @CashValue3,

            @AccountType4,
            @FinancialInstitution4,
            @AccountNumber4,
            @CashValue4,

            @AccountType5,
            @FinancialInstitution5,
            @AccountNumber5,
            @CashValue5,

            @HasOtherAssets2b,
            @AssetCreditType1,
            @AssetCreditValue1,
            @AssetCreditType2,
            @AssetCreditValue2,
            @AssetCreditType3,
            @AssetCreditValue3,
            @AssetCreditType4,
            @AssetCreditValue4,

            @HasLiabilities2c,
            @AccountType2c1,
            @CompanyName2c1,
            @AccountNumber2c1,
            @UnpaidBalance2c1,
            @PayOff2c1,
            @MonthlyPayment2c1,   

            @AccountType2c2,
            @CompanyName2c2,
            @AccountNumber2c2,
            @UnpaidBalance2c2,
            @PayOff2c2,
            @MonthlyPayment2c2,   

            @AccountType2c3,
            @CompanyName2c3,
            @AccountNumber2c3,
            @UnpaidBalance2c3,
            @PayOff2c3,
            @MonthlyPayment2c3, 

            @AccountType2c4,
            @CompanyName2c4,
            @AccountNumber2c4,
            @UnpaidBalance2c4,
            @PayOff2c4,
            @MonthlyPayment2c4,   

            @AccountType2c5,
            @CompanyName2c5,
            @AccountNumber2c5,
            @UnpaidBalance2c5,
            @PayOff2c5,
            @MonthlyPayment2c5,

            @HasOtherLiabilities2d,
            
            @LiabilityType2d1,
            @MonthlyPayment2d1,

            @LiabilityType2d2,
            @MonthlyPayment2d2,

            @LiabilityType2d3,
            @MonthlyPayment2d3,

            @LiabilityType2d4,
            @MonthlyPayment2d4,

            @HasRealEstate3,

            @PropertyStreet1,
            @PropertyCity1,
            @PropertyState1,
            @PropertyZip1,
            @PropertyValue1,
            @PropertyStatus1,
            @IntendedOccupancy1,
            @MonthlyInsurance1,
            @MonthlyRentalIncome1,

            @HasMortgageLoans1,
            @CreditorName1,
            @CreditorAccount1,
            @MortgagePayment1,
            @UnpaidBalance1,
            @PayOffMortgage1,
            @MortgageType1,

            @HasProperty2,
            @PropertyStreet2,
            @PropertyCity2,
            @PropertyState2,
            @PropertyZip2,
            @PropertyValue2,
            @PropertyStatus2,
            @IntendedOccupancy2,
            @MonthlyInsurance2,
            @MonthlyRentalIncome2,

            @HasMortgageLoans2,
            @CreditorName2,
            @CreditorAccount2,
            @MortgagePayment2,
            @UnpaidBalance2,
            @PayOffMortgage2,
            @MortgageType2,

            @HasProperty3,
            @PropertyStreet3,
            @PropertyCity3,
            @PropertyState3,
            @PropertyZip3,
            @PropertyValue3,
            @PropertyStatus3,
            @IntendedOccupancy3,
            @MonthlyInsurance3,
            @MonthlyRentalIncome3,

            @HasMortgageLoans3,
            @CreditorName3,
            @CreditorAccount3,
            @MortgagePayment3,
            @UnpaidBalance3,
            @PayOffMortgage3,
            @MortgageType3,

            @LoanAmount4,
            @LoanPurpose4,
            @LoanPurposeOtherDesc4,

            @PropertyStreet4,
            @PropertyCity4,
            @PropertyState4,
            @PropertyZip4,
            @PropertyCounty4,
            @PropertyUnit4,

            @NumberOfUnits4,
            @PropertyValue4,
            @Occupancy4,
            @FHASecondaryResidence4,
            @MixedUse4,
            @ManufacturedHome4,

            @HasNewMortgages4b,
            @CreditorName4b1,
            @LienType4b1,
            @MonthlyPayment4b1,
            @LoanAmount4b1,
            @CreditLimit4b1,

            @CreditorName4b2,
            @LienType4b2,
            @MonthlyPayment4b2,
            @LoanAmount4b2,
            @CreditLimit4b2,

            @HasRentalIncome4c,
            @ExpectedRentalIncome4c,
            @NetRentalIncome4c,

            @HasGiftsGrants4d,
            @GiftAssetType4d1,
            @Deposited4d1,
            @GiftSource4d1,
            @GiftValue4d1,

            @GiftAssetType4d2,
            @Deposited4d2,
            @GiftSource4d2,
            @GiftValue4d2,

            @CheckingAccounts,
            @CreditCardDebt,

            @PropertyAddress,
            @PropertyValue,

            @LoanPurpose,
            @LoanTerm,
            @LoanType,
            @RateLock,
            @EmploymentType,

            @ApplicationStatus
          )
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving loan application:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;

