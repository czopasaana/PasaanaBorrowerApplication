const express = require('express');
const router = express.Router();
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');

// Use memory storage so we can handle file.buffer
const upload = multer({ storage: multer.memoryStorage() });

router.post('/saveGiftLetter', upload.single('giftLetter'), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const newStatus = req.body.newStatus || 'Not Started';

  const pool = req.app.locals.pool;

  // Azure Blob Storage setup
  const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME_GIFTLETTER; // Make sure this container exists
  let sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
  
  const sasPrefix = sasToken.startsWith('?') ? '' : '?';
  sasToken = sasPrefix + sasToken;

  const blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net${sasToken}`
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);

  let filePath = null;
  if (req.file) {
    const extension = req.file.originalname.split('.').pop();
    const blobName = `user-${userId}-${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer);
    filePath = blobName;
  }

  const existingRecord = await pool.request()
    .input('UserID', sql.Int, userId)
    .query("SELECT TOP 1 * FROM GiftLetter WHERE UserID = @UserID ORDER BY CreatedAt DESC");

  let query;
  if (existingRecord.recordset.length > 0) {
    query = `
      UPDATE GiftLetter
      SET HasGiftLetter = CASE WHEN @HasGiftLetter=1 THEN 1 ELSE HasGiftLetter END,
          GiftLetterFilePath = ISNULL(NULLIF(@GiftLetterFilePath,''),GiftLetterFilePath),
          ApplicationStatus=@ApplicationStatus,
          UpdatedAt=SYSUTCDATETIME()
      WHERE UserID=@UserID
    `;
  } else {
    query = `
      INSERT INTO GiftLetter (UserID, HasGiftLetter, GiftLetterFilePath, ApplicationStatus)
      VALUES (@UserID, @HasGiftLetter, @GiftLetterFilePath, @ApplicationStatus)
    `;
  }

  const hasGiftLetter = filePath ? 1 : (existingRecord.recordset.length > 0 ? existingRecord.recordset[0].HasGiftLetter : 0);

  await pool.request()
    .input('UserID', sql.Int, userId)
    .input('HasGiftLetter', sql.Bit, hasGiftLetter)
    .input('GiftLetterFilePath', sql.NVarChar(sql.MAX), filePath || '')
    .input('ApplicationStatus', sql.NVarChar(50), newStatus)
    .query(query);

  // Generate SAS URL if filePath is available
  function generateFileUrl(blobName) {
    if (!blobName) return null;
    const prefix = sasToken.startsWith('?') ? '' : '?';
    return `https://${storageAccountName}.blob.core.windows.net/${containerName}/${blobName}${prefix}${sasToken}`;
  }

  const fileUrl = filePath ? generateFileUrl(filePath) : null;
  
  res.json({ success: true, fileUrl });
});

module.exports = router;
