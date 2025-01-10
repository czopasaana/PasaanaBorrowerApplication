const express = require('express');
const router = express.Router();
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/saveAssetVerification', upload.fields([
  { name: 'bankStatements', maxCount: 10 },
  { name: 'investmentStatements', maxCount: 10 },
  { name: 'retirementStatements', maxCount: 10 }
]), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;
  const newStatus = req.body.newStatus || 'Not Started';
  const linkedAccount = req.body.linkedAccount === 'true' ? 1 : 0;

  const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME_ASSET; // A new container for asset docs
  let sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
  const sasPrefix = sasToken.startsWith('?') ? '' : '?';
  sasToken = sasPrefix + sasToken;

  const blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net${sasToken}`
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);

  async function uploadFilesToBlob(files) {
    if (!files || files.length === 0) return null;
    const blobNames = [];
    for (const file of files) {
      const extension = file.originalname.split('.').pop();
      const blobName = `user-${userId}-${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(file.buffer);
      blobNames.push(blobName);
    }
    return blobNames.join(',');
  }

  // Upload files
  const bankStatementsFiles = await uploadFilesToBlob(req.files['bankStatements']);
  const investmentFiles = await uploadFilesToBlob(req.files['investmentStatements']);
  const retirementFiles = await uploadFilesToBlob(req.files['retirementStatements']);

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM AssetVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    let query;
    if (existingRecord.recordset.length > 0) {
      query = `
        UPDATE AssetVerificationDocuments
        SET BankStatementsUploaded = CASE WHEN @BankStatementsFiles <> '' THEN 1 ELSE BankStatementsUploaded END,
            InvestmentStatementsUploaded = CASE WHEN @InvestmentStatementsFiles <> '' THEN 1 ELSE InvestmentStatementsUploaded END,
            RetirementStatementsUploaded = CASE WHEN @RetirementStatementsFiles <> '' THEN 1 ELSE RetirementStatementsUploaded END,
            BankStatementsFiles = ISNULL(NULLIF(@BankStatementsFiles,''), BankStatementsFiles),
            InvestmentStatementsFiles = ISNULL(NULLIF(@InvestmentStatementsFiles,''), InvestmentStatementsFiles),
            RetirementStatementsFiles = ISNULL(NULLIF(@RetirementStatementsFiles,''), RetirementStatementsFiles),
            LinkedAccountEnabled = CASE WHEN @LinkedAccountEnabled = 1 THEN 1 ELSE LinkedAccountEnabled END,
            ApplicationStatus=@ApplicationStatus,
            UpdatedAt=SYSUTCDATETIME()
        WHERE UserID=@UserID
      `;
    } else {
      query = `
        INSERT INTO AssetVerificationDocuments 
        (UserID, BankStatementsUploaded, InvestmentStatementsUploaded, RetirementStatementsUploaded, LinkedAccountEnabled, BankStatementsFiles, InvestmentStatementsFiles, RetirementStatementsFiles, ApplicationStatus)
        VALUES (@UserID, CASE WHEN @BankStatementsFiles <> '' THEN 1 ELSE 0 END,
                CASE WHEN @InvestmentStatementsFiles <> '' THEN 1 ELSE 0 END,
                CASE WHEN @RetirementStatementsFiles <> '' THEN 1 ELSE 0 END,
                @LinkedAccountEnabled, @BankStatementsFiles, @InvestmentStatementsFiles, @RetirementStatementsFiles, @ApplicationStatus)
      `;
    }

    const current = existingRecord.recordset[0] || {};
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('BankStatementsFiles', sql.NVarChar(sql.MAX), bankStatementsFiles || '')
      .input('InvestmentStatementsFiles', sql.NVarChar(sql.MAX), investmentFiles || '')
      .input('RetirementStatementsFiles', sql.NVarChar(sql.MAX), retirementFiles || '')
      .input('LinkedAccountEnabled', sql.Bit, linkedAccount)
      .input('ApplicationStatus', sql.NVarChar(50), newStatus)
      .query(query);

    // Convert stored files to arrays of {name, url}
    function filesToArray(str) {
      if (!str || str.trim() === '') return [];
      return str.split(',').map(blobName => ({
        name: blobName,
        url: `https://${storageAccountName}.blob.core.windows.net/${containerName}/${blobName}${sasToken}`
      }));
    }

    const finalBank = filesToArray(bankStatementsFiles || current.BankStatementsFiles);
    const finalInvest = filesToArray(investmentFiles || current.InvestmentStatementsFiles);
    const finalRetire = filesToArray(retirementFiles || current.RetirementStatementsFiles);

    res.json({
      success: true,
      bank: finalBank,
      investment: finalInvest,
      retirement: finalRetire
    });
  } catch (error) {
    console.error('Error saving asset verification documents:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;

