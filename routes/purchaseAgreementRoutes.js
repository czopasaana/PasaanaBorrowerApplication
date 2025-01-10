const express = require('express');
const router = express.Router();
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/savePurchaseAgreement', upload.single('purchaseAgreement'), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;
  const newStatus = req.body.newStatus || 'Not Started';

  // Azure Blob Storage config
  const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME_PURCHASE; 
  // For example: AZURE_STORAGE_CONTAINER_NAME_PURCHASE in .env
  let sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
  const sasPrefix = sasToken.startsWith('?') ? '' : '?';
  sasToken = sasPrefix + sasToken;

  const blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net${sasToken}`
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);

  let filePath = null;
  let hasAgreement = 0;

  if (req.file) {
    // Upload file to Blob Storage
    const extension = req.file.originalname.split('.').pop();
    const blobName = `user-${userId}-${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer);
    filePath = blobName;
    hasAgreement = 1;
  }

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT TOP 1 * FROM PurchaseAgreement WHERE UserID = @UserID ORDER BY CreatedAt DESC`);

    if (existingRecord.recordset.length > 0) {
      // Update existing record
      const current = existingRecord.recordset[0];
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('HasAgreement', sql.Bit, hasAgreement ? 1 : current.HasAgreement)
        .input('AgreementFilePath', sql.NVarChar(500), filePath || current.AgreementFilePath)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          UPDATE PurchaseAgreement
          SET HasAgreement = @HasAgreement,
              AgreementFilePath = @AgreementFilePath,
              ApplicationStatus = @ApplicationStatus,
              UpdatedAt = SYSUTCDATETIME()
          WHERE UserID = @UserID
        `);
    } else {
      // Insert new record
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('HasAgreement', sql.Bit, hasAgreement)
        .input('AgreementFilePath', sql.NVarChar(500), filePath)
        .input('ApplicationStatus', sql.NVarChar(50), newStatus)
        .query(`
          INSERT INTO PurchaseAgreement (UserID, HasAgreement, AgreementFilePath, ApplicationStatus)
          VALUES (@UserID, @HasAgreement, @AgreementFilePath, @ApplicationStatus)
        `);
    }

    // Generate SAS URL if file was uploaded (or existed before)
    let fileUrl = null;
    if (filePath || (existingRecord.recordset.length > 0 && existingRecord.recordset[0].AgreementFilePath)) {
      const finalPath = filePath || existingRecord.recordset[0].AgreementFilePath;
      fileUrl = `https://${storageAccountName}.blob.core.windows.net/${containerName}/${finalPath}${sasToken}`;
    }

    res.json({ success: true, fileUrl: fileUrl });
  } catch (error) {
    console.error('Error saving purchase agreement:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;

