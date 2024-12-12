const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/co_borrower_docs/' });
const sql = require('mssql');

router.post('/saveCoBorrowerInfo', upload.array('coBorrowerDocs'), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const firstName = req.body.coBorrowerFirstName || null;
  const lastName = req.body.coBorrowerLastName || null;
  const newStatus = req.body.newStatus || 'Not Started';

  // Check if docs were uploaded
  const docsUploaded = (req.files && req.files.length > 0) ? 1 : 0;

  const pool = req.app.locals.pool;

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM CoBorrowerInfo WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('FirstName', sql.NVarChar(100), firstName)
        .input('LastName', sql.NVarChar(100), lastName)
        .input('HasDocuments', sql.Bit, docsUploaded ? 1 : existingRecord.recordset[0].HasDocuments)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE CoBorrowerInfo
          SET FirstName=@FirstName, LastName=@LastName,
              HasDocuments=@HasDocuments, ApplicationStatus=@ApplicationStatus,
              UpdatedAt=SYSUTCDATETIME()
          WHERE UserID=@UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('FirstName', sql.NVarChar(100), firstName)
        .input('LastName', sql.NVarChar(100), lastName)
        .input('HasDocuments', sql.Bit, docsUploaded)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO CoBorrowerInfo 
          (UserID, FirstName, LastName, HasDocuments, ApplicationStatus)
          VALUES (@UserID, @FirstName, @LastName, @HasDocuments, @ApplicationStatus)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving co-borrower info:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
