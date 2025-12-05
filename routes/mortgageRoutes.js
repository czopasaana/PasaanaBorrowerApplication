const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const sql = require('mssql');

router.post('/saveLoanApplication', upload.array('loanDocs'), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  // New URLA-normalized flow: try to save into normalized tables and return
  try {
    const appId = await saveLoanApplicationURLA(req, req.app.locals.pool);
    return res.json({ success: true, applicationId: appId });
  } catch (e) {
    console.error('URLA save failed, falling back (legacy disabled):', e.message);
    return res.json({ success: false, error: 'Failed to save application.' });
  }

  // Helper functions to handle empty fields etc.
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

  function parseBool(val) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return null; // or false, or undefined
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

  // Section 5: Declarations

  // Section 5a: About this Property and Your Money for this Loan
  const primaryResidence5a    = parseBool(req.body.primaryResidence5a);
  const ownershipInterest5a   = parseBool(req.body.ownershipInterest5a);
  const familyRelationship5a  = parseBool(req.body.familyRelationship5a);
  const borrowingMoney5a      = parseBool(req.body.borrowingMoney5a);
  const anotherMortgage5a     = parseBool(req.body.anotherMortgage5a);
  const newCredit5a           = parseBool(req.body.newCredit5a);
  const priorityLien5a        = parseBool(req.body.priorityLien5a);

  const propertyType5a  = req.body.propertyType5a || null;
  const titleHeld5a     = req.body.titleHeld5a || null;
  const borrowedAmount5a = req.body.borrowedAmount5a 

  // Section 5b: About Your Finances
  const coSignerGuarantor5b     = parseBool(req.body.coSignerGuarantor5b);
  const judgments5b             = parseBool(req.body.judgments5b);
  const delinquentFederalDebt5b = parseBool(req.body.delinquentFederalDebt5b);
  const lawsuitLiability5b      = parseBool(req.body.lawsuitLiability5b);
  const conveyTitleInLieu5b     = parseBool(req.body.conveyTitleInLieu5b);
  const preforeclosureSale5b    = parseBool(req.body.preforeclosureSale5b);
  const foreclosedProperty5b    = parseBool(req.body.foreclosedProperty5b);
  const declaredBankruptcy5b    = parseBool(req.body.declaredBankruptcy5b);

  const bankruptChapter7        = parseBool(req.body.bankruptChapter7);
  const bankruptChapter11       = parseBool(req.body.bankruptChapter11);
  const bankruptChapter12       = parseBool(req.body.bankruptChapter12);
  const bankruptChapter13       = parseBool(req.body.bankruptChapter13);

  // Section 7: Military Service
  const hasMilitaryService7 = (req.body.hasMilitaryService7 === 'true');

  const isCurrentlyActiveDuty7 = (req.body.isCurrentlyActiveDuty7 === 'true');
  const projectedExpirationDate7 = req.body.projectedExpirationDate7 
    ? req.body.projectedExpirationDate7 
    : null;

  const isRetiredDischarged7 = (req.body.isRetiredDischarged7 === 'true');
  const isReserveOrGuard7    = (req.body.isReserveOrGuard7 === 'true');
  const isSurvivingSpouse7   = (req.body.isSurvivingSpouse7 === 'true');

  // Section 8: Demographic Information
  const ethHispanicLatino8 = (req.body.ethHispanicLatino8 === 'true');
  const ethMexican8        = (req.body.ethMexican8 === 'true');
  const ethPuertoRican8    = (req.body.ethPuertoRican8 === 'true');
  const ethCuban8          = (req.body.ethCuban8 === 'true');
  const ethOtherHispanic8  = (req.body.ethOtherHispanic8 === 'true');
  const ethOtherHispanicOrigin8 = toNullIfEmpty(req.body.ethOtherHispanicOrigin8);
  const ethNotHispanic8    = (req.body.ethNotHispanic8 === 'true');
  const ethNoInfo8         = (req.body.ethNoInfo8 === 'true');

  // For sex, you said you store it as a short string: "Female","Male","NoInfo",""...
  const sex8 = toNullIfEmpty(req.body.sex8); 
  // (If user didn't pick anything, it might be undefined => we convert to null)

  // Race
  const raceAmericanIndian8 = (req.body.raceAmericanIndian8 === 'true');
  const americanIndianTribe8 = toNullIfEmpty(req.body.americanIndianTribe8);

  const raceAsian8          = (req.body.raceAsian8 === 'true');
  const otherAsianPrint8    = toNullIfEmpty(req.body.otherAsianPrint8);

  const raceBlack8          = (req.body.raceBlack8 === 'true');
  const raceHawaiian8       = (req.body.raceHawaiian8 === 'true');
  const otherPacIslanderPrint8 = toNullIfEmpty(req.body.otherPacIslanderPrint8);

  const raceWhite8          = (req.body.raceWhite8 === 'true');
  const raceNoInfo8         = (req.body.raceNoInfo8 === 'true');

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

        // Section 5: Declarations

        // Section 5a: About this Property and Your Money for this Loan
        .input('PrimaryResidence5a',   sql.Bit, primaryResidence5a)
        .input('OwnershipInterest5a',  sql.Bit, ownershipInterest5a)
        .input('FamilyRelationship5a', sql.Bit, familyRelationship5a)
        .input('BorrowingMoney5a',     sql.Bit, borrowingMoney5a)
        .input('AnotherMortgage5a',    sql.Bit, anotherMortgage5a)
        .input('NewCredit5a',          sql.Bit, newCredit5a)
        .input('PriorityLien5a',       sql.Bit, priorityLien5a)
  
        .input('PropertyType5a',       sql.NVarChar(50), propertyType5a)
        .input('TitleHeld5a',          sql.NVarChar(50), titleHeld5a)
        .input('BorrowedAmount5a',     sql.Decimal(18,2), borrowedAmount5a)

        // Section 5b: About Your Finances
        .input('CoSignerGuarantor5b',     sql.Bit, coSignerGuarantor5b)
        .input('Judgments5b',            sql.Bit, judgments5b)
        .input('DelinquentFederalDebt5b',sql.Bit, delinquentFederalDebt5b)
        .input('LawsuitLiability5b',     sql.Bit, lawsuitLiability5b)
        .input('ConveyTitleInLieu5b',    sql.Bit, conveyTitleInLieu5b)
        .input('PreforeclosureSale5b',   sql.Bit, preforeclosureSale5b)
        .input('ForeclosedProperty5b',   sql.Bit, foreclosedProperty5b)
        .input('DeclaredBankruptcy5b',   sql.Bit, declaredBankruptcy5b)

        .input('BankruptChapter7',       sql.Bit, bankruptChapter7)
        .input('BankruptChapter11',      sql.Bit, bankruptChapter11)
        .input('BankruptChapter12',      sql.Bit, bankruptChapter12)
        .input('BankruptChapter13',      sql.Bit, bankruptChapter13)

        // Section 7: Military Service
        .input('HasMilitaryService7',        sql.Bit, hasMilitaryService7)
        .input('IsCurrentlyActiveDuty7',     sql.Bit, isCurrentlyActiveDuty7)
        .input('ProjectedExpirationDate7',   sql.Date, projectedExpirationDate7)
        .input('IsRetiredDischarged7',       sql.Bit, isRetiredDischarged7)
        .input('IsReserveOrGuard7',          sql.Bit, isReserveOrGuard7)
        .input('IsSurvivingSpouse7',         sql.Bit, isSurvivingSpouse7)

        // Section 8: Demographic Information
        .input('EthHispanicLatino8',      sql.Bit, ethHispanicLatino8)
        .input('EthMexican8',             sql.Bit, ethMexican8)
        .input('EthPuertoRican8',         sql.Bit, ethPuertoRican8)
        .input('EthCuban8',               sql.Bit, ethCuban8)
        .input('EthOtherHispanic8',       sql.Bit, ethOtherHispanic8)
        .input('EthOtherHispanicOrigin8', sql.NVarChar(255), ethOtherHispanicOrigin8)
        .input('EthNotHispanic8',         sql.Bit, ethNotHispanic8)
        .input('EthNoInfo8',              sql.Bit, ethNoInfo8)

        .input('Sex8',                    sql.NVarChar(10), sex8)

        .input('RaceAmericanIndian8',     sql.Bit, raceAmericanIndian8)
        .input('AmericanIndianTribe8',    sql.NVarChar(255), americanIndianTribe8)
        .input('RaceAsian8',             sql.Bit, raceAsian8)
        .input('OtherAsianPrint8',       sql.NVarChar(255), otherAsianPrint8)
        .input('RaceBlack8',             sql.Bit, raceBlack8)
        .input('RaceHawaiian8',          sql.Bit, raceHawaiian8)
        .input('OtherPacIslanderPrint8', sql.NVarChar(255), otherPacIslanderPrint8)
        .input('RaceWhite8',             sql.Bit, raceWhite8)
        .input('RaceNoInfo8',            sql.Bit, raceNoInfo8)

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

            -- Section 5: Declarations

            -- Section 5a: About this Property and Your Money for this Loan
            PrimaryResidence5a    = @PrimaryResidence5a,
            OwnershipInterest5a   = @OwnershipInterest5a,
            PropertyType5a        = @PropertyType5a,
            TitleHeld5a           = @TitleHeld5a,

            FamilyRelationship5a  = @FamilyRelationship5a,

            BorrowingMoney5a      = @BorrowingMoney5a,
            BorrowedAmount5a      = @BorrowedAmount5a,

            AnotherMortgage5a     = @AnotherMortgage5a,
            NewCredit5a           = @NewCredit5a,

            PriorityLien5a        = @PriorityLien5a,

            -- Section 5b: About Your Finances
            CoSignerGuarantor5b     = @CoSignerGuarantor5b,
            Judgments5b             = @Judgments5b,
            DelinquentFederalDebt5b = @DelinquentFederalDebt5b,
            LawsuitLiability5b      = @LawsuitLiability5b,
            ConveyTitleInLieu5b     = @ConveyTitleInLieu5b,
            PreforeclosureSale5b    = @PreforeclosureSale5b,
            ForeclosedProperty5b    = @ForeclosedProperty5b,
            DeclaredBankruptcy5b    = @DeclaredBankruptcy5b,
            BankruptChapter7        = @BankruptChapter7,
            BankruptChapter11       = @BankruptChapter11,
            BankruptChapter12       = @BankruptChapter12,
            BankruptChapter13       = @BankruptChapter13,

            -- Section 7: Military Service
            HasMilitaryService7     = @HasMilitaryService7,
            IsCurrentlyActiveDuty7 = @IsCurrentlyActiveDuty7,
            ProjectedExpirationDate7 = @ProjectedExpirationDate7,
            IsRetiredDischarged7   = @IsRetiredDischarged7,
            IsReserveOrGuard7      = @IsReserveOrGuard7,
            IsSurvivingSpouse7    = @IsSurvivingSpouse7,

            -- Section 8: Demographic Information
            EthHispanicLatino8      = @EthHispanicLatino8,
            EthMexican8             = @EthMexican8,
            EthPuertoRican8         = @EthPuertoRican8,
            EthCuban8               = @EthCuban8,
            EthOtherHispanic8       = @EthOtherHispanic8,
            EthOtherHispanicOrigin8 = @EthOtherHispanicOrigin8,
            EthNotHispanic8         = @EthNotHispanic8,
            EthNoInfo8              = @EthNoInfo8,

            Sex8                    = @Sex8,

            RaceAmericanIndian8     = @RaceAmericanIndian8,
            AmericanIndianTribe8    = @AmericanIndianTribe8,
            RaceAsian8             = @RaceAsian8,
            OtherAsianPrint8       = @OtherAsianPrint8,
            RaceBlack8             = @RaceBlack8,
            RaceHawaiian8          = @RaceHawaiian8,
            OtherPacIslanderPrint8 = @OtherPacIslanderPrint8,
            RaceWhite8             = @RaceWhite8,
            RaceNoInfo8            = @RaceNoInfo8,

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

        // Section 5: Declarations  

        // Section 5a: About this Property and Your Money for this Loan
        .input('PrimaryResidence5a',   sql.Bit, primaryResidence5a)
        .input('OwnershipInterest5a',  sql.Bit, ownershipInterest5a)
        .input('FamilyRelationship5a', sql.Bit, familyRelationship5a)
        .input('BorrowingMoney5a',     sql.Bit, borrowingMoney5a)
        .input('AnotherMortgage5a',    sql.Bit, anotherMortgage5a)
        .input('NewCredit5a',          sql.Bit, newCredit5a)
        .input('PriorityLien5a',       sql.Bit, priorityLien5a)
  
        .input('PropertyType5a',       sql.NVarChar(50), propertyType5a)
        .input('TitleHeld5a',          sql.NVarChar(50), titleHeld5a)
        .input('BorrowedAmount5a',     sql.Decimal(18,2), borrowedAmount5a)

        // Section 5b: About Your Finances
        .input('CoSignerGuarantor5b',     sql.Bit, coSignerGuarantor5b)
        .input('Judgments5b',            sql.Bit, judgments5b)
        .input('DelinquentFederalDebt5b',sql.Bit, delinquentFederalDebt5b)
        .input('LawsuitLiability5b',     sql.Bit, lawsuitLiability5b)
        .input('ConveyTitleInLieu5b',    sql.Bit, conveyTitleInLieu5b)
        .input('PreforeclosureSale5b',   sql.Bit, preforeclosureSale5b)
        .input('ForeclosedProperty5b',   sql.Bit, foreclosedProperty5b)
        .input('DeclaredBankruptcy5b',   sql.Bit, declaredBankruptcy5b)

        .input('BankruptChapter7',       sql.Bit, bankruptChapter7)
        .input('BankruptChapter11',      sql.Bit, bankruptChapter11)
        .input('BankruptChapter12',      sql.Bit, bankruptChapter12)
        .input('BankruptChapter13',      sql.Bit, bankruptChapter13)

        // Section 7: Military Service
        .input('HasMilitaryService7',     sql.Bit, hasMilitaryService7)
        .input('IsCurrentlyActiveDuty7',  sql.Bit, isCurrentlyActiveDuty7)
        .input('ProjectedExpirationDate7', sql.Date, projectedExpirationDate7)
        .input('IsRetiredDischarged7',   sql.Bit, isRetiredDischarged7)
        .input('IsReserveOrGuard7',      sql.Bit, isReserveOrGuard7)
        .input('IsSurvivingSpouse7',     sql.Bit, isSurvivingSpouse7)

        // Section 8: Demographic Information
        .input('EthHispanicLatino8',      sql.Bit, ethHispanicLatino8)
        .input('EthMexican8',             sql.Bit, ethMexican8)
        .input('EthPuertoRican8',         sql.Bit, ethPuertoRican8)
        .input('EthCuban8',               sql.Bit, ethCuban8)
        .input('EthOtherHispanic8',       sql.Bit, ethOtherHispanic8)
        .input('EthOtherHispanicOrigin8', sql.NVarChar(255), ethOtherHispanicOrigin8)
        .input('EthNotHispanic8',         sql.Bit, ethNotHispanic8)
        .input('EthNoInfo8',              sql.Bit, ethNoInfo8)

        .input('Sex8',                    sql.NVarChar(10), sex8)

        .input('RaceAmericanIndian8',     sql.Bit, raceAmericanIndian8)
        .input('AmericanIndianTribe8',    sql.NVarChar(255), americanIndianTribe8)
        .input('RaceAsian8',             sql.Bit, raceAsian8)
        .input('OtherAsianPrint8',       sql.NVarChar(255), otherAsianPrint8)
        .input('RaceBlack8',             sql.Bit, raceBlack8)
        .input('RaceHawaiian8',          sql.Bit, raceHawaiian8)
        .input('OtherPacIslanderPrint8', sql.NVarChar(255), otherPacIslanderPrint8)
        .input('RaceWhite8',             sql.Bit, raceWhite8)
        .input('RaceNoInfo8',            sql.Bit, raceNoInfo8)

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

            AccountType2c1,
            CompanyName2c1,
            AccountNumber2c1,
            UnpaidBalance2c1,
            PayOff2c1,
            MonthlyPayment2c1,

            AccountType2c2,
            CompanyName2c2,
            AccountNumber2c2,
            UnpaidBalance2c2,
            PayOff2c2,
            MonthlyPayment2c2,

            AccountType2c3,
            CompanyName2c3,
            AccountNumber2c3,
            UnpaidBalance2c3,
            PayOff2c3,
            MonthlyPayment2c3,

            AccountType2c4,
            CompanyName2c4,
            AccountNumber2c4,
            UnpaidBalance2c4,
            PayOff2c4,
            MonthlyPayment2c4,

            AccountType2c5,
            CompanyName2c5,
            AccountNumber2c5,
            UnpaidBalance2c5,
            PayOff2c5,
            MonthlyPayment2c5,

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

            -- Section 5: Declarations

            -- Section 5a: About this Property and Your Money for this Loan
            PrimaryResidence5a,
            OwnershipInterest5a,
            PropertyType5a,
            TitleHeld5a,

            FamilyRelationship5a,

            BorrowingMoney5a,
            BorrowedAmount5a,

            AnotherMortgage5a,
            NewCredit5a,

            PriorityLien5a,

            -- Section 5b: About Your Finances
            CoSignerGuarantor5b,
            Judgments5b,
            DelinquentFederalDebt5b,
            LawsuitLiability5b,
            ConveyTitleInLieu5b,
            PreforeclosureSale5b,
            ForeclosedProperty5b,
            DeclaredBankruptcy5b,
            BankruptChapter7,
            BankruptChapter11,
            BankruptChapter12,
            BankruptChapter13,

            -- Section 7: Military Service
            HasMilitaryService7,
            IsCurrentlyActiveDuty7,
            ProjectedExpirationDate7,
            IsRetiredDischarged7,
            IsReserveOrGuard7,
            IsSurvivingSpouse7,

            -- Section 8: Demographic Information
            EthHispanicLatino8,
            EthMexican8,
            EthPuertoRican8,
            EthCuban8,
            EthOtherHispanic8,
            EthOtherHispanicOrigin8,
            EthNotHispanic8,
            EthNoInfo8,

            Sex8,

            RaceAmericanIndian8,
            AmericanIndianTribe8,
            RaceAsian8,
            OtherAsianPrint8,
            RaceBlack8,
            RaceHawaiian8,
            OtherPacIslanderPrint8,
            RaceWhite8,
            RaceNoInfo8,

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

            @PrimaryResidence5a,
            @OwnershipInterest5a,
            @PropertyType5a,
            @TitleHeld5a,

            @FamilyRelationship5a,

            @BorrowingMoney5a,
            @BorrowedAmount5a,

            @AnotherMortgage5a,
            @NewCredit5a,

            @PriorityLien5a,

            @CoSignerGuarantor5b,
            @Judgments5b,
            @DelinquentFederalDebt5b,
            @LawsuitLiability5b,
            @ConveyTitleInLieu5b,
            @PreforeclosureSale5b,
            @ForeclosedProperty5b,
            @DeclaredBankruptcy5b,
            @BankruptChapter7,
            @BankruptChapter11,
            @BankruptChapter12,
            @BankruptChapter13,

            @HasMilitaryService7,
            @IsCurrentlyActiveDuty7,
            @ProjectedExpirationDate7,
            @IsRetiredDischarged7,
            @IsReserveOrGuard7,
            @IsSurvivingSpouse7,

            @EthHispanicLatino8,
            @EthMexican8,
            @EthPuertoRican8,
            @EthCuban8,
            @EthOtherHispanic8,
            @EthOtherHispanicOrigin8,
            @EthNotHispanic8,
            @EthNoInfo8,

            @Sex8,

            @RaceAmericanIndian8,
            @AmericanIndianTribe8,
            @RaceAsian8,
            @OtherAsianPrint8,
            @RaceBlack8,
            @RaceHawaiian8,
            @OtherPacIslanderPrint8,
            @RaceWhite8,
            @RaceNoInfo8,

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

// ------------------------------
// URLA Normalized Save Function
// ------------------------------
async function saveLoanApplicationURLA(req, pool) {
  const sqlLib = require('mssql');

  function toNullIfEmpty(val) {
    return (val !== undefined && val !== null && String(val).trim() !== '') ? String(val).trim() : null;
  }
  function toDecimal(val) {
    if (val === undefined || val === null || String(val).trim() === '') return null;
    const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  }
  function toInt(val) {
    if (val === undefined || val === null || String(val).trim() === '') return null;
    const num = parseInt(String(val).replace(/[^0-9-]/g, ''), 10);
    return isNaN(num) ? null : num;
  }
  function parseBool(val) {
    if (val === true || val === false) return val;
    const s = String(val || '').toLowerCase();
    if (['true','yes','y','1','deposit','deposited'].includes(s)) return true;
    if (['false','no','n','0','not deposited','not_deposited','notdeposit'].includes(s)) return false;
    return null;
  }
  function safeDate(val) {
    const v = toNullIfEmpty(val);
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  function last4(ssn) {
    const s = toNullIfEmpty(ssn);
    if (!s) return null;
    const digits = s.replace(/\D/g, '');
    return digits.length >= 4 ? digits.slice(-4) : null;
  }
  function mapEnumerated(input, map, fallback = null) {
    const v = toNullIfEmpty(input);
    if (!v) return fallback;
    const key = v.replace(/\s+/g, '').toLowerCase();
    return map[key] !== undefined ? map[key] : fallback;
  }
  function mapOccupancy(val) {
    return mapEnumerated(val, {
      'primary':'PrimaryResidence',
      'primaryresidence':'PrimaryResidence',
      'secondhome':'SecondHome',
      'investment':'Investment'
    }, 'Other');
  }
  function mapSex(val) {
    return mapEnumerated(val, {
      'female':'Female',
      'male':'Male'
    }, 'PreferNotToProvide');
  }
  function mapLoanPurpose(val) {
    return mapEnumerated(val, {
      'purchase':'Purchase',
      'refinance':'Refinance'
    }, 'Other');
  }
  function mapLienType(val) {
    return mapEnumerated(val, {
      'firstlien':'FirstLien',
      'subordinatelien':'SubordinateLien'
    }, null);
  }
  function parseOwnershipPercent(val) {
    const v = toNullIfEmpty(val);
    if (!v) return null;
    const m = v.match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? parseFloat(m[1]) : null;
  }
  function mapPropertyStatus(val) {
    return mapEnumerated(val, {
      'sold':'Sold',
      'pendingsale':'PendingSale',
      'retained':'Retained'
    }, null);
  }
  function mapGiftAssetType(val) {
    return mapEnumerated(val, {
      'cashgift':'CashGift',
      'cash':'CashGift',
      'giftofequity':'GiftOfEquity',
      'grant':'Grant'
    }, null);
  }
  function mapGiftSource(val) {
    return mapEnumerated(val, {
      'communitynonprofit':'CommunityNonprofit',
      'employer':'Employer',
      'federalagency':'FederalAgency',
      'localagency':'LocalAgency',
      'relative':'Relative',
      'religiousnonprofit':'ReligiousNonprofit',
      'stateagency':'StateAgency',
      'unmarriedpartner':'UnmarriedPartner',
      'lender':'Lender',
      'other':'Other'
    }, null);
  }
  function mapAssetCreditType(val) {
    return mapEnumerated(val, {
      'proceedsfromrealestatesale':'ProceedsFromRealEstateSale',
      'proceedsfromnonrealestateassetsale':'ProceedsFromNonRealEstateAssetSale',
      'securedborrowedfunds':'SecuredBorrowedFunds',
      'unsecuredborrowedfunds':'UnsecuredBorrowedFunds',
      'earnestmoney':'EarnestMoney',
      'employerassistance':'EmployerAssistance',
      'lotequity':'LotEquity',
      'relocationfunds':'RelocationFunds',
      'rentcredit':'RentCredit',
      'swcatequity':'SweatEquity',
      'sweatequity':'SweatEquity',
      'tradeequity':'TradeEquity',
      'other':'Other'
    }, 'Other');
  }
  function mapOtherIncomeSource(val) {
    return mapEnumerated(val, {
      'alimony':'Alimony',
      'automobileallowance':'AutomobileAllowance',
      'boarderincome':'BoarderIncome',
      'capitalgains':'CapitalGains',
      'childsupport':'ChildSupport',
      'disability':'Disability',
      'fostercare':'FosterCare',
      'housingorparsonage':'HousingOrParsonage',
      'interestdividends':'InterestDividends',
      'mortgagecreditcertificate':'MortgageCreditCertificate',
      'mortgagedifferentialpayments':'MortgageDifferentialPayments',
      'notesreceivable':'NotesReceivable',
      'publicassistance':'PublicAssistance',
      'retirement':'Retirement',
      'royaltypayments':'RoyaltyPayments',
      'separatemaintenance':'SeparateMaintenance',
      'socialsecurity':'SocialSecurity',
      'trust':'Trust',
      'unemploymentbenefits':'UnemploymentBenefits',
      'vacompensation':'VACompensation',
      'other':'Other'
    }, 'Other');
  }
  function mapCitizenship(val) {
    return mapEnumerated(val, {
      'uscitizen':'USCitizen',
      'permanentresidentalien':'PermanentResidentAlien',
      'nonpermanentresidentalien':'NonPermanentResidentAlien'
    }, null);
  }
  function mapHousingType(val) {
    return mapEnumerated(val, {
      'own':'Own',
      'rent':'Rent',
      'noprimaryhousingexpense':'NoPrimaryHousingExpense'
    }, null);
  }

  const userId = req.session.user.userID;
  const t = new sqlLib.Transaction(pool);

  // Gather body fields (subset, rest mapped inline)
  const borrowerFirstName = toNullIfEmpty(req.body.borrowerFirstName);
  const borrowerMiddleName = toNullIfEmpty(req.body.borrowerMiddleName);
  const borrowerLastName = toNullIfEmpty(req.body.borrowerLastName);
  const borrowerSuffix = toNullIfEmpty(req.body.borrowerSuffix);
  const borrowerSSN = toNullIfEmpty(req.body.borrowerSSN);
  const borrowerDOB = safeDate(req.body.borrowerDOB);
  const alternateNames = toNullIfEmpty(req.body.alternateNames);
  const maritalStatus = toNullIfEmpty(req.body.maritalStatus);
  const dependentsNumber = toInt(req.body.dependentsNumber);
  const dependentsAgesStr = toNullIfEmpty(req.body.dependentsAges);

  const typeOfCredit = toNullIfEmpty(req.body.typeOfCredit);
  const loanTermLegacy = toInt(req.body.loanTerm);
  const loanTypeLegacy = toNullIfEmpty(req.body.loanType);
  const rateLockLegacy = parseBool(req.body.rateLock);

  await t.begin();
  try {
    // 1. loan_applications
    let loanTermMonths = (loanTermLegacy && loanTermLegacy <= 50) ? loanTermLegacy * 12 : loanTermLegacy;
    if (loanTermMonths === null || loanTermMonths === undefined || Number.isNaN(loanTermMonths)) {
      loanTermMonths = 0; // allow partial save
    }
    const typeOfCreditSafe = typeOfCredit || 'Individual';
    const loanPurposeSafe = mapLoanPurpose(req.body.loanPurpose4 || req.body.loanPurpose) || 'Other';
    const appRes = await new sqlLib.Request(t)
      .input('user_id', sqlLib.Int, userId)
      .input('type_of_credit', sqlLib.NVarChar(20), typeOfCreditSafe)
      .input('loan_purpose', sqlLib.NVarChar(20), loanPurposeSafe)
      .input('loan_term_months', sqlLib.Int, loanTermMonths)
      .input('loan_type', sqlLib.NVarChar(100), loanTypeLegacy)
      .input('rate_lock_flag', sqlLib.Bit, rateLockLegacy === null ? false : rateLockLegacy)
      .input('application_status', sqlLib.NVarChar(50), toNullIfEmpty(req.body.newStatus) || 'In Progress')
      .query(`
        INSERT INTO dbo.loan_applications (
          user_id, type_of_credit, loan_purpose, loan_term_months, loan_type, rate_lock_flag, application_status
        ) OUTPUT INSERTED.id AS id
        VALUES (@user_id, @type_of_credit, @loan_purpose, @loan_term_months, @loan_type, @rate_lock_flag, @application_status)
      `);
    const applicationId = appRes.recordset[0].id;

    // 2. borrowers (optional for partial save: require first and last name)
    let borrowerId = null;
    const hasBorrowerCore = !!(borrowerFirstName && borrowerLastName);
    if (hasBorrowerCore) {
      const borRes = await new sqlLib.Request(t)
        .input('first_name', sqlLib.NVarChar(100), borrowerFirstName)
        .input('middle_name', sqlLib.NVarChar(100), borrowerMiddleName)
        .input('last_name', sqlLib.NVarChar(100), borrowerLastName)
        .input('suffix', sqlLib.NVarChar(20), borrowerSuffix)
        .input('ssn_encrypted', sqlLib.VarBinary(sqlLib.MAX), null)
        .input('ssn_last4', sqlLib.NChar(4), last4(borrowerSSN))
        .input('dob', sqlLib.Date, borrowerDOB)
        .input('alternate_names', sqlLib.NVarChar(255), alternateNames)
        .input('citizenship_status', sqlLib.NVarChar(40), mapCitizenship(req.body.citizenship))
        .input('marital_status', sqlLib.NVarChar(20), maritalStatus)
        .input('number_of_dependents', sqlLib.Int, dependentsNumber)
        .input('email', sqlLib.NVarChar(254), toNullIfEmpty(req.body.emailAddress))
        .input('home_phone', sqlLib.NVarChar(25), toNullIfEmpty(req.body.homePhone))
        .input('cell_phone', sqlLib.NVarChar(25), toNullIfEmpty(req.body.cellPhone))
        .input('work_phone', sqlLib.NVarChar(25), toNullIfEmpty(req.body.workPhone))
        .query(`
          INSERT INTO dbo.borrowers (
            first_name, middle_name, last_name, suffix, ssn_encrypted, ssn_last4, dob, alternate_names,
            citizenship_status, marital_status, number_of_dependents, email, home_phone, cell_phone, work_phone
          ) OUTPUT INSERTED.id AS id
          VALUES (
            @first_name, @middle_name, @last_name, @suffix, @ssn_encrypted, @ssn_last4, @dob, @alternate_names,
            @citizenship_status, @marital_status, @number_of_dependents, @email, @home_phone, @cell_phone, @work_phone
          )
        `);
      borrowerId = borRes.recordset[0].id;

      await new sqlLib.Request(t)
        .input('application_id', sqlLib.BigInt, applicationId)
        .input('borrower_id', sqlLib.BigInt, borrowerId)
        .input('borrower_role', sqlLib.NVarChar(20), 'Primary')
        .query('INSERT INTO dbo.application_borrowers (application_id, borrower_id, borrower_role) VALUES (@application_id, @borrower_id, @borrower_role)');
    }

    // Dependents ages
    if (borrowerId && dependentsAgesStr) {
      const ages = dependentsAgesStr.split(',').map(s => toInt(s)).filter(a => a !== null);
      for (const age of ages) {
        await new sqlLib.Request(t)
          .input('borrower_id', sqlLib.BigInt, borrowerId)
          .input('age_years', sqlLib.Int, age)
          .query('INSERT INTO dbo.borrower_dependents (borrower_id, age_years) VALUES (@borrower_id, @age_years)');
      }
    }

    // Addresses
    const currHousing = mapHousingType(req.body.currentAddressHousing);
    if (borrowerId && (req.body.currentAddressStreet || req.body.currentAddressCity || req.body.currentAddressState || req.body.currentAddressZip)) {
      await new sqlLib.Request(t)
        .input('borrower_id', sqlLib.BigInt, borrowerId)
        .input('address_type', sqlLib.NVarChar(20), 'Current')
        .input('street', sqlLib.NVarChar(255), toNullIfEmpty(req.body.currentAddressStreet))
        .input('unit', sqlLib.NVarChar(50), null)
        .input('city', sqlLib.NVarChar(100), toNullIfEmpty(req.body.currentAddressCity))
        .input('state', sqlLib.NVarChar(50), toNullIfEmpty(req.body.currentAddressState))
        .input('zip', sqlLib.NVarChar(20), toNullIfEmpty(req.body.currentAddressZip))
        .input('country', sqlLib.NVarChar(100), null)
        .input('years_at_address', sqlLib.Int, toInt(req.body.currentAddressYears))
        .input('months_at_address', sqlLib.Int, toInt(req.body.currentAddressMonths))
        .input('housing_type', sqlLib.NVarChar(40), currHousing)
        .input('monthly_rent_amount', sqlLib.Decimal(19,2), toDecimal(req.body.currentAddressRent))
        .query(`INSERT INTO dbo.borrower_addresses (borrower_id, address_type, street, unit, city, state, zip, country, years_at_address, months_at_address, housing_type, monthly_rent_amount) VALUES (@borrower_id, @address_type, @street, @unit, @city, @state, @zip, @country, @years_at_address, @months_at_address, @housing_type, @monthly_rent_amount)`);
    }
    if (borrowerId && parseBool(req.body.hasFormerAddress)) {
      await new sqlLib.Request(t)
        .input('borrower_id', sqlLib.BigInt, borrowerId)
        .input('address_type', sqlLib.NVarChar(20), 'Former')
        .input('street', sqlLib.NVarChar(255), toNullIfEmpty(req.body.formerAddressStreet))
        .input('unit', sqlLib.NVarChar(50), null)
        .input('city', sqlLib.NVarChar(100), toNullIfEmpty(req.body.formerAddressCity))
        .input('state', sqlLib.NVarChar(50), toNullIfEmpty(req.body.formerAddressState))
        .input('zip', sqlLib.NVarChar(20), toNullIfEmpty(req.body.formerAddressZip))
        .input('country', sqlLib.NVarChar(100), null)
        .input('years_at_address', sqlLib.Int, toInt(req.body.formerAddressYears))
        .input('months_at_address', sqlLib.Int, toInt(req.body.formerAddressMonths))
        .input('housing_type', sqlLib.NVarChar(40), mapHousingType(req.body.formerAddressHousing))
        .input('monthly_rent_amount', sqlLib.Decimal(19,2), toDecimal(req.body.formerAddressRent))
        .query(`INSERT INTO dbo.borrower_addresses (borrower_id, address_type, street, unit, city, state, zip, country, years_at_address, months_at_address, housing_type, monthly_rent_amount) VALUES (@borrower_id, @address_type, @street, @unit, @city, @state, @zip, @country, @years_at_address, @months_at_address, @housing_type, @monthly_rent_amount)`);
    }
    if (borrowerId && parseBool(req.body.hasMailingAddress)) {
      await new sqlLib.Request(t)
        .input('borrower_id', sqlLib.BigInt, borrowerId)
        .input('address_type', sqlLib.NVarChar(20), 'Mailing')
        .input('street', sqlLib.NVarChar(255), toNullIfEmpty(req.body.mailingAddressStreet))
        .input('unit', sqlLib.NVarChar(50), null)
        .input('city', sqlLib.NVarChar(100), toNullIfEmpty(req.body.mailingAddressCity))
        .input('state', sqlLib.NVarChar(50), toNullIfEmpty(req.body.mailingAddressState))
        .input('zip', sqlLib.NVarChar(20), toNullIfEmpty(req.body.mailingAddressZip))
        .input('country', sqlLib.NVarChar(100), null)
        .input('years_at_address', sqlLib.Int, null)
        .input('months_at_address', sqlLib.Int, null)
        .input('housing_type', sqlLib.NVarChar(40), null)
        .input('monthly_rent_amount', sqlLib.Decimal(19,2), null)
        .query(`INSERT INTO dbo.borrower_addresses (borrower_id, address_type, street, unit, city, state, zip, country, years_at_address, months_at_address, housing_type, monthly_rent_amount) VALUES (@borrower_id, @address_type, @street, @unit, @city, @state, @zip, @country, @years_at_address, @months_at_address, @housing_type, @monthly_rent_amount)`);
    }

    // Current Employment
    if (borrowerId && parseBool(req.body.hasCurrentEmployment)) {
      const curEmpRes = await new sqlLib.Request(t)
        .input('borrower_id', sqlLib.BigInt, borrowerId)
        .input('employment_category', sqlLib.NVarChar(20), 'Current')
        .input('employer_name', sqlLib.NVarChar(255), toNullIfEmpty(req.body.employerName))
        .input('phone', sqlLib.NVarChar(25), toNullIfEmpty(req.body.employerPhone))
        .input('street', sqlLib.NVarChar(255), toNullIfEmpty(req.body.employerStreet))
        .input('unit', sqlLib.NVarChar(50), toNullIfEmpty(req.body.employerUnit))
        .input('city', sqlLib.NVarChar(100), toNullIfEmpty(req.body.employerCity))
        .input('state', sqlLib.NVarChar(50), toNullIfEmpty(req.body.employerState))
        .input('zip', sqlLib.NVarChar(20), toNullIfEmpty(req.body.employerZip))
        .input('country', sqlLib.NVarChar(100), toNullIfEmpty(req.body.employerCountry))
        .input('position_title', sqlLib.NVarChar(100), toNullIfEmpty(req.body.positionTitle))
        .input('start_date', sqlLib.Date, safeDate(req.body.startDate))
        .input('end_date', sqlLib.Date, null)
        .input('business_owner_or_self_employed', sqlLib.Bit, null)
        .input('ownership_share_percent', sqlLib.Decimal(5,2), parseOwnershipPercent(req.body.ownershipShare))
        .input('family_employee_flag', sqlLib.Bit, parseBool(req.body.isFamilyEmployee) || false)
        .input('line_of_work_years', sqlLib.Int, toInt(req.body.lineOfWorkYears))
        .input('line_of_work_months', sqlLib.Int, toInt(req.body.lineOfWorkMonths))
        .query(`
          INSERT INTO dbo.borrower_employments (
            borrower_id, employment_category, employer_name, phone, street, unit, city, state, zip, country,
            position_title, start_date, end_date, business_owner_or_self_employed, ownership_share_percent,
            family_employee_flag, line_of_work_years, line_of_work_months
          ) OUTPUT INSERTED.id AS id
          VALUES (
            @borrower_id, @employment_category, @employer_name, @phone, @street, @unit, @city, @state, @zip, @country,
            @position_title, @start_date, @end_date, @business_owner_or_self_employed, @ownership_share_percent,
            @family_employee_flag, @line_of_work_years, @line_of_work_months
          )
        `);
      const empId = curEmpRes.recordset[0].id;
      const breakdowns = [
        { t: 'Base', a: toDecimal(req.body.baseIncome) },
        { t: 'Overtime', a: toDecimal(req.body.overtimeIncome) },
        { t: 'Bonus', a: toDecimal(req.body.bonusIncome) },
        { t: 'Commission', a: toDecimal(req.body.commissionIncome) },
        { t: 'MilitaryEntitlements', a: toDecimal(req.body.militaryEntitlements) },
        { t: 'Other', a: toDecimal(req.body.otherIncome) },
      ];
      for (const b of breakdowns) {
        if (b.a !== null) {
          await new sqlLib.Request(t)
            .input('employment_id', sqlLib.BigInt, empId)
            .input('income_type', sqlLib.NVarChar(40), b.t)
            .input('monthly_amount', sqlLib.Decimal(19,2), b.a)
            .input('note', sqlLib.NVarChar(255), null)
            .query('INSERT INTO dbo.employment_income_breakdown (employment_id, income_type, monthly_amount, note) VALUES (@employment_id, @income_type, @monthly_amount, @note)');
        }
      }
    }

    // Additional Employment 1
    if (borrowerId && parseBool(req.body.hasAdditionalEmployment) && (toNullIfEmpty(req.body.employerNameAdditional1) || toNullIfEmpty(req.body.employerCityAdditional1))) {
      const addRes = await new sqlLib.Request(t)
        .input('borrower_id', sqlLib.BigInt, borrowerId)
        .input('employment_category', sqlLib.NVarChar(20), 'Additional')
        .input('employer_name', sqlLib.NVarChar(255), toNullIfEmpty(req.body.employerNameAdditional1))
        .input('phone', sqlLib.NVarChar(25), toNullIfEmpty(req.body.employerPhoneAdditional1))
        .input('street', sqlLib.NVarChar(255), toNullIfEmpty(req.body.employerStreetAdditional1))
        .input('unit', sqlLib.NVarChar(50), toNullIfEmpty(req.body.employerUnitAdditional1))
        .input('city', sqlLib.NVarChar(100), toNullIfEmpty(req.body.employerCityAdditional1))
        .input('state', sqlLib.NVarChar(50), toNullIfEmpty(req.body.employerStateAdditional1))
        .input('zip', sqlLib.NVarChar(20), toNullIfEmpty(req.body.employerZipAdditional1))
        .input('country', sqlLib.NVarChar(100), toNullIfEmpty(req.body.employerCountryAdditional1))
        .input('position_title', sqlLib.NVarChar(100), toNullIfEmpty(req.body.positionTitleAdditional1))
        .input('start_date', sqlLib.Date, safeDate(req.body.startDateAdditional1))
        .input('end_date', sqlLib.Date, null)
        .input('business_owner_or_self_employed', sqlLib.Bit, null)
        .input('ownership_share_percent', sqlLib.Decimal(5,2), parseOwnershipPercent(req.body.ownershipShareAdditional1))
        .input('family_employee_flag', sqlLib.Bit, parseBool(req.body.isFamilyEmployeeAdditional1) || false)
        .input('line_of_work_years', sqlLib.Int, toInt(req.body.lineOfWorkYearsAdditional1))
        .input('line_of_work_months', sqlLib.Int, toInt(req.body.lineOfWorkMonthsAdditional1))
        .query(`
          INSERT INTO dbo.borrower_employments (
            borrower_id, employment_category, employer_name, phone, street, unit, city, state, zip, country,
            position_title, start_date, end_date, business_owner_or_self_employed, ownership_share_percent,
            family_employee_flag, line_of_work_years, line_of_work_months
          ) OUTPUT INSERTED.id AS id
          VALUES (
            @borrower_id, @employment_category, @employer_name, @phone, @street, @unit, @city, @state, @zip, @country,
            @position_title, @start_date, @end_date, @business_owner_or_self_employed, @ownership_share_percent,
            @family_employee_flag, @line_of_work_years, @line_of_work_months
          )
        `);
      const addEmpId = addRes.recordset[0].id;
      const addIncome = [
        { t: 'Base', a: toDecimal(req.body.baseIncomeAdditional1) },
        { t: 'Overtime', a: toDecimal(req.body.overtimeIncomeAdditional1) },
        { t: 'Bonus', a: toDecimal(req.body.bonusIncomeAdditional1) },
        { t: 'Commission', a: toDecimal(req.body.commissionIncomeAdditional1) },
        { t: 'MilitaryEntitlements', a: toDecimal(req.body.militaryEntitlementsAdditional1) },
        { t: 'Other', a: toDecimal(req.body.otherIncomeAdditional1) },
      ];
      for (const b of addIncome) {
        if (b.a !== null) {
          await new sqlLib.Request(t)
            .input('employment_id', sqlLib.BigInt, addEmpId)
            .input('income_type', sqlLib.NVarChar(40), b.t)
            .input('monthly_amount', sqlLib.Decimal(19,2), b.a)
            .input('note', sqlLib.NVarChar(255), null)
            .query('INSERT INTO dbo.employment_income_breakdown (employment_id, income_type, monthly_amount, note) VALUES (@employment_id, @income_type, @monthly_amount, @note)');
        }
      }
    }

    // Previous Employment (Additional2)
    if (borrowerId && parseBool(req.body.hasPreviousEmploymentAdditional2) && (toNullIfEmpty(req.body.employerNameAdditional2) || toNullIfEmpty(req.body.employerCityAdditional2))) {
      await new sqlLib.Request(t)
        .input('borrower_id', sqlLib.BigInt, borrowerId)
        .input('employment_category', sqlLib.NVarChar(20), 'Previous')
        .input('employer_name', sqlLib.NVarChar(255), toNullIfEmpty(req.body.employerNameAdditional2))
        .input('phone', sqlLib.NVarChar(25), null)
        .input('street', sqlLib.NVarChar(255), toNullIfEmpty(req.body.employerStreetAdditional2))
        .input('unit', sqlLib.NVarChar(50), toNullIfEmpty(req.body.employerUnitAdditional2))
        .input('city', sqlLib.NVarChar(100), toNullIfEmpty(req.body.employerCityAdditional2))
        .input('state', sqlLib.NVarChar(50), toNullIfEmpty(req.body.employerStateAdditional2))
        .input('zip', sqlLib.NVarChar(20), toNullIfEmpty(req.body.employerZipAdditional2))
        .input('country', sqlLib.NVarChar(100), toNullIfEmpty(req.body.employerCountryAdditional2))
        .input('position_title', sqlLib.NVarChar(100), toNullIfEmpty(req.body.positionTitleAdditional2))
        .input('start_date', sqlLib.Date, safeDate(req.body.startDateAdditional2))
        .input('end_date', sqlLib.Date, safeDate(req.body.endDateAdditional2))
        .input('business_owner_or_self_employed', sqlLib.Bit, parseBool(req.body.wasBusinessOwnerAdditional2) || false)
        .input('ownership_share_percent', sqlLib.Decimal(5,2), null)
        .input('family_employee_flag', sqlLib.Bit, null)
        .input('line_of_work_years', sqlLib.Int, null)
        .input('line_of_work_months', sqlLib.Int, null)
        .query(`
          INSERT INTO dbo.borrower_employments (
            borrower_id, employment_category, employer_name, phone, street, unit, city, state, zip, country,
            position_title, start_date, end_date, business_owner_or_self_employed, ownership_share_percent,
            family_employee_flag, line_of_work_years, line_of_work_months
          ) VALUES (
            @borrower_id, @employment_category, @employer_name, @phone, @street, @unit, @city, @state, @zip, @country,
            @position_title, @start_date, @end_date, @business_owner_or_self_employed, @ownership_share_percent,
            @family_employee_flag, @line_of_work_years, @line_of_work_months
          )
        `);
    }

    // Other Income (1e)
    if (borrowerId && parseBool(req.body.hasOtherIncome)) {
      const incomePairs = [
        { s: req.body.incomeSource1, a: req.body.monthlyIncome1 },
        { s: req.body.incomeSource2, a: req.body.monthlyIncome2 },
        { s: req.body.incomeSource3, a: req.body.monthlyIncome3 },
        { s: req.body.incomeSource4, a: req.body.monthlyIncome4 },
      ];
      for (const p of incomePairs) {
        const src = mapOtherIncomeSource(p.s);
        const amt = toDecimal(p.a);
        if (src && amt !== null) {
          await new sqlLib.Request(t)
            .input('borrower_id', sqlLib.BigInt, borrowerId)
            .input('income_source', sqlLib.NVarChar(50), src)
            .input('monthly_amount', sqlLib.Decimal(19,2), amt)
            .input('description', sqlLib.NVarChar(255), null)
            .query('INSERT INTO dbo.other_income (borrower_id, income_source, monthly_amount, description) VALUES (@borrower_id, @income_source, @monthly_amount, @description)');
        }
      }
    }

    // Asset Accounts (2a)
    const assetAccounts = [
      { type: req.body.accountType1, fi: req.body.financialInstitution1, num: req.body.accountNumber1, val: req.body.cashValue1 },
      { type: req.body.accountType2, fi: req.body.financialInstitution2, num: req.body.accountNumber2, val: req.body.cashValue2 },
      { type: req.body.accountType3, fi: req.body.financialInstitution3, num: req.body.accountNumber3, val: req.body.cashValue3 },
      { type: req.body.accountType4, fi: req.body.financialInstitution4, num: req.body.accountNumber4, val: req.body.cashValue4 },
      { type: req.body.accountType5, fi: req.body.financialInstitution5, num: req.body.accountNumber5, val: req.body.cashValue5 },
    ];
    if (borrowerId) for (const a of assetAccounts) {
      const tpe = toNullIfEmpty(a.type);
      const amt = toDecimal(a.val);
      if (tpe && amt !== null) {
        await new sqlLib.Request(t)
          .input('borrower_id', sqlLib.BigInt, borrowerId)
          .input('account_type', sqlLib.NVarChar(50), tpe)
          .input('financial_institution', sqlLib.NVarChar(255), toNullIfEmpty(a.fi))
          .input('account_number_masked', sqlLib.NVarChar(64), toNullIfEmpty(a.num))
          .input('cash_or_market_value_amount', sqlLib.Decimal(19,2), amt)
          .query('INSERT INTO dbo.asset_accounts (borrower_id, account_type, financial_institution, account_number_masked, cash_or_market_value_amount) VALUES (@borrower_id, @account_type, @financial_institution, @account_number_masked, @cash_or_market_value_amount)');
      }
    }

    // Other Assets & Credits (2b)
    if (borrowerId && parseBool(req.body.hasOtherAssets2b)) {
      const pairs = [
        { t: req.body.assetCreditType1, v: req.body.assetCreditValue1 },
        { t: req.body.assetCreditType2, v: req.body.assetCreditValue2 },
        { t: req.body.assetCreditType3, v: req.body.assetCreditValue3 },
        { t: req.body.assetCreditType4, v: req.body.assetCreditValue4 },
      ];
      for (const p of pairs) {
        const tpe = mapAssetCreditType(p.t);
        const val = toDecimal(p.v);
        if (tpe && val !== null) {
          await new sqlLib.Request(t)
            .input('borrower_id', sqlLib.BigInt, borrowerId)
            .input('category', sqlLib.NVarChar(10), 'Asset')
            .input('type', sqlLib.NVarChar(60), tpe)
            .input('value_amount', sqlLib.Decimal(19,2), val)
            .input('deposited_flag', sqlLib.Bit, null)
            .input('source', sqlLib.NVarChar(40), null)
            .query('INSERT INTO dbo.assets_credits_other (borrower_id, category, type, value_amount, deposited_flag, source) VALUES (@borrower_id, @category, @type, @value_amount, @deposited_flag, @source)');
        }
      }
    }

    // Liabilities (2c)
    if (borrowerId && parseBool(req.body.hasLiabilities2c)) {
      const liabilities = [
        { at: req.body.accountType2c1, cn: req.body.companyName2c1, an: req.body.accountNumber2c1, ub: req.body.unpaidBalance2c1, po: req.body.payOff2c1, mp: req.body.monthlyPayment2c1 },
        { at: req.body.accountType2c2, cn: req.body.companyName2c2, an: req.body.accountNumber2c2, ub: req.body.unpaidBalance2c2, po: req.body.payOff2c2, mp: req.body.monthlyPayment2c2 },
        { at: req.body.accountType2c3, cn: req.body.companyName2c3, an: req.body.accountNumber2c3, ub: req.body.unpaidBalance2c3, po: req.body.payOff2c3, mp: req.body.monthlyPayment2c3 },
        { at: req.body.accountType2c4, cn: req.body.companyName2c4, an: req.body.accountNumber2c4, ub: req.body.unpaidBalance2c4, po: req.body.payOff2c4, mp: req.body.monthlyPayment2c4 },
        { at: req.body.accountType2c5, cn: req.body.companyName2c5, an: req.body.accountNumber2c5, ub: req.body.unpaidBalance2c5, po: req.body.payOff2c5, mp: req.body.monthlyPayment2c5 },
      ];
      for (const li of liabilities) {
        const at = toNullIfEmpty(li.at);
        const ub = toDecimal(li.ub);
        const mp = toDecimal(li.mp);
        if (at && ub !== null && mp !== null) {
          await new sqlLib.Request(t)
            .input('borrower_id', sqlLib.BigInt, borrowerId)
            .input('account_type', sqlLib.NVarChar(20), at)
            .input('company_name', sqlLib.NVarChar(255), toNullIfEmpty(li.cn))
            .input('account_number_masked', sqlLib.NVarChar(64), toNullIfEmpty(li.an))
            .input('unpaid_balance_amount', sqlLib.Decimal(19,2), ub)
            .input('monthly_payment_amount', sqlLib.Decimal(19,2), mp)
            .input('payoff_at_or_before_closing_flag', sqlLib.Bit, parseBool(li.po) || false)
            .query('INSERT INTO dbo.liabilities (borrower_id, account_type, company_name, account_number_masked, unpaid_balance_amount, monthly_payment_amount, payoff_at_or_before_closing_flag) VALUES (@borrower_id, @account_type, @company_name, @account_number_masked, @unpaid_balance_amount, @monthly_payment_amount, @payoff_at_or_before_closing_flag)');
        }
      }
    }

    // Other Liabilities (2d)
    if (borrowerId && parseBool(req.body.hasOtherLiabilities2d)) {
      const ol = [
        { t: req.body.liabilityType2d1, m: req.body.monthlyPayment2d1 },
        { t: req.body.liabilityType2d2, m: req.body.monthlyPayment2d2 },
        { t: req.body.liabilityType2d3, m: req.body.monthlyPayment2d3 },
        { t: req.body.liabilityType2d4, m: req.body.monthlyPayment2d4 },
      ];
      for (const it of ol) {
        const tpe = toNullIfEmpty(it.t);
        const m = toDecimal(it.m);
        if (tpe && m !== null) {
          await new sqlLib.Request(t)
            .input('borrower_id', sqlLib.BigInt, borrowerId)
            .input('type', sqlLib.NVarChar(30), tpe)
            .input('monthly_payment_amount', sqlLib.Decimal(19,2), m)
            .input('description', sqlLib.NVarChar(255), null)
            .query('INSERT INTO dbo.other_liabilities_expenses (borrower_id, type, monthly_payment_amount, description) VALUES (@borrower_id, @type, @monthly_payment_amount, @description)');
        }
      }
    }

    // Real Estate Owned
    if (borrowerId && parseBool(req.body.hasRealEstate3)) {
      const props = [
        { s: req.body.propertyStreet1, c: req.body.propertyCity1, st: req.body.propertyState1, z: req.body.propertyZip1, v: req.body.propertyValue1, stt: req.body.propertyStatus1, occ: req.body.intendedOccupancy1, ins: req.body.monthlyInsurance1, rent: req.body.monthlyRentalIncome1, hasMort: req.body.hasMortgageLoans1, cred: req.body.creditorName1, acc: req.body.creditorAccount1, mp: req.body.mortgagePayment1, ub: req.body.unpaidBalance1, po: req.body.payOffMortgage1, mt: req.body.mortgageType1 },
        { s: req.body.propertyStreet2, c: req.body.propertyCity2, st: req.body.propertyState2, z: req.body.propertyZip2, v: req.body.propertyValue2, stt: req.body.propertyStatus2, occ: req.body.intendedOccupancy2, ins: req.body.monthlyInsurance2, rent: req.body.monthlyRentalIncome2, hasMort: req.body.hasMortgageLoans2, cred: req.body.creditorName2, acc: req.body.creditorAccount2, mp: req.body.mortgagePayment2, ub: req.body.unpaidBalance2, po: req.body.payOffMortgage2, mt: req.body.mortgageType2 },
        { s: req.body.propertyStreet3, c: req.body.propertyCity3, st: req.body.propertyState3, z: req.body.propertyZip3, v: req.body.propertyValue3, stt: req.body.propertyStatus3, occ: req.body.intendedOccupancy3, ins: req.body.monthlyInsurance3, rent: req.body.monthlyRentalIncome3, hasMort: req.body.hasMortgageLoans3, cred: req.body.creditorName3, acc: req.body.creditorAccount3, mp: req.body.mortgagePayment3, ub: req.body.unpaidBalance3, po: req.body.payOffMortgage3, mt: req.body.mortgageType3 },
      ];
      for (const p of props) {
        if (toNullIfEmpty(p.s) || toNullIfEmpty(p.c) || toNullIfEmpty(p.st) || toNullIfEmpty(p.z) || toDecimal(p.v) !== null) {
          const pr = await new sqlLib.Request(t)
            .input('borrower_id', sqlLib.BigInt, borrowerId)
            .input('street', sqlLib.NVarChar(255), toNullIfEmpty(p.s))
            .input('unit', sqlLib.NVarChar(50), null)
            .input('city', sqlLib.NVarChar(100), toNullIfEmpty(p.c))
            .input('state', sqlLib.NVarChar(50), toNullIfEmpty(p.st))
            .input('zip', sqlLib.NVarChar(20), toNullIfEmpty(p.z))
            .input('country', sqlLib.NVarChar(100), null)
            .input('property_value_amount', sqlLib.Decimal(19,2), toDecimal(p.v))
            .input('status', sqlLib.NVarChar(20), mapPropertyStatus(p.stt))
            .input('intended_occupancy', sqlLib.NVarChar(20), mapOccupancy(p.occ))
            .input('monthly_ins_taxes_hoa_amount', sqlLib.Decimal(19,2), toDecimal(p.ins))
            .input('monthly_rental_income_amount', sqlLib.Decimal(19,2), toDecimal(p.rent))
            .input('net_monthly_rental_income_amount', sqlLib.Decimal(19,2), toDecimal(p.rent))
            .query(`
              INSERT INTO dbo.properties_owned (
                borrower_id, street, unit, city, state, zip, country, property_value_amount, status,
                intended_occupancy, monthly_ins_taxes_hoa_amount, monthly_rental_income_amount, net_monthly_rental_income_amount
              ) OUTPUT INSERTED.id AS id
              VALUES (
                @borrower_id, @street, @unit, @city, @state, @zip, @country, @property_value_amount, @status,
                @intended_occupancy, @monthly_ins_taxes_hoa_amount, @monthly_rental_income_amount, @net_monthly_rental_income_amount
              )
            `);
          const propertyId = pr.recordset[0].id;
          if (parseBool(p.hasMort) && (toNullIfEmpty(p.cred) || toNullIfEmpty(p.acc))) {
            await new sqlLib.Request(t)
              .input('property_id', sqlLib.BigInt, propertyId)
              .input('creditor_name', sqlLib.NVarChar(255), toNullIfEmpty(p.cred))
              .input('account_number_masked', sqlLib.NVarChar(64), toNullIfEmpty(p.acc))
              .input('monthly_mortgage_payment_amount', sqlLib.Decimal(19,2), toDecimal(p.mp))
              .input('unpaid_balance_amount', sqlLib.Decimal(19,2), toDecimal(p.ub))
              .input('payoff_at_or_before_closing_flag', sqlLib.Bit, parseBool(p.po) || false)
              .input('mortgage_type', sqlLib.NVarChar(20), toNullIfEmpty(p.mt))
              .input('credit_limit_amount', sqlLib.Decimal(19,2), null)
              .query('INSERT INTO dbo.property_mortgages (property_id, creditor_name, account_number_masked, monthly_mortgage_payment_amount, unpaid_balance_amount, payoff_at_or_before_closing_flag, mortgage_type, credit_limit_amount) VALUES (@property_id, @creditor_name, @account_number_masked, @monthly_mortgage_payment_amount, @unpaid_balance_amount, @payoff_at_or_before_closing_flag, @mortgage_type, @credit_limit_amount)');
          }
        }
      }
    }

    // Subject Property (4)
    const loanAmount4 = toDecimal(req.body.loanAmount4);
    const occupancy4 = mapOccupancy(req.body.occupancy4);
    let subjectPropertyId = null;
    if (loanAmount4 !== null || toNullIfEmpty(req.body.propertyStreet4) || toNullIfEmpty(req.body.propertyCity4)) {
      const sp = await new sqlLib.Request(t)
        .input('application_id', sqlLib.BigInt, applicationId)
        .input('loan_amount_amount', sqlLib.Decimal(19,2), loanAmount4)
        .input('loan_purpose', sqlLib.NVarChar(20), mapLoanPurpose(req.body.loanPurpose4 || req.body.loanPurpose))
        .input('street', sqlLib.NVarChar(255), toNullIfEmpty(req.body.propertyStreet4))
        .input('unit', sqlLib.NVarChar(50), toNullIfEmpty(req.body.propertyUnit4))
        .input('city', sqlLib.NVarChar(100), toNullIfEmpty(req.body.propertyCity4))
        .input('state', sqlLib.NVarChar(50), toNullIfEmpty(req.body.propertyState4))
        .input('zip', sqlLib.NVarChar(20), toNullIfEmpty(req.body.propertyZip4))
        .input('county', sqlLib.NVarChar(100), toNullIfEmpty(req.body.propertyCounty4))
        .input('number_of_units', sqlLib.Int, toInt(req.body.numberOfUnits4))
        .input('property_value_amount', sqlLib.Decimal(19,2), toDecimal(req.body.propertyValue4))
        .input('occupancy_intent', sqlLib.NVarChar(20), occupancy4)
        .input('fha_secondary_residence_flag', sqlLib.Bit, parseBool(req.body.fhaSecondaryResidence4) || false)
        .input('mixed_use_flag', sqlLib.Bit, parseBool(req.body.mixedUse4) || false)
        .input('manufactured_home_flag', sqlLib.Bit, parseBool(req.body.manufacturedHome4) || false)
        .query(`
          INSERT INTO dbo.subject_property (
            application_id, loan_amount_amount, loan_purpose, street, unit, city, state, zip, county, number_of_units,
            property_value_amount, occupancy_intent, fha_secondary_residence_flag, mixed_use_flag, manufactured_home_flag
          ) OUTPUT INSERTED.id AS id
          VALUES (
            @application_id, @loan_amount_amount, @loan_purpose, @street, @unit, @city, @state, @zip, @county, @number_of_units,
            @property_value_amount, @occupancy_intent, @fha_secondary_residence_flag, @mixed_use_flag, @manufactured_home_flag
          )
        `);
      subjectPropertyId = sp.recordset[0].id;

      // New mortgages (4b)
      if (parseBool(req.body.hasNewMortgages4b)) {
        const nms = [
          { c: req.body.creditorName4b1, l: req.body.lienType4b1, p: req.body.monthlyPayment4b1, a: req.body.loanAmount4b1, cl: req.body.creditLimit4b1 },
          { c: req.body.creditorName4b2, l: req.body.lienType4b2, p: req.body.monthlyPayment4b2, a: req.body.loanAmount4b2, cl: req.body.creditLimit4b2 },
        ];
        for (const m of nms) {
          if (toNullIfEmpty(m.c) || toDecimal(m.a) !== null) {
            await new sqlLib.Request(t)
              .input('subject_property_id', sqlLib.BigInt, subjectPropertyId)
              .input('creditor_name', sqlLib.NVarChar(255), toNullIfEmpty(m.c))
              .input('lien_type', sqlLib.NVarChar(20), mapLienType(m.l))
              .input('monthly_payment_amount', sqlLib.Decimal(19,2), toDecimal(m.p))
              .input('loan_amount_or_amount_to_be_drawn', sqlLib.Decimal(19,2), toDecimal(m.a))
              .input('credit_limit_amount', sqlLib.Decimal(19,2), toDecimal(m.cl))
              .query('INSERT INTO dbo.subject_new_mortgages (subject_property_id, creditor_name, lien_type, monthly_payment_amount, loan_amount_or_amount_to_be_drawn, credit_limit_amount) VALUES (@subject_property_id, @creditor_name, @lien_type, @monthly_payment_amount, @loan_amount_or_amount_to_be_drawn, @credit_limit_amount)');
          }
        }
      }

      // Rental (4c)
      if (parseBool(req.body.hasRentalIncome4c) && (toDecimal(req.body.expectedRentalIncome4c) !== null || toDecimal(req.body.netRentalIncome4c) !== null)) {
        await new sqlLib.Request(t)
          .input('subject_property_id', sqlLib.BigInt, subjectPropertyId)
          .input('expected_monthly_rental_income_amount', sqlLib.Decimal(19,2), toDecimal(req.body.expectedRentalIncome4c))
          .input('expected_net_monthly_rental_income_amount', sqlLib.Decimal(19,2), toDecimal(req.body.netRentalIncome4c))
          .query('INSERT INTO dbo.subject_property_rental (subject_property_id, expected_monthly_rental_income_amount, expected_net_monthly_rental_income_amount) VALUES (@subject_property_id, @expected_monthly_rental_income_amount, @expected_net_monthly_rental_income_amount)');
      }

      // Gifts/Grants (4d)
      if (parseBool(req.body.hasGiftsGrants4d)) {
        const ggs = [
          { at: req.body.giftAssetType4d1, d: req.body.deposited4d1, s: req.body.giftSource4d1, v: req.body.giftValue4d1 },
          { at: req.body.giftAssetType4d2, d: req.body.deposited4d2, s: req.body.giftSource4d2, v: req.body.giftValue4d2 },
        ];
        for (const g of ggs) {
          const at = mapGiftAssetType(g.at);
          const dep = parseBool(g.d) || false;
          const src = mapGiftSource(g.s);
          const val = toDecimal(g.v);
          if (at && val !== null) {
            await new sqlLib.Request(t)
              .input('application_id', sqlLib.BigInt, applicationId)
              .input('asset_type', sqlLib.NVarChar(20), at)
              .input('deposited_flag', sqlLib.Bit, dep)
              .input('source', sqlLib.NVarChar(40), src)
              .input('value_amount', sqlLib.Decimal(19,2), val)
              .query('INSERT INTO dbo.gifts_grants (application_id, asset_type, deposited_flag, source, value_amount) VALUES (@application_id, @asset_type, @deposited_flag, @source, @value_amount)');
          }
        }
      }
    }

    // Declarations (5)
    const bankruptCh = [
      parseBool(req.body.bankruptChapter7) ? '7' : null,
      parseBool(req.body.bankruptChapter11) ? '11' : null,
      parseBool(req.body.bankruptChapter12) ? '12' : null,
      parseBool(req.body.bankruptChapter13) ? '13' : null,
    ].filter(Boolean).join(',') || null;
    if (borrowerId) await new sqlLib.Request(t)
      .input('borrower_id', sqlLib.BigInt, borrowerId)
      .input('will_occupy_subject_as_primary', sqlLib.Bit, parseBool(req.body.primaryResidence5a) || false)
      .input('had_ownership_interest_last_3yrs', sqlLib.Bit, parseBool(req.body.ownershipInterest5a) || false)
      .input('prior_property_type', sqlLib.NVarChar(2), toNullIfEmpty(req.body.propertyType5a))
      .input('prior_title_holding', sqlLib.NVarChar(2), toNullIfEmpty(req.body.titleHeld5a))
      .input('family_or_business_affiliation_with_seller', sqlLib.Bit, parseBool(req.body.familyRelationship5a) || false)
      .input('undisclosed_borrowed_funds_amount', sqlLib.Decimal(19,2), toDecimal(req.body.borrowedAmount5a))
      .input('new_mortgage_on_other_property_pending', sqlLib.Bit, parseBool(req.body.anotherMortgage5a) || false)
      .input('new_credit_pending', sqlLib.Bit, parseBool(req.body.newCredit5a) || false)
      .input('priority_lien_expected', sqlLib.Bit, parseBool(req.body.priorityLien5a) || false)
      .input('cosigner_or_guarantor_on_other_debt', sqlLib.Bit, parseBool(req.body.coSignerGuarantor5b) || false)
      .input('outstanding_judgments', sqlLib.Bit, parseBool(req.body.judgments5b) || false)
      .input('delinquent_or_default_on_federal_debt', sqlLib.Bit, parseBool(req.body.delinquentFederalDebt5b) || false)
      .input('party_to_lawsuit', sqlLib.Bit, parseBool(req.body.lawsuitLiability5b) || false)
      .input('deed_in_lieu_last_7yrs', sqlLib.Bit, parseBool(req.body.conveyTitleInLieu5b) || false)
      .input('preforeclosure_or_short_sale_last_7yrs', sqlLib.Bit, parseBool(req.body.preforeclosureSale5b) || false)
      .input('foreclosure_last_7yrs', sqlLib.Bit, parseBool(req.body.foreclosedProperty5b) || false)
      .input('bankruptcy_last_7yrs', sqlLib.Bit, parseBool(req.body.declaredBankruptcy5b) || false)
      .input('bankruptcy_chapters', sqlLib.NVarChar(50), bankruptCh)
      .query(`INSERT INTO dbo.borrower_declarations (
        borrower_id, will_occupy_subject_as_primary, had_ownership_interest_last_3yrs, prior_property_type, prior_title_holding,
        family_or_business_affiliation_with_seller, undisclosed_borrowed_funds_amount, new_mortgage_on_other_property_pending, new_credit_pending, priority_lien_expected,
        cosigner_or_guarantor_on_other_debt, outstanding_judgments, delinquent_or_default_on_federal_debt, party_to_lawsuit, deed_in_lieu_last_7yrs,
        preforeclosure_or_short_sale_last_7yrs, foreclosure_last_7yrs, bankruptcy_last_7yrs, bankruptcy_chapters
      ) VALUES (
        @borrower_id, @will_occupy_subject_as_primary, @had_ownership_interest_last_3yrs, @prior_property_type, @prior_title_holding,
        @family_or_business_affiliation_with_seller, @undisclosed_borrowed_funds_amount, @new_mortgage_on_other_property_pending, @new_credit_pending, @priority_lien_expected,
        @cosigner_or_guarantor_on_other_debt, @outstanding_judgments, @delinquent_or_default_on_federal_debt, @party_to_lawsuit, @deed_in_lieu_last_7yrs,
        @preforeclosure_or_short_sale_last_7yrs, @foreclosure_last_7yrs, @bankruptcy_last_7yrs, @bankruptcy_chapters
      )`);

    // Military Service (7)
    if (borrowerId && (parseBool(req.body.hasMilitaryService7) || parseBool(req.body.isCurrentlyActiveDuty7) || parseBool(req.body.isRetiredDischarged7) || parseBool(req.body.isReserveOrGuard7) || parseBool(req.body.isSurvivingSpouse7))) {
      await new sqlLib.Request(t)
        .input('borrower_id', sqlLib.BigInt, borrowerId)
        .input('has_military_service', sqlLib.Bit, parseBool(req.body.hasMilitaryService7) || false)
        .input('currently_active_duty', sqlLib.Bit, parseBool(req.body.isCurrentlyActiveDuty7) || false)
        .input('projected_expiration_date', sqlLib.Date, safeDate(req.body.projectedExpirationDate7))
        .input('currently_retired_discharged', sqlLib.Bit, parseBool(req.body.isRetiredDischarged7) || false)
        .input('reserve_or_guard', sqlLib.Bit, parseBool(req.body.isReserveOrGuard7) || false)
        .input('surviving_spouse', sqlLib.Bit, parseBool(req.body.isSurvivingSpouse7) || false)
        .query('INSERT INTO dbo.borrower_military_service (borrower_id, has_military_service, currently_active_duty, projected_expiration_date, currently_retired_discharged, reserve_or_guard, surviving_spouse) VALUES (@borrower_id, @has_military_service, @currently_active_duty, @projected_expiration_date, @currently_retired_discharged, @reserve_or_guard, @surviving_spouse)');
    }

    // Demographics (8)
    const sex8 = mapSex(req.body.sex8);
    if (borrowerId && (sex8 || parseBool(req.body.ethHispanicLatino8) || parseBool(req.body.ethNotHispanic8) || parseBool(req.body.ethNoInfo8) || parseBool(req.body.raceAmericanIndian8) || parseBool(req.body.raceAsian8) || parseBool(req.body.raceBlack8) || parseBool(req.body.raceHawaiian8) || parseBool(req.body.raceWhite8) || parseBool(req.body.raceNoInfo8))) {
      await new sqlLib.Request(t)
        .input('borrower_id', sqlLib.BigInt, borrowerId)
        .input('sex', sqlLib.NVarChar(25), sex8)
        .input('provided_via', sqlLib.NVarChar(20), 'EmailInternet')
        .input('cboe_eth', sqlLib.Bit, false)
        .input('cboe_sex', sqlLib.Bit, false)
        .input('cboe_race', sqlLib.Bit, false)
        .query('INSERT INTO dbo.borrower_demographics (borrower_id, sex, provided_via, collected_by_visual_observation_or_surname_ethnicity, collected_by_visual_observation_or_surname_sex, collected_by_visual_observation_or_surname_race) VALUES (@borrower_id, @sex, @provided_via, @cboe_eth, @cboe_sex, @cboe_race)');

      let ethnicityVal = null;
      if (parseBool(req.body.ethHispanicLatino8)) ethnicityVal = 'HispanicOrLatino';
      else if (parseBool(req.body.ethNotHispanic8)) ethnicityVal = 'NotHispanicOrLatino';
      else if (parseBool(req.body.ethNoInfo8)) ethnicityVal = 'PreferNotToProvide';
      if (ethnicityVal) {
        await new sqlLib.Request(t)
          .input('borrower_id', sqlLib.BigInt, borrowerId)
          .input('ethnicity', sqlLib.NVarChar(30), ethnicityVal)
          .input('other_origin_print', sqlLib.NVarChar(255), toNullIfEmpty(req.body.ethOtherHispanicOrigin8))
          .query('INSERT INTO dbo.borrower_ethnicity_selections (borrower_id, ethnicity, other_origin_print) VALUES (@borrower_id, @ethnicity, @other_origin_print)');
      }

      const ethDetails = [];
      if (parseBool(req.body.ethMexican8)) ethDetails.push('Mexican');
      if (parseBool(req.body.ethPuertoRican8)) ethDetails.push('PuertoRican');
      if (parseBool(req.body.ethCuban8)) ethDetails.push('Cuban');
      if (parseBool(req.body.ethOtherHispanic8)) ethDetails.push('OtherHispanicOrLatino');
      for (const d of ethDetails) {
        await new sqlLib.Request(t)
          .input('borrower_id', sqlLib.BigInt, borrowerId)
          .input('ethnicity_detail', sqlLib.NVarChar(40), d)
          .input('other_origin_print', sqlLib.NVarChar(255), d === 'OtherHispanicOrLatino' ? toNullIfEmpty(req.body.ethOtherHispanicOrigin8) : null)
          .query('INSERT INTO dbo.borrower_ethnicity_detail_selections (borrower_id, ethnicity_detail, other_origin_print) VALUES (@borrower_id, @ethnicity_detail, @other_origin_print)');
      }

      const raceSelections = [];
      if (parseBool(req.body.raceAmericanIndian8)) raceSelections.push('AmericanIndianOrAlaskaNative');
      if (parseBool(req.body.raceAsian8)) raceSelections.push('Asian');
      if (parseBool(req.body.raceBlack8)) raceSelections.push('BlackOrAfricanAmerican');
      if (parseBool(req.body.raceHawaiian8)) raceSelections.push('NativeHawaiianOrOtherPacificIslander');
      if (parseBool(req.body.raceWhite8)) raceSelections.push('White');
      if (parseBool(req.body.raceNoInfo8)) raceSelections.push('PreferNotToProvide');
      for (const r of raceSelections) {
        await new sqlLib.Request(t)
          .input('borrower_id', sqlLib.BigInt, borrowerId)
          .input('race', sqlLib.NVarChar(40), r)
          .input('tribe_or_printed_origin', sqlLib.NVarChar(255), r === 'AmericanIndianOrAlaskaNative' ? toNullIfEmpty(req.body.americanIndianTribe8) : (r === 'NativeHawaiianOrOtherPacificIslander' ? toNullIfEmpty(req.body.otherPacIslanderPrint8) : null))
          .query('INSERT INTO dbo.borrower_race_selections (borrower_id, race, tribe_or_printed_origin) VALUES (@borrower_id, @race, @tribe_or_printed_origin)');
      }

      if (parseBool(req.body.raceAsian8) && toNullIfEmpty(req.body.otherAsianPrint8)) {
        await new sqlLib.Request(t)
          .input('borrower_id', sqlLib.BigInt, borrowerId)
          .input('race_detail', sqlLib.NVarChar(50), 'OtherAsian')
          .input('other_print', sqlLib.NVarChar(255), toNullIfEmpty(req.body.otherAsianPrint8))
          .query('INSERT INTO dbo.borrower_race_detail_selections (borrower_id, race_detail, other_print) VALUES (@borrower_id, @race_detail, @other_print)');
      }

      if (parseBool(req.body.raceAmericanIndian8) && toNullIfEmpty(req.body.americanIndianTribe8)) {
        const tribes = String(req.body.americanIndianTribe8).split(',').map(s => s.trim()).filter(Boolean);
        for (const tname of tribes) {
          await new sqlLib.Request(t)
            .input('borrower_id', sqlLib.BigInt, borrowerId)
            .input('tribe_name', sqlLib.NVarChar(255), tname)
            .query('INSERT INTO dbo.borrower_american_indian_tribes (borrower_id, tribe_name) VALUES (@borrower_id, @tribe_name)');
        }
      }
    }

    await t.commit();
    return applicationId;
  } catch (err) {
    try { await t.rollback(); } catch (e) {}
    throw err;
  }
}

module.exports = router;

