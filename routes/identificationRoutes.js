const express = require('express');
const router = express.Router();
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');

// Use memory storage so we can get file buffer directly
const upload = multer({ storage: multer.memoryStorage() });

router.post('/saveIdentificationDocuments', upload.single('idDocs'), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;

  const newStatus = req.body.newStatus || 'Not Started';

  let filePath = null;
  if (req.file) {
    const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME_IDENTIFICATION;
    let sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;

    // Ensure the SAS token URL is properly formatted with a leading '?'
    const sasPrefix = sasToken.startsWith('?') ? '' : '?';
    sasToken = sasPrefix + sasToken;

    // Create blob service client with properly formatted SAS URL
    const blobServiceClient = new BlobServiceClient(
      `https://${storageAccountName}.blob.core.windows.net${sasToken}`
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Generate a unique blob name for the uploaded file
    const extension = req.file.originalname.split('.').pop();
    const blobName = `user-${userId}-${Date.now()}.${extension}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload the file buffer to Blob Storage
    await blockBlobClient.uploadData(req.file.buffer);

    // Store the blobName in the database, URL will be generated later using SAS
    filePath = blobName;
  }

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM IdentificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      const currentPath = existingRecord.recordset[0].IDFilePath;
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('IDFilePath', sql.NVarChar(500), filePath || currentPath)
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

