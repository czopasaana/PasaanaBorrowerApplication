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

  // Extract fields from req.body
  const borrowerFirstName = toNullIfEmpty(req.body.borrowerFirstName);
  const borrowerLastName = toNullIfEmpty(req.body.borrowerLastName);
  const borrowerSSN = toNullIfEmpty(req.body.borrowerSSN);
  const borrowerDOB = toNullIfEmpty(req.body.borrowerDOB);
  const employerName = toNullIfEmpty(req.body.employerName);
  const annualIncome = toDecimal(req.body.annualIncome);
  const checkingAccounts = toDecimal(req.body.checkingAccounts);
  const creditCardDebt = toDecimal(req.body.creditCardDebt);
  const propertyAddress = toNullIfEmpty(req.body.propertyAddress);
  const propertyValue = toDecimal(req.body.propertyValue);
  const loanPurpose = toNullIfEmpty(req.body.loanPurpose);
  const loanTerm = toInt(req.body.loanTerm);
  const loanType = toNullIfEmpty(req.body.loanType);
  const rateLock = toNullIfEmpty(req.body.rateLock);

  // Extract employmentType from req.body and allow null
  const employmentType = toNullIfEmpty(req.body.employmentType);

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT TOP 1 * FROM LoanApplications 
        WHERE UserID = @UserID 
        ORDER BY CreatedAt DESC
      `);

    const newStatus = req.body.newStatus || 'Not Started';

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('FirstName', sql.NVarChar(100), borrowerFirstName)
        .input('LastName', sql.NVarChar(100), borrowerLastName)
        .input('SSN', sql.NVarChar(20), borrowerSSN)
        .input('DOB', sql.Date, borrowerDOB)
        .input('EmployerName', sql.NVarChar(255), employerName)
        .input('AnnualIncome', sql.Decimal(18,2), annualIncome)
        .input('CheckingAccounts', sql.Decimal(18,2), checkingAccounts)
        .input('CreditCardDebt', sql.Decimal(18,2), creditCardDebt)
        .input('PropertyAddress', sql.NVarChar(500), propertyAddress)
        .input('PropertyValue', sql.Decimal(18,2), propertyValue)
        .input('LoanPurpose', sql.NVarChar(50), loanPurpose)
        .input('LoanTerm', sql.Int, loanTerm)
        .input('LoanType', sql.NVarChar(50), loanType)
        .input('RateLock', sql.NVarChar(50), rateLock)
        .input('EmploymentType', sql.NVarChar(50), employmentType)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE LoanApplications
          SET BorrowerFirstName=@FirstName, BorrowerLastName=@LastName, BorrowerSSN=@SSN,
              BorrowerDOB=@DOB, EmployerName=@EmployerName, AnnualIncome=@AnnualIncome,
              CheckingAccounts=@CheckingAccounts, CreditCardDebt=@CreditCardDebt,
              PropertyAddress=@PropertyAddress, PropertyValue=@PropertyValue,
              LoanPurpose=@LoanPurpose, LoanTerm=@LoanTerm, LoanType=@LoanType,
              RateLock=@RateLock, EmploymentType=@EmploymentType, ApplicationStatus=@ApplicationStatus, UpdatedAt=SYSUTCDATETIME()
          WHERE UserID=@UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('FirstName', sql.NVarChar(100), borrowerFirstName)
        .input('LastName', sql.NVarChar(100), borrowerLastName)
        .input('SSN', sql.NVarChar(20), borrowerSSN)
        .input('DOB', sql.Date, borrowerDOB)
        .input('EmployerName', sql.NVarChar(255), employerName)
        .input('AnnualIncome', sql.Decimal(18,2), annualIncome)
        .input('CheckingAccounts', sql.Decimal(18,2), checkingAccounts)
        .input('CreditCardDebt', sql.Decimal(18,2), creditCardDebt)
        .input('PropertyAddress', sql.NVarChar(500), propertyAddress)
        .input('PropertyValue', sql.Decimal(18,2), propertyValue)
        .input('LoanPurpose', sql.NVarChar(50), loanPurpose)
        .input('LoanTerm', sql.Int, loanTerm)
        .input('LoanType', sql.NVarChar(50), loanType)
        .input('RateLock', sql.NVarChar(50), rateLock)
        .input('EmploymentType', sql.NVarChar(50), employmentType)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO LoanApplications 
            (UserID, BorrowerFirstName, BorrowerLastName, BorrowerSSN, BorrowerDOB, EmployerName,
             AnnualIncome, CheckingAccounts, CreditCardDebt, PropertyAddress, PropertyValue,
             LoanPurpose, LoanTerm, LoanType, RateLock, EmploymentType, ApplicationStatus)
          VALUES 
            (@UserID, @FirstName, @LastName, @SSN, @DOB, @EmployerName, @AnnualIncome, 
             @CheckingAccounts, @CreditCardDebt, @PropertyAddress, @PropertyValue, 
             @LoanPurpose, @LoanTerm, @LoanType, @RateLock, @EmploymentType, @ApplicationStatus)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving loan application:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;

