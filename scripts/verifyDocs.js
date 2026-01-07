require('dotenv').config();
const { getConnection } = require('../Db');

async function verifyDocuments() {
  const pool = await getConnection();
  
  console.log('\n📋 VERIFICATION: Document Records in Database\n');
  console.log('='.repeat(60));
  
  // Check IdentificationDocuments
  console.log('\n🆔 IdentificationDocuments:');
  const idDocs = await pool.request().query(`
    SELECT u.Email, i.IDFilePath, i.ApplicationStatus 
    FROM IdentificationDocuments i
    JOIN Users u ON i.UserID = u.UserID
    WHERE i.IDFilePath IS NOT NULL
  `);
  idDocs.recordset.forEach(r => {
    console.log(`   ${r.Email}: ${r.IDFilePath} (${r.ApplicationStatus})`);
  });
  
  // Check IncomeVerificationDocuments
  console.log('\n💰 IncomeVerificationDocuments:');
  const incomeDocs = await pool.request().query(`
    SELECT u.Email, i.PayStubsFiles, i.W2Files, i.PnLFiles, i.ApplicationStatus 
    FROM IncomeVerificationDocuments i
    JOIN Users u ON i.UserID = u.UserID
    WHERE i.PayStubsFiles IS NOT NULL OR i.W2Files IS NOT NULL OR i.PnLFiles IS NOT NULL
  `);
  incomeDocs.recordset.forEach(r => {
    console.log(`   ${r.Email}:`);
    if (r.PayStubsFiles) console.log(`     PayStubs: ${r.PayStubsFiles}`);
    if (r.W2Files) console.log(`     W2s: ${r.W2Files}`);
    if (r.PnLFiles) console.log(`     P&L: ${r.PnLFiles}`);
    console.log(`     Status: ${r.ApplicationStatus}`);
  });
  
  // Check AssetVerificationDocuments
  console.log('\n🏦 AssetVerificationDocuments:');
  const assetDocs = await pool.request().query(`
    SELECT u.Email, a.BankStatementsFiles, a.ApplicationStatus 
    FROM AssetVerificationDocuments a
    JOIN Users u ON a.UserID = u.UserID
    WHERE a.BankStatementsFiles IS NOT NULL
  `);
  assetDocs.recordset.forEach(r => {
    console.log(`   ${r.Email}: ${r.BankStatementsFiles} (${r.ApplicationStatus})`);
  });
  
  // Check GiftLetter
  console.log('\n🎁 GiftLetter:');
  const giftDocs = await pool.request().query(`
    SELECT u.Email, g.GiftLetterFilePath, g.ApplicationStatus 
    FROM GiftLetter g
    JOIN Users u ON g.UserID = u.UserID
    WHERE g.GiftLetterFilePath IS NOT NULL
  `);
  giftDocs.recordset.forEach(r => {
    console.log(`   ${r.Email}: ${r.GiftLetterFilePath} (${r.ApplicationStatus})`);
  });
  
  // Check PurchaseAgreement
  console.log('\n📝 PurchaseAgreement:');
  const paDocs = await pool.request().query(`
    SELECT u.Email, p.AgreementFilePath, p.ApplicationStatus 
    FROM PurchaseAgreement p
    JOIN Users u ON p.UserID = u.UserID
    WHERE p.AgreementFilePath IS NOT NULL
  `);
  paDocs.recordset.forEach(r => {
    console.log(`   ${r.Email}: ${r.AgreementFilePath} (${r.ApplicationStatus})`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Verification complete\n');
  
  await pool.close();
  process.exit(0);
}

verifyDocuments().catch(console.error);

