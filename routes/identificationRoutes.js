const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/id_docs/' }); // Adjust storage as needed
const sql = require('mssql');

router.post('/saveIdentificationDocuments', upload.single('idDocs'), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;

  // Determine newStatus from front-end or deduce based on whether a file is uploaded
  const newStatus = req.body.newStatus || 'Not Started';

  // If a file was uploaded
  let filePath = null;
  if (req.file) {
    // Assuming req.file contains { filename, originalname, ... }
    filePath = `uploads/id_docs/${req.file.filename}`;
  }

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM IdentificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('IDFilePath', sql.NVarChar(500), filePath || existingRecord.recordset[0].IDFilePath)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE IdentificationDocuments
          SET IDFilePath = @IDFilePath,
              ApplicationStatus = @ApplicationStatus,
              UpdatedAt = SYSUTCDATETIME()
          WHERE UserID = @UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('IDFilePath', sql.NVarChar(500), filePath)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO IdentificationDocuments (UserID, IDFilePath, ApplicationStatus)
          VALUES (@UserID, @IDFilePath, @ApplicationStatus)
        `);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving identification documents:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
