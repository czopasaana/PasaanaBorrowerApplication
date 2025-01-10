const express = require('express');
const router = express.Router();
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');

// Use memory storage so we can get file buffer directly
const upload = multer({ storage: multer.memoryStorage() });

// Helper to generate SAS URLs
function generateBlobSasUrl(storageAccountName, containerName, sasToken, blobName) {
  const prefix = sasToken.startsWith('?') ? '' : '?';
  return `https://${storageAccountName}.blob.core.windows.net/${containerName}/${blobName}${prefix}${sasToken}`;
}

router.post('/saveIncomeVerification', upload.fields([
  { name: 'payStubs', maxCount: 10 },
  { name: 'w2s', maxCount: 10 },
  { name: 'taxReturns', maxCount: 10 },
  { name: 'form1099s', maxCount: 10 },
  { name: 'pnlDocs', maxCount: 10 }
]), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;
  const newStatus = req.body.newStatus || 'Not Started';
  const employmentType = req.body.employmentType || null;

  const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME_INCOME;
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

  // Upload sets of files
  const payStubsFiles = await uploadFilesToBlob(req.files['payStubs']);
  const w2Files = await uploadFilesToBlob(req.files['w2s']);
  const taxReturnsFiles = await uploadFilesToBlob(req.files['taxReturns']);
  const form1099Files = await uploadFilesToBlob(req.files['form1099s']);
  const pnlFiles = await uploadFilesToBlob(req.files['pnlDocs']);

  try {
    const existingRecord = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT TOP 1 * FROM IncomeVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC");

    let query;
    if (existingRecord.recordset.length > 0) {
      query = `
        UPDATE IncomeVerificationDocuments
        SET EmploymentType=@EmploymentType,
            PayStubsUploaded=@PayStubsUploaded,
            W2sUploaded=@W2sUploaded,
            TaxReturnsUploaded=@TaxReturnsUploaded,
            Form1099sUploaded=@Form1099sUploaded,
            PnLUploaded=@PnLUploaded,
            PayStubsFiles=ISNULL(NULLIF(@PayStubsFiles,''),PayStubsFiles),
            W2Files=ISNULL(NULLIF(@W2Files,''),W2Files),
            TaxReturnsFiles=ISNULL(NULLIF(@TaxReturnsFiles,''),TaxReturnsFiles),
            Form1099Files=ISNULL(NULLIF(@Form1099Files,''),Form1099Files),
            PnLFiles=ISNULL(NULLIF(@PnLFiles,''),PnLFiles),
            ApplicationStatus=@ApplicationStatus,
            UpdatedAt=SYSUTCDATETIME()
        WHERE UserID=@UserID
      `;
    } else {
      query = `
        INSERT INTO IncomeVerificationDocuments 
        (UserID, EmploymentType, PayStubsUploaded, W2sUploaded, TaxReturnsUploaded, Form1099sUploaded, PnLUploaded, PayStubsFiles, W2Files, TaxReturnsFiles, Form1099Files, PnLFiles, ApplicationStatus)
        VALUES (@UserID, @EmploymentType, @PayStubsUploaded, @W2sUploaded, @TaxReturnsUploaded, @Form1099sUploaded, @PnLUploaded, @PayStubsFiles, @W2Files, @TaxReturnsFiles, @Form1099Files, @PnLFiles, @ApplicationStatus)
      `;
    }

    const current = existingRecord.recordset[0] || {};
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('EmploymentType', sql.NVarChar(50), employmentType || current.EmploymentType)
      .input('PayStubsUploaded', sql.Bit, payStubsFiles ? 1 : (current.PayStubsUploaded || 0))
      .input('W2sUploaded', sql.Bit, w2Files ? 1 : (current.W2sUploaded || 0))
      .input('TaxReturnsUploaded', sql.Bit, taxReturnsFiles ? 1 : (current.TaxReturnsUploaded || 0))
      .input('Form1099sUploaded', sql.Bit, form1099Files ? 1 : (current.Form1099sUploaded || 0))
      .input('PnLUploaded', sql.Bit, pnlFiles ? 1 : (current.PnLUploaded || 0))
      .input('PayStubsFiles', sql.NVarChar(sql.MAX), payStubsFiles || '')
      .input('W2Files', sql.NVarChar(sql.MAX), w2Files || '')
      .input('TaxReturnsFiles', sql.NVarChar(sql.MAX), taxReturnsFiles || '')
      .input('Form1099Files', sql.NVarChar(sql.MAX), form1099Files || '')
      .input('PnLFiles', sql.NVarChar(sql.MAX), pnlFiles || '')
      .input('ApplicationStatus', sql.NVarChar(50), newStatus)
      .query(query);

    // Now generate arrays of {name, url} from the comma-separated fields
    function filesToArray(str) {
      if (!str || str.trim() === '') return [];
      return str.split(',').map(blobName => ({
        name: blobName,
        url: generateBlobSasUrl(storageAccountName, containerName, sasToken, blobName)
      }));
    }

    const payStubsArr = filesToArray(payStubsFiles || current.PayStubsFiles);
    const w2sArr = filesToArray(w2Files || current.W2Files);
    const taxReturnsArr = filesToArray(taxReturnsFiles || current.TaxReturnsFiles);
    const form1099sArr = filesToArray(form1099Files || current.Form1099Files);
    const pnlArr = filesToArray(pnlFiles || current.PnLFiles);

    res.json({
      success: true,
      payStubs: payStubsArr,
      w2s: w2sArr,
      taxReturns: taxReturnsArr,
      form1099s: form1099sArr,
      pnl: pnlArr
    });
  } catch (error) {
    console.error('Error saving income verification documents:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;


