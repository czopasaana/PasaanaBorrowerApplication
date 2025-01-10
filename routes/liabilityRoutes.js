const express = require('express');
const router = express.Router();
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/saveLiabilityVerification', upload.fields([
  { name: 'creditCardStatements', maxCount: 10 },
  { name: 'autoLoanStatements', maxCount: 10 },
  { name: 'studentLoanStatements', maxCount: 10 },
  { name: 'mortgageStatement', maxCount: 10 }
]), async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not authenticated' });
  }

  const userId = req.session.user.userID;
  const pool = req.app.locals.pool;
  const newStatus = req.body.newStatus || 'Not Started';

  const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME_LIABILITY;
  let sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
  const sasPrefix = sasToken.startsWith('?') ? '' : '?';
  sasToken = sasPrefix + sasToken;

  const blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net${sasToken}`
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);

  async function uploadFiles(files) {
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

  const creditFiles = await uploadFiles(req.files['creditCardStatements']);
  const autoFiles = await uploadFiles(req.files['autoLoanStatements']);
  const studentFiles = await uploadFiles(req.files['studentLoanStatements']);
  const mortgageFiles = await uploadFiles(req.files['mortgageStatement']);

  const existingResult = await pool.request()
    .input('UserID', sql.Int, userId)
    .query("SELECT TOP 1 * FROM LiabilityVerificationDocuments WHERE UserID = @UserID ORDER BY CreatedAt DESC");

  let query;
  if (existingResult.recordset.length > 0) {
    query = `
      UPDATE LiabilityVerificationDocuments
      SET CreditCardStatementsUploaded=CASE WHEN @CreditCardStatementsFiles='' THEN CreditCardStatementsUploaded ELSE 1 END,
          AutoLoanStatementsUploaded=CASE WHEN @AutoLoanStatementsFiles='' THEN AutoLoanStatementsUploaded ELSE 1 END,
          StudentLoanStatementsUploaded=CASE WHEN @StudentLoanStatementsFiles='' THEN StudentLoanStatementsUploaded ELSE 1 END,
          MortgageStatementUploaded=CASE WHEN @MortgageStatementFiles='' THEN MortgageStatementUploaded ELSE 1 END,
          CreditCardStatementsFiles=ISNULL(NULLIF(@CreditCardStatementsFiles,''),CreditCardStatementsFiles),
          AutoLoanStatementsFiles=ISNULL(NULLIF(@AutoLoanStatementsFiles,''),AutoLoanStatementsFiles),
          StudentLoanStatementsFiles=ISNULL(NULLIF(@StudentLoanStatementsFiles,''),StudentLoanStatementsFiles),
          MortgageStatementFiles=ISNULL(NULLIF(@MortgageStatementFiles,''),MortgageStatementFiles),
          ApplicationStatus=@ApplicationStatus,
          UpdatedAt=SYSUTCDATETIME()
      WHERE UserID=@UserID
    `;
  } else {
    query = `
      INSERT INTO LiabilityVerificationDocuments
      (UserID, CreditCardStatementsUploaded, AutoLoanStatementsUploaded, StudentLoanStatementsUploaded, MortgageStatementUploaded,
       CreditCardStatementsFiles, AutoLoanStatementsFiles, StudentLoanStatementsFiles, MortgageStatementFiles, ApplicationStatus)
      VALUES
      (@UserID,
       CASE WHEN @CreditCardStatementsFiles<>'' THEN 1 ELSE 0 END,
       CASE WHEN @AutoLoanStatementsFiles<>'' THEN 1 ELSE 0 END,
       CASE WHEN @StudentLoanStatementsFiles<>'' THEN 1 ELSE 0 END,
       CASE WHEN @MortgageStatementFiles<>'' THEN 1 ELSE 0 END,
       @CreditCardStatementsFiles, @AutoLoanStatementsFiles, @StudentLoanStatementsFiles, @MortgageStatementFiles,
       @ApplicationStatus)
    `;
  }

  const current = existingResult.recordset[0] || {};

  await pool.request()
    .input('UserID', sql.Int, userId)
    .input('CreditCardStatementsFiles', sql.NVarChar(sql.MAX), creditFiles || '')
    .input('AutoLoanStatementsFiles', sql.NVarChar(sql.MAX), autoFiles || '')
    .input('StudentLoanStatementsFiles', sql.NVarChar(sql.MAX), studentFiles || '')
    .input('MortgageStatementFiles', sql.NVarChar(sql.MAX), mortgageFiles || '')
    .input('ApplicationStatus', sql.NVarChar(50), newStatus)
    .query(query);

  // Convert comma-separated files to arrays with SAS URLs
  function filesToArray(str) {
    if (!str || str.trim() === '') return [];
    return str.split(',').map(blobName => ({
      name: blobName,
      url: `https://${storageAccountName}.blob.core.windows.net/${containerName}/${blobName}${sasToken}`
    }));
  }

  const creditArr = filesToArray(creditFiles || current.CreditCardStatementsFiles);
  const autoArr = filesToArray(autoFiles || current.AutoLoanStatementsFiles);
  const studentArr = filesToArray(studentFiles || current.StudentLoanStatementsFiles);
  const mortgageArr = filesToArray(mortgageFiles || current.MortgageStatementFiles);

  res.json({
    success: true,
    creditCardStatements: creditArr,
    autoLoanStatements: autoArr,
    studentLoanStatements: studentArr,
    mortgageStatement: mortgageArr
  });
});

module.exports = router;

