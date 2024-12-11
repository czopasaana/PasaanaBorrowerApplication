const express = require('express');
const router = express.Router();
const sql = require('mssql');

router.post('/saveDisclosures', async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;

  const eSignature = req.body.eSignature || null;
  const hasECOA = req.body.hasECOA === 'true' ? 1 : 0;
  const hasFCRA = req.body.hasFCRA === 'true' ? 1 : 0;
  const hasHomeLoanToolkit = req.body.hasHomeLoanToolkit === 'true' ? 1 : 0;
  const intentToProceed = req.body.intentToProceed === 'true' ? 1 : 0;

  const newStatus = req.body.newStatus || 'Not Started';

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM DisclosuresAndLoanEstimate WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ESignature', sql.NVarChar(255), eSignature)
        .input('HasECOA', sql.Bit, hasECOA)
        .input('HasFCRA', sql.Bit, hasFCRA)
        .input('HasHomeLoanToolkit', sql.Bit, hasHomeLoanToolkit)
        .input('IntentToProceed', sql.Bit, intentToProceed)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE DisclosuresAndLoanEstimate
          SET ESignature=@ESignature,
              HasAcknowledgedECOA=@HasECOA,
              HasAcknowledgedFCRA=@HasFCRA,
              HasAcknowledgedHomeLoanToolkit=@HasHomeLoanToolkit,
              IntentToProceed=@IntentToProceed,
              ApplicationStatus=@ApplicationStatus,
              UpdatedAt=SYSUTCDATETIME()
          WHERE UserID=@UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ESignature', sql.NVarChar(255), eSignature)
        .input('HasECOA', sql.Bit, hasECOA)
        .input('HasFCRA', sql.Bit, hasFCRA)
        .input('HasHomeLoanToolkit', sql.Bit, hasHomeLoanToolkit)
        .input('IntentToProceed', sql.Bit, intentToProceed)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO DisclosuresAndLoanEstimate 
          (UserID, ESignature, HasAcknowledgedECOA, HasAcknowledgedFCRA, HasAcknowledgedHomeLoanToolkit, IntentToProceed, ApplicationStatus)
          VALUES (@UserID, @ESignature, @HasECOA, @HasFCRA, @HasHomeLoanToolkit, @IntentToProceed, @ApplicationStatus)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving disclosures and loan estimate:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
