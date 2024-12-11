const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/liability_docs/' }); // Adjust storage as needed
const sql = require('mssql');

router.post('/saveLiabilityVerification', upload.fields([
  { name: 'creditCardStatements', maxCount: 10 },
  { name: 'autoLoanStatements', maxCount: 10 },
  { name: 'studentLoanStatements', maxCount: 10 },
  { name: 'mortgageStatement', maxCount: 10 }
]), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;

  const newStatus = req.body.newStatus || 'Not Started';

  const creditUploaded = (req.files['creditCardStatements'] && req.files['creditCardStatements'].length > 0) ? 1 : 0;
  const autoUploaded = (req.files['autoLoanStatements'] && req.files['autoLoanStatements'].length > 0) ? 1 : 0;
  const studentUploaded = (req.files['studentLoanStatements'] && req.files['studentLoanStatements'].length > 0) ? 1 : 0;
  const mortgageUploaded = (req.files['mortgageStatement'] && req.files['mortgageStatement'].length > 0) ? 1 : 0;

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM LiabilityVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    if (existingRecord.recordset.length > 0) {
      const current = existingRecord.recordset[0];
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('CreditCardStatementsUploaded', sql.Bit, creditUploaded ? 1 : current.CreditCardStatementsUploaded)
        .input('AutoLoanStatementsUploaded', sql.Bit, autoUploaded ? 1 : current.AutoLoanStatementsUploaded)
        .input('StudentLoanStatementsUploaded', sql.Bit, studentUploaded ? 1 : current.StudentLoanStatementsUploaded)
        .input('MortgageStatementUploaded', sql.Bit, mortgageUploaded ? 1 : current.MortgageStatementUploaded)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE LiabilityVerificationDocuments
          SET CreditCardStatementsUploaded=@CreditCardStatementsUploaded,
              AutoLoanStatementsUploaded=@AutoLoanStatementsUploaded,
              StudentLoanStatementsUploaded=@StudentLoanStatementsUploaded,
              MortgageStatementUploaded=@MortgageStatementUploaded,
              ApplicationStatus=@ApplicationStatus,
              UpdatedAt=SYSUTCDATETIME()
          WHERE UserID=@UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('CreditCardStatementsUploaded', sql.Bit, creditUploaded)
        .input('AutoLoanStatementsUploaded', sql.Bit, autoUploaded)
        .input('StudentLoanStatementsUploaded', sql.Bit, studentUploaded)
        .input('MortgageStatementUploaded', sql.Bit, mortgageUploaded)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO LiabilityVerificationDocuments 
          (UserID, CreditCardStatementsUploaded, AutoLoanStatementsUploaded, StudentLoanStatementsUploaded, MortgageStatementUploaded, ApplicationStatus)
          VALUES (@UserID, @CreditCardStatementsUploaded, @AutoLoanStatementsUploaded, @StudentLoanStatementsUploaded, @MortgageStatementUploaded, @ApplicationStatus)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving liability verification documents:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
