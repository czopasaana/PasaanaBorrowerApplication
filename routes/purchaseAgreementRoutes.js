const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/purchase_agreements/' });
const sql = require('mssql');

router.post('/savePurchaseAgreement', upload.single('purchaseAgreement'), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const newStatus = req.body.newStatus || 'Not Started';

  // If a file is uploaded, HasAgreement = 1
  const hasAgreement = (req.file) ? 1 : 0;

  const pool = req.app.locals.pool;

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT TOP 1 * FROM PurchaseAgreement WHERE UserID = @UserID ORDER BY CreatedAt DESC`);

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('HasAgreement', sql.Bit, hasAgreement ? 1 : existingRecord.recordset[0].HasAgreement)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE PurchaseAgreement
          SET HasAgreement = @HasAgreement,
              ApplicationStatus = @ApplicationStatus,
              UpdatedAt = SYSUTCDATETIME()
          WHERE UserID = @UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('HasAgreement', sql.Bit, hasAgreement)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO PurchaseAgreement (UserID, HasAgreement, ApplicationStatus)
          VALUES (@UserID, @HasAgreement, @ApplicationStatus)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving purchase agreement:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
