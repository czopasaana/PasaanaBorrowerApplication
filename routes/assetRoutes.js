const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/asset_docs/' }); // Adjust storage as needed
const sql = require('mssql');

router.post('/saveAssetVerification', upload.fields([
  { name: 'bankStatements', maxCount: 10 },
  { name: 'investmentStatements', maxCount: 10 },
  { name: 'retirementStatements', maxCount: 10 }
]), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;

  const newStatus = req.body.newStatus || 'Not Started';

  // Check if user linked accounts
  const linkedAccount = req.body.linkedAccount === 'true' ? 1 : 0;

  // Check which files were uploaded
  const bankUploaded = (req.files['bankStatements'] && req.files['bankStatements'].length > 0) ? 1 : 0;
  const investUploaded = (req.files['investmentStatements'] && req.files['investmentStatements'].length > 0) ? 1 : 0;
  const retireUploaded = (req.files['retirementStatements'] && req.files['retirementStatements'].length > 0) ? 1 : 0;

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM AssetVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    if (existingRecord.recordset.length > 0) {
      const current = existingRecord.recordset[0];
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('BankStatementsUploaded', sql.Bit, bankUploaded ? 1 : current.BankStatementsUploaded)
        .input('InvestmentStatementsUploaded', sql.Bit, investUploaded ? 1 : current.InvestmentStatementsUploaded)
        .input('RetirementStatementsUploaded', sql.Bit, retireUploaded ? 1 : current.RetirementStatementsUploaded)
        .input('LinkedAccountEnabled', sql.Bit, linkedAccount ? 1 : current.LinkedAccountEnabled)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE AssetVerificationDocuments
          SET BankStatementsUploaded=@BankStatementsUploaded,
              InvestmentStatementsUploaded=@InvestmentStatementsUploaded,
              RetirementStatementsUploaded=@RetirementStatementsUploaded,
              LinkedAccountEnabled=@LinkedAccountEnabled,
              ApplicationStatus=@ApplicationStatus,
              UpdatedAt=SYSUTCDATETIME()
          WHERE UserID=@UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('BankStatementsUploaded', sql.Bit, bankUploaded)
        .input('InvestmentStatementsUploaded', sql.Bit, investUploaded)
        .input('RetirementStatementsUploaded', sql.Bit, retireUploaded)
        .input('LinkedAccountEnabled', sql.Bit, linkedAccount)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO AssetVerificationDocuments 
          (UserID, BankStatementsUploaded, InvestmentStatementsUploaded, RetirementStatementsUploaded, LinkedAccountEnabled, ApplicationStatus)
          VALUES (@UserID, @BankStatementsUploaded, @InvestmentStatementsUploaded, @RetirementStatementsUploaded, @LinkedAccountEnabled, @ApplicationStatus)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving asset verification documents:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
