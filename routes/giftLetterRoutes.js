const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/gift_letters/' });
const sql = require('mssql');

router.post('/saveGiftLetter', upload.single('giftLetter'), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const newStatus = req.body.newStatus || 'Not Started';

  const hasGiftLetter = (req.file) ? 1 : 0;

  const pool = req.app.locals.pool;

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT TOP 1 * FROM GiftLetter WHERE UserID = @UserID ORDER BY CreatedAt DESC`);

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('HasGiftLetter', sql.Bit, hasGiftLetter ? 1 : existingRecord.recordset[0].HasGiftLetter)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE GiftLetter
          SET HasGiftLetter=@HasGiftLetter,
              ApplicationStatus=@ApplicationStatus,
              UpdatedAt=SYSUTCDATETIME()
          WHERE UserID=@UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('HasGiftLetter', sql.Bit, hasGiftLetter)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO GiftLetter (UserID, HasGiftLetter, ApplicationStatus)
          VALUES (@UserID, @HasGiftLetter, @ApplicationStatus)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving gift letter:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
