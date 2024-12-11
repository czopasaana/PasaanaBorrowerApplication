const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/income_docs/' }); // Adjust as needed
const sql = require('mssql');

router.post('/saveIncomeVerification', upload.fields([
  { name: 'payStubs', maxCount: 10 },
  { name: 'w2s', maxCount: 10 },
  { name: 'taxReturns', maxCount: 10 },
  { name: 'form1099s', maxCount: 10 },
  { name: 'pnlDocs', maxCount: 10 }
]), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;

  const newStatus = req.body.newStatus || 'Not Started';
  const employmentType = req.body.employmentType || null;

  // Check which files were uploaded
  const payStubsUploaded = (req.files['payStubs'] && req.files['payStubs'].length > 0) ? 1 : 0;
  const w2sUploaded = (req.files['w2s'] && req.files['w2s'].length > 0) ? 1 : 0;
  const taxReturnsUploaded = (req.files['taxReturns'] && req.files['taxReturns'].length > 0) ? 1 : 0;
  const form1099sUploaded = (req.files['form1099s'] && req.files['form1099s'].length > 0) ? 1 : 0;
  const pnlUploaded = (req.files['pnlDocs'] && req.files['pnlDocs'].length > 0) ? 1 : 0;

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM IncomeVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      const current = existingRecord.recordset[0];

      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('EmploymentType', sql.NVarChar(50), employmentType || current.EmploymentType)
        .input('PayStubsUploaded', sql.Bit, payStubsUploaded ? 1 : current.PayStubsUploaded)
        .input('W2sUploaded', sql.Bit, w2sUploaded ? 1 : current.W2sUploaded)
        .input('TaxReturnsUploaded', sql.Bit, taxReturnsUploaded ? 1 : current.TaxReturnsUploaded)
        .input('Form1099sUploaded', sql.Bit, form1099sUploaded ? 1 : current.Form1099sUploaded)
        .input('PnLUploaded', sql.Bit, pnlUploaded ? 1 : current.PnLUploaded)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE IncomeVerificationDocuments
          SET EmploymentType=@EmploymentType,
              PayStubsUploaded=@PayStubsUploaded,
              W2sUploaded=@W2sUploaded,
              TaxReturnsUploaded=@TaxReturnsUploaded,
              Form1099sUploaded=@Form1099sUploaded,
              PnLUploaded=@PnLUploaded,
              ApplicationStatus=@ApplicationStatus,
              UpdatedAt=SYSUTCDATETIME()
          WHERE UserID=@UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('EmploymentType', sql.NVarChar(50), employmentType)
        .input('PayStubsUploaded', sql.Bit, payStubsUploaded)
        .input('W2sUploaded', sql.Bit, w2sUploaded)
        .input('TaxReturnsUploaded', sql.Bit, taxReturnsUploaded)
        .input('Form1099sUploaded', sql.Bit, form1099sUploaded)
        .input('PnLUploaded', sql.Bit, pnlUploaded)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO IncomeVerificationDocuments 
          (UserID, EmploymentType, PayStubsUploaded, W2sUploaded, TaxReturnsUploaded, Form1099sUploaded, PnLUploaded, ApplicationStatus)
          VALUES (@UserID, @EmploymentType, @PayStubsUploaded, @W2sUploaded, @TaxReturnsUploaded, @Form1099sUploaded, @PnLUploaded, @ApplicationStatus)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving income verification documents:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
