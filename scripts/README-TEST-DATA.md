# 🏠 Test Data & Documents Guide

This guide explains how to create, manage, and use test data for the mortgage application system.

## 📋 Quick Reference

**All test accounts use password: `Test123!`**

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install pdfkit
```

### 2. Seed Test Users (44 users)

```bash
node scripts/seedTestData.js
```

### 3. Generate Test Documents

```bash
node scripts/generateTestDocs.js
```

### 4. Upload Documents to Azure

```bash
node scripts/uploadTestDocs.js
```

### 5. Verify Everything Uploaded

```bash
node scripts/verifyDocs.js
```

### 6. Clean Up (to start fresh)

```bash
node scripts/cleanupDocs.js
```

---

## 📊 Test User Categories (44 Total)

### ✅ APPROVED SCENARIOS (8 users)

| Email | Scenario | Key Feature |
|-------|----------|-------------|
| `approved.w2@test.com` | Strong W-2 Employee | Standard salaried approval |
| `approved.dual@test.com` | Dual Income Household | Co-borrower income stacking |
| `approved.selfemployed@test.com` | Self-Employed Owner | P&L, 2-year business history |
| `approved.veteran@test.com` | Military/VA Eligible | VA loan, COE verification |
| `approved.conditional@test.com` | Conditional → Cleared | Conditions satisfied workflow |
| `approved.plaid@test.com` | Plaid Verified Assets | Automated asset verification |
| `borrower.firsttime@test.com` | First-Time Homebuyer | DPA eligibility |
| `coborrower.nonoccupant@test.com` | Non-Occupant Co-Signer | Parent helping child |

### ❌ DENIED SCENARIOS (9 users)

| Email | Scenario | Denial Reason |
|-------|----------|---------------|
| `denied.highdti@test.com` | High DTI Ratio | DTI > 50% |
| `denied.badcredit@test.com` | Poor Credit | Credit < 640, BK < 48mo |
| `denied.nodocs@test.com` | No Documentation | Missing all docs |
| `denied.bankruptcyrecent@test.com` | Recent Bankruptcy | BK 36 months (needs 48) |
| `denied.lates30@test.com` | 30-Day Late | Mortgage late in 12 months |
| `denied.lates60@test.com` | 60-Day Late | Mortgage late in 24 months |
| `denied.judgment@test.com` | Unresolved Judgment | $12,500 outstanding |
| `denied.secondhomecredit@test.com` | Second Home Credit | Credit 655 < 660 floor |
| `denied.investmentcredit@test.com` | Investment Credit | Credit 695 < 700 floor |

### 📦 PRODUCT VARIATIONS (4 users)

| Email | Scenario | Product Details |
|-------|----------|-----------------|
| `product.15year@test.com` | 15-Year Fixed | Higher payment, lower rate |
| `product.arm5@test.com` | ARM F5 | 5-year initial fixed period |
| `product.arm1@test.com` | ARM F1 | 1-year reset, 41% DTI, 1.5x reserves |
| `occupancy.secondhome@test.com` | Second Home | 660 credit, 6m reserves |

### 💼 INCOME TYPE VARIATIONS (7 users)

| Email | Scenario | Income Details |
|-------|----------|----------------|
| `income.1099@test.com` | 1099 Contractor | 2 years 1099s + tax returns |
| `income.commission@test.com` | Variable/Commission | 24-month average |
| `income.multiple@test.com` | Multiple Sources | W-2 + 1099 + Rental |
| `income.retired@test.com` | Retirement Income | Pension + 401k |
| `income.socialsecurity@test.com` | Social Security | Fixed income only |
| `income.alimony@test.com` | Alimony/Support | 36+ month continuance |
| `edge.newjob@test.com` | Recent Job Change | < 24 months, same field |

### 🔶 EDGE CASES (16 users)

| Email | Scenario | Edge Condition |
|-------|----------|----------------|
| `edge.investment@test.com` | Investment Property | 700+ credit, 25% down |
| `edge.refinance@test.com` | Refinance | Rate/term refi, LTV 67% |
| `edge.giftfunds@test.com` | Gift Funds | $35k gift for down payment |
| `edge.nonresident@test.com` | Non-Resident Alien | H-1B visa holder |
| `edge.creditfloor@test.com` | Credit at Floor | Exactly 640 score |
| `edge.bankruptcy@test.com` | BK Seasoned | 52 months (48+ OK) |
| `edge.foreclosure@test.com` | Foreclosure Seasoned | 50 months (48+ OK) |
| `edge.dti43@test.com` | DTI at Cap | Exactly 43% |
| `edge.reservesfloor@test.com` | Reserves at Floor | Exactly 2 months |
| `edge.largedeposit@test.com` | Large Deposit | $55k needs sourcing |
| `edge.highutilization@test.com` | High Utilization | 88% credit utilization |
| `edge.nsf@test.com` | NSF Incidents | Bank account issues |
| `edge.deferredloans@test.com` | Deferred Loans | Student loans at $0/mo |
| `edge.multiplereo@test.com` | Multiple REO | 3+ financed properties |
| `edge.dpa@test.com` | Down Payment Assist | CHFA grant program |
| `edge.sellerconcession@test.com` | Seller Concessions | 3% closing cost credit |
| `edge.trust@test.com` | Trust Ownership | Revocable living trust |
| `stage1.preapproval@test.com` | Stage 1 Only | Pre-approval, no property |

---

## 📄 Document Types Generated

Each test user (except `denied.nodocs`) gets a complete document set:

### 📋 Income Verification
- **Pay Stubs** - 2 recent pay periods (bi-weekly)
- **W-2 Forms** - 2 years
- **Tax Returns** - 2 years (for high income or self-employed)
- **P&L Statements** - YTD and prior year (self-employed)
- **1099 Forms** - 2 years (contractors)

### 💰 Asset Verification
- **Bank Statements** - 3 months (checking/savings)
- **Investment Statements** - If applicable
- **Donor Bank Statements** - For gift funds scenario

### 🪪 Identification
- **Driver's License** - Standard ID
- **Passport** - For non-resident aliens
- **VA Certificate of Eligibility** - For veterans

### 💳 Liability Verification
- **Credit Card Statements** - All active cards
- **Auto Loan Statements** - If applicable
- **Student Loan Statements** - If applicable
- **Existing Mortgage Statements** - For refinance/investment

### ✍️ Other Documents
- **Purchase Agreement** - For all purchases
- **Gift Letter** - When receiving gift funds
- **Authorization/Consent Form** - For all applications

---

## 🧪 Testing Workflows

### Full Approval Test

1. Login as `approved.w2@test.com` / `Test123!`
2. Review pre-approval data
3. Complete URLA sections
4. Verify all documents uploaded
5. Submit application
6. **Expected:** Clean approval in admin portal

### Denial Test (Credit)

1. Login as `denied.badcredit@test.com`
2. Note complete documentation
3. Submit application
4. **Expected:** AI agents flag credit issues
5. **Denial reason:** Credit < 640, recent bankruptcy

### Denial Test (Missing Docs)

1. Login as `denied.nodocs@test.com`
2. Note NO documents uploaded
3. Submit application
4. **Expected:** AI agents flag missing docs
5. **Denial reason:** Cannot verify income/assets/identity

### Edge Case Test (Gift Funds)

1. Login as `edge.giftfunds@test.com`
2. Note gift letter and donor bank statement
3. Submit application
4. **Expected:** AI agents verify gift source
5. **Approval with:** Gift funds properly documented

### Edge Case Test (DTI at Cap)

1. Login as `edge.dti43@test.com`
2. Calculate DTI manually: (Debt + Housing) / Income
3. Submit application
4. **Expected:** Approved at exactly 43% DTI
5. **No margin:** Any additional debt would fail

---

## 🔧 Script Details

### `seedTestData.js`

Creates 44 test users with:
- User accounts in `Users` table
- Pre-approval applications in `PreApprovalApplications` table
- URLA applications in `loan_applications` table
- Borrower records in `borrowers` table
- Address records in `borrower_addresses` table
- Subject properties in `subject_property` table
- Employment records in `borrower_employments` table

### `generateTestDocs.js`

Creates PDF documents in `test-documents/` folder:
- Realistic-looking sample documents
- Clearly marked as "SAMPLE - FOR TESTING ONLY"
- Proper data matching test user profiles
- All documents named with user prefix

### `uploadTestDocs.js`

Uploads documents to Azure Blob Storage:
- Uses connection string for authentication
- Creates containers if they don't exist
- Generates proper blob names (user-{id}-{timestamp}-{random}.pdf)
- Updates database with blob references
- Sets `*Uploaded` flags to TRUE

### `verifyDocs.js`

Verifies document upload status:
- Checks each document type for each user
- Displays matrix of upload status
- Confirms database records match

### `cleanupDocs.js`

Cleans up for fresh start:
- Deletes test users from all tables
- Optionally clears blob storage
- Use before re-seeding

---

## 📊 Database Tables Affected

| Table | Purpose |
|-------|---------|
| `Users` | User accounts |
| `PreApprovalApplications` | Stage 1 pre-approval data |
| `loan_applications` | URLA application status |
| `borrowers` | Borrower personal info |
| `application_borrowers` | Links borrowers to applications |
| `borrower_addresses` | Borrower address history |
| `borrower_employments` | Employment records |
| `subject_property` | Property being financed |
| `IdentificationDocuments` | ID document uploads |
| `IncomeVerificationDocuments` | Income document uploads |
| `AssetVerificationDocuments` | Asset document uploads |
| `LiabilityVerificationDocuments` | Liability document uploads |
| `PurchaseAgreement` | Purchase agreement uploads |
| `GiftLetter` | Gift letter uploads |
| `AuthorizationsConsent` | Authorization form uploads |

---

## ⚠️ Important Notes

1. **All generated documents are SAMPLES** - Not valid for real applications
2. **Test data matches policy guidelines** - DTI, credit floors, etc.
3. **Only `denied.nodocs` has no documents** - All other denied users have complete documentation
4. **Edge cases test boundary conditions** - Designed to pass/fail at exact thresholds
5. **Documents contain watermarks** - Clearly marked as test documents

---

## 📚 Related Documentation

- **Detailed Test User Profiles:** See `docs/TEST_USERS_MASTER.md`
- **Database Schema:** See `URLA_DB_SCHEMA.txt`
- **AI Agents:** See `AdminPlatformDocs/AI_AGENTS_README.md`
- **Policy Guidelines:** See `docs/Stage2_30Y_Fixed_Spec_Consolidated.md`

---

*Last Updated: January 2026*
