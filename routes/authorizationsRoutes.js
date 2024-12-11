const express = require('express');
const router = express.Router();
const sql = require('mssql');

router.post('/saveAuthorizationsConsent', async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const { eSignature, hasAgreed, newStatus } = req.body;
  
  let signedDate = null;
  if (newStatus === 'Completed') {
    signedDate = new Date();
  }

  const pool = req.app.locals.pool;

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM AuthorizationsConsent WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ESignature', sql.NVarChar(255), eSignature || null)
        .input('HasAgreed', sql.Bit, hasAgreed === 'true')
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .input('SignedDate', sql.DateTime2, signedDate)
        .query(`
          UPDATE AuthorizationsConsent
          SET ESignature = @ESignature,
              HasAgreed = @HasAgreed,
              ApplicationStatus = @ApplicationStatus,
              SignedDate = @SignedDate,
              UpdatedAt = SYSUTCDATETIME()
          WHERE UserID = @UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ESignature', sql.NVarChar(255), eSignature || null)
        .input('HasAgreed', sql.Bit, hasAgreed === 'true')
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .input('SignedDate', sql.DateTime2, signedDate)
        .query(`
          INSERT INTO AuthorizationsConsent (UserID, ESignature, HasAgreed, ApplicationStatus, SignedDate)
          VALUES (@UserID, @ESignature, @HasAgreed, @ApplicationStatus, @SignedDate)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
