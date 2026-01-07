require('dotenv').config();
const { getConnection } = require('../Db');
const sql = require('mssql');

async function cleanupDocuments() {
  const pool = await getConnection();
  
  console.log('\n🧹 Cleaning up ALL test data records...\n');
  
  // Get all test user IDs
  const testUsers = await pool.request()
    .query("SELECT UserID FROM Users WHERE Email LIKE '%@test.com'");
  
  const testUserIds = testUsers.recordset.map(u => u.UserID);
  console.log('Test user IDs found:', testUserIds.join(', '));
  
  for (const userId of testUserIds) {
    console.log(`\nCleaning up UserID: ${userId}`);
    
    // Clean document records
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query('DELETE FROM IdentificationDocuments WHERE UserID = @UserID');
    
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query('DELETE FROM IncomeVerificationDocuments WHERE UserID = @UserID');
    
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query('DELETE FROM AssetVerificationDocuments WHERE UserID = @UserID');
    
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query('DELETE FROM LiabilityVerificationDocuments WHERE UserID = @UserID');
    
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query('DELETE FROM GiftLetter WHERE UserID = @UserID');
    
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query('DELETE FROM PurchaseAgreement WHERE UserID = @UserID');
    
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query('DELETE FROM AuthorizationsConsent WHERE UserID = @UserID');
    
    console.log('  ✓ Document records cleaned');
    
    // Clean URLA records (loan_applications and related)
    try {
      // Get application IDs for this user
      const apps = await pool.request()
        .input('user_id', sql.BigInt, userId)
        .query('SELECT id FROM loan_applications WHERE user_id = @user_id');
      
      for (const app of apps.recordset) {
        const appId = app.id;
        
        // Get borrower IDs from application_borrowers
        const borrowers = await pool.request()
          .input('application_id', sql.BigInt, appId)
          .query('SELECT borrower_id FROM application_borrowers WHERE application_id = @application_id');
        
        // Delete subject_property
        await pool.request()
          .input('application_id', sql.BigInt, appId)
          .query('DELETE FROM subject_property WHERE application_id = @application_id');
        
        // Delete application_borrowers
        await pool.request()
          .input('application_id', sql.BigInt, appId)
          .query('DELETE FROM application_borrowers WHERE application_id = @application_id');
        
        // Delete borrower-related records
        for (const b of borrowers.recordset) {
          const borrowerId = b.borrower_id;
          
          await pool.request()
            .input('borrower_id', sql.BigInt, borrowerId)
            .query('DELETE FROM borrower_addresses WHERE borrower_id = @borrower_id');
          
          await pool.request()
            .input('borrower_id', sql.BigInt, borrowerId)
            .query('DELETE FROM borrower_employments WHERE borrower_id = @borrower_id');
          
          await pool.request()
            .input('borrower_id', sql.BigInt, borrowerId)
            .query('DELETE FROM borrowers WHERE id = @borrower_id');
        }
        
        // Delete loan_applications
        await pool.request()
          .input('application_id', sql.BigInt, appId)
          .query('DELETE FROM loan_applications WHERE id = @application_id');
      }
      
      console.log('  ✓ URLA records cleaned');
    } catch (e) {
      console.log('  ⚠ URLA cleanup error (may not exist):', e.message);
    }
  }
  
  console.log('\n✅ Cleanup complete.\n');
  console.log('Next steps:');
  console.log('  1. Run: node scripts/seedTestData.js');
  console.log('  2. Run: node scripts/uploadTestDocs.js\n');
  
  await pool.close();
  process.exit(0);
}

cleanupDocuments().catch(console.error);
