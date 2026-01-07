# Comprehensive Test Users Documentation

## Overview

This document provides detailed specifications for all test users in the mortgage application system. Each user is designed to test specific scenarios and has complete documentation as required by our AI agents on the admin platform.

**Key Principle**: Every user (except `denied.nodocs@test.com`) must have **ALL** required documents for their scenario. Missing documentation will cause the AI agents to flag and deny applications before they can evaluate the actual test scenario.

---

## Required Documents by AI Agent

Based on our AI agent architecture, here are the documents processed:

### Mandatory for ALL Applications
| Document Type | AI Agent | Purpose |
|--------------|----------|---------|
| **Identification** | IdentificationAgent | Identity verification (DL, Passport, State ID, Military ID) |
| **Income - W2 Employees** | PaystubAgent, W2Agent | 2 recent pay stubs + 2 years W2s |
| **Income - Self-Employed** | PnLAgent, TaxReturnAgent | 2 years P&L + 2 years Tax Returns |
| **Assets - Bank Statements** | BankStatementAgent | 3 months bank statements |

### Required for Purchases
| Document Type | AI Agent | Purpose |
|--------------|----------|---------|
| **Purchase Agreement** | PurchaseAgreementAgent | Verify purchase terms |

### Required for Specific Scenarios
| Document Type | AI Agent | When Required |
|--------------|----------|---------------|
| **Gift Letter** | GiftLetterAgent | When using gift funds for down payment |
| **VA COE** | IdentificationAgent | VA loan applicants |
| **Existing Mortgage Statement** | MortgageAgent | Refinance scenarios, investment property |
| **Rental Income Statement** | PnLAgent | Investment property with rental income |
| **Tax Returns** | TaxReturnAgent | Self-employed, high-income verification |
| **1099 Forms** | Form1099Agent | Contractor/freelance income |

### Liability Verification (when debts exist)
| Document Type | AI Agent | Purpose |
|--------------|----------|---------|
| **Credit Card Statements** | CreditCardAgent | Verify revolving debt |
| **Auto Loan Statements** | AutoLoanAgent | Verify installment debt |
| **Student Loan Statements** | StudentLoanAgent | Verify education debt |
| **Mortgage Statements** | MortgageAgent | Verify existing mortgage debt |

### Compliance & Authorization
| Document Type | AI Agent | Purpose |
|--------------|----------|---------|
| **Authorization/Consent** | AuthorizationsAgent | Credit check, employment verification consent |
| **Disclosures** | DisclosuresAgent | Regulatory disclosure acknowledgments |

---

## Test Users - Detailed Specifications

### Password for ALL test accounts: `Test123!`

---

## 1. APPROVED - Strong W-2 Employee

**Email**: `approved.w2@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | Michael Johnson |
| DOB | 1985-03-15 |
| SSN | XXX-XX-3333 |
| Employment | Senior Software Engineer at TechCorp Solutions Inc. |
| Annual Income | $125,000 |
| Monthly Debt | $500 |
| Credit Score | Excellent (750+) |
| Loan Amount | $450,000 |
| Property | 456 Dream Home Dr, Boulder, CO 80301 |
| Occupancy | Primary Residence |

### Expected Outcome
**APPROVED** - DTI ~15%, excellent credit, stable employment

### Why Approved
- Low DTI ratio (well under 43% cap)
- Excellent credit score (above 750 floor)
- Stable W2 employment
- Standard 30-year fixed conventional loan

### Required Documents
- ✅ Driver's License
- ✅ 2 Pay Stubs (recent)
- ✅ 2 W-2 Forms (2023, 2024)
- ✅ Tax Returns (2023, 2024) - high income over $100k
- ✅ 3 Bank Statements (3 months)
- ✅ Purchase Agreement
- ✅ Credit Card Statement - Chase Visa ($150/mo)
- ✅ Auto Loan Statement - Ford Credit ($350/mo)
- ✅ Authorization/Consent Form

### Liability Breakdown ($500/month total)
| Liability | Creditor | Balance | Monthly Payment |
|-----------|----------|---------|-----------------|
| Credit Card | Chase Visa | $4,000 | $150 |
| Auto Loan | Ford Credit | $20,000 | $350 |

---

## 2. APPROVED - Dual Income Household

**Email**: `approved.dual@test.com`

### Profile - Primary Borrower
| Field | Value |
|-------|-------|
| Name | Sarah Williams |
| DOB | 1988-07-22 |
| SSN | XXX-XX-4444 |
| Employment | RN Manager at Healthcare Partners LLC |
| Annual Income | $95,000 |
| Monthly Debt | $800 |
| Credit Score | Good (700-749) |

### Profile - Co-Borrower
| Field | Value |
|-------|-------|
| Name | David Williams |
| DOB | 1986-11-10 |
| SSN | XXX-XX-5555 |
| Annual Income | $85,000 |

### Loan Details
| Field | Value |
|-------|-------|
| Combined Income | $180,000 |
| Loan Amount | $380,000 |
| Property | 321 Family Way, Lakewood, CO 80226 |
| Occupancy | Primary Residence |

### Expected Outcome
**APPROVED** - Combined income $180k, moderate debt, good credit

### Why Approved
- Combined income creates strong DTI
- Both borrowers have stable employment
- Good credit from primary borrower
- Standard conventional loan

### Required Documents (Primary + Co-Borrower)
- ✅ 2 Driver's Licenses
- ✅ 4 Pay Stubs (2 per borrower)
- ✅ 4 W-2 Forms (2 years x 2 borrowers)
- ✅ 6 Bank Statements (3 months x 2 borrowers)
- ✅ Purchase Agreement
- ✅ Auto Loan Statement - Honda Financial ($500/mo)
- ✅ Credit Card Statement - Discover ($200/mo)
- ✅ Student Loan Statement - Great Lakes ($100/mo)
- ✅ Authorization/Consent Form (both borrowers)

### Liability Breakdown ($800/month total)
| Liability | Creditor | Balance | Monthly Payment |
|-----------|----------|---------|-----------------|
| Auto Loan | Honda Financial | $18,000 | $500 |
| Credit Card | Discover | $4,500 | $200 |
| Student Loan | Great Lakes | $12,000 | $100 |

---

## 3. APPROVED - Self-Employed Business Owner

**Email**: `approved.selfemployed@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | Robert Chen |
| DOB | 1975-01-30 |
| SSN | XXX-XX-6666 |
| Business | Chen Consulting Group (100% ownership) |
| Annual Revenue | $320,000 |
| Net Profit (Income) | $175,000 |
| Monthly Debt | $1,200 |
| Credit Score | Excellent (750+) |
| Loan Amount | $550,000 |
| Property | 888 Executive Ct, Cherry Hills, CO 80113 |

### Expected Outcome
**APPROVED** - High income, requires self-employment documentation

### Why Approved
- Strong net profit from established business
- Excellent credit score
- Business operating since 2018 (6+ years)
- DTI within guidelines

### Required Documents
- ✅ Driver's License
- ✅ 2 P&L Statements (2024, 2025 YTD)
- ✅ 2 Tax Returns (2023, 2024) - Personal
- ✅ 2 Business Tax Returns (Schedule C)
- ✅ 3 Bank Statements (business account)
- ✅ 3 Bank Statements (personal account)
- ✅ Purchase Agreement
- ✅ Auto Loan Statement - BMW Financial ($750/mo)
- ✅ Credit Card Statement - Chase Sapphire Reserve ($250/mo)
- ✅ Credit Card Statement - Amex Platinum ($200/mo)
- ✅ Authorization/Consent Form

### Liability Breakdown ($1,200/month total)
| Liability | Creditor | Balance | Monthly Payment |
|-----------|----------|---------|-----------------|
| Auto Loan | BMW Financial Services | $42,000 | $750 |
| Credit Card | Chase Sapphire Reserve | $6,500 | $250 |
| Credit Card | Amex Platinum | $4,000 | $200 |

---

## 4. APPROVED - Military/VA Eligible

**Email**: `approved.veteran@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | James Anderson |
| DOB | 1982-09-05 |
| SSN | XXX-XX-7777 |
| Employment | Security Analyst at Federal Security Services |
| Annual Income | $85,000 |
| Monthly Debt | $400 |
| Credit Score | Good (700-749) |
| Military Service | U.S. Army 2010-2020 (Honorable Discharge) |
| Loan Amount | $280,000 |
| Property | 200 Service Rd, Colorado Springs, CO 80910 |

### Expected Outcome
**APPROVED** - VA loan eligible, DTI ~39%, no PMI required

### Why Approved
- Veteran with honorable discharge
- VA loan benefits (no down payment, no PMI)
- Stable post-military employment
- DTI within VA guidelines (can go up to 41%)

### Required Documents
- ✅ Driver's License
- ✅ Military ID (optional, supports veteran status)
- ✅ VA Certificate of Eligibility (COE)
- ✅ 2 Pay Stubs
- ✅ 2 W-2 Forms
- ✅ 3 Bank Statements
- ✅ DD-214 (Discharge papers)
- ✅ Purchase Agreement
- ✅ Auto Loan Statement - USAA Auto Finance ($280/mo)
- ✅ Credit Card Statement - USAA Visa ($120/mo)
- ✅ Authorization/Consent Form

### Liability Breakdown ($400/month total)
| Liability | Creditor | Balance | Monthly Payment |
|-----------|----------|---------|-----------------|
| Auto Loan | USAA Auto Finance | $12,000 | $280 |
| Credit Card | USAA Visa | $1,500 | $120 |

---

## 5. DENIED - High DTI Ratio

**Email**: `denied.highdti@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | Kevin Miller |
| DOB | 1990-05-18 |
| SSN | XXX-XX-8888 |
| Employment | Store Manager at Retail Corp Inc. |
| Annual Income | $55,000 |
| Monthly Debt | $2,500 (extremely high) |
| Credit Score | Fair (650-699) |
| Loan Amount | $350,000 (too high for income) |
| Property | 444 Wishful Thinking Ln, Denver, CO 80220 |

### Existing Liabilities
| Type | Company | Balance | Monthly Payment |
|------|---------|---------|-----------------|
| Revolving | Credit Card A | $15,000 | $450 |
| Installment | Auto Loan | $28,000 | $650 |
| Installment | Student Loans | $45,000 | $550 |
| Revolving | Credit Card B | $8,000 | $240 |

### Expected Outcome
**DENIED** - DTI exceeds 50%, high existing debt burden

### Why Denied
- DTI calculation: ($2,500 + ~$2,275 mortgage) / ($55,000/12) = **104%** DTI
- Way above 43% cap for conventional loans
- High credit card utilization
- Insufficient income for loan amount

### Required Documents (ALL documents present, still denied)
- ✅ Driver's License
- ✅ 2 Pay Stubs
- ✅ 2 W-2 Forms
- ✅ 3 Bank Statements
- ✅ Credit Card Statement A
- ✅ Credit Card Statement B
- ✅ Auto Loan Statement
- ✅ Student Loan Statement
- ✅ Purchase Agreement
- ✅ Authorization/Consent Form

**Note**: This user has ALL documentation. The denial is specifically for DTI ratio, not missing docs.

---

## 6. DENIED - Poor Credit History

**Email**: `denied.badcredit@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | Lisa Thompson |
| DOB | 1992-12-03 |
| SSN | XXX-XX-9999 |
| Employment | Medical Technician at City Hospital |
| Annual Income | $72,000 |
| Monthly Debt | $600 |
| Credit Score | Poor (Below 620) |
| Loan Amount | $220,000 |
| Property | 333 Second Chance Dr, Littleton, CO 80120 |

### Credit Issues
- Recent Chapter 7 Bankruptcy (within 48 months)
- Credit score below 640 minimum floor
- Multiple derogatory marks

### Expected Outcome
**DENIED** - Credit score below 640 floor, bankruptcy seasoning period not met

### Why Denied
- Credit score is below 640 minimum for conventional loans
- Bankruptcy within 48 months (per Product_Overlay_Guide requirement)
- Even though DTI would be acceptable (~30%), credit disqualifies

### Required Documents (ALL documents present, still denied)
- ✅ Driver's License
- ✅ 2 Pay Stubs
- ✅ 2 W-2 Forms
- ✅ 3 Bank Statements
- ✅ Credit Card Statement - Wells Fargo ($150/mo)
- ✅ Auto Loan Statement - Santander ($350/mo)
- ✅ Student Loan Statement - Mohela ($100/mo)
- ✅ Purchase Agreement
- ✅ Authorization/Consent Form

### Liability Breakdown ($600/month total)
| Liability | Creditor | Balance | Monthly Payment |
|-----------|----------|---------|-----------------|
| Credit Card | Wells Fargo | $3,500 | $150 |
| Auto Loan | Santander | $18,000 | $350 |
| Student Loan | Mohela | $8,000 | $100 |

**Note**: This user has ALL documentation. The denial is specifically for credit issues.

---

## 7. DENIED - Insufficient Income Documentation

**Email**: `denied.nodocs@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | Tyler Martinez |
| DOB | 1995-08-25 |
| SSN | XXX-XX-0000 |
| Employment | Gig Worker (claims $85,000) |
| Monthly Debt | $300 |
| Credit Score | Good (700-749) |
| Loan Amount | $300,000 |
| Property | 555 App Economy Ave, Denver, CO 80206 |

### Expected Outcome
**DENIED** - Cannot verify income, no consistent employment history

### Why Denied
- No W-2s (gig worker)
- No consistent pay stubs
- Cannot provide 2 years of tax returns
- Income cannot be verified per URLA requirements

### Required Documents
- ❌ NO DOCUMENTS UPLOADED

**Note**: This user specifically tests the "missing documentation" scenario. The AI agents should flag this as missing critical income verification, ID, and asset documentation.

---

## 8. EDGE CASE - Investment Property

**Email**: `edge.investment@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | David Park |
| DOB | 1978-04-12 |
| SSN | XXX-XX-1111 |
| Employment | Portfolio Manager at Investment Strategies LLC |
| Annual Income | $145,000 |
| Monthly Debt | $2,800 (existing mortgages) |
| Credit Score | Excellent (750+) |
| Loan Amount | $280,000 |
| Property | 999 Rental Income Rd, Aurora, CO 80012 |
| Occupancy | **Investment Property** |

### Existing Properties
| Property | Status | Mortgage | Monthly Payment | Rental Income |
|----------|--------|----------|-----------------|---------------|
| 777 Landlord Lane, Denver | Primary Residence | $280,000 | $1,800 | - |
| 888 Second Property, Denver | Investment | $200,000 | $1,400 | $2,100 |

### Expected Outcome
**APPROVED WITH CONDITIONS** - Higher rate for investment property, 25% down required

### Why Conditional
- Investment property requires 25% down (vs 20% for primary)
- Higher interest rate for investment properties
- Must have 700+ credit score for investment (✓ has 750+)
- Rental income from existing property helps offset debt

### Required Documents
- ✅ Driver's License
- ✅ 2 Pay Stubs
- ✅ 2 W-2 Forms
- ✅ 2 Tax Returns (2023, 2024) - required for investment
- ✅ P&L Statements - shows rental income
- ✅ 3 Bank Statements
- ✅ Consolidated Mortgage Statement (all properties)
- ✅ Rental Income Verification
- ✅ Lease Agreement (for existing rental)
- ✅ Purchase Agreement (for new investment property)
- ✅ Credit Card Statement - Chase Freedom ($150/mo)
- ✅ Credit Card Statement - Amex Gold ($150/mo)
- ✅ Authorization/Consent Form

### Liability Breakdown ($2,800/month total)
| Liability | Creditor | Balance | Monthly Payment |
|-----------|----------|---------|-----------------|
| Mortgage 1 | Wells Fargo | $280,000 | $1,400 |
| Mortgage 2 | Chase Bank | $200,000 | $1,100 |
| Credit Card | Chase Freedom | $4,000 | $150 |
| Credit Card | Amex Gold | $3,000 | $150 |

---

## 9. EDGE CASE - Refinance Scenario

**Email**: `edge.refinance@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | Jennifer White |
| DOB | 1970-11-28 |
| SSN | XXX-XX-2222 |
| Employment | Principal at Education First Academy |
| Annual Income | $92,000 |
| Monthly Debt | $800 (non-housing) |
| Credit Score | Good (700-749) |
| Loan Amount | $285,000 (refinance) |
| Property | 456 Lower Rate Dr, Highlands Ranch, CO 80129 |
| Current Rate | 6.5% |
| Property Value | $425,000 |

### Current Mortgage Details
| Field | Value |
|-------|-------|
| Current Balance | $285,000 |
| Current Payment | $1,850 |
| Current Rate | 6.5% |
| LTV | ~67% |

### Expected Outcome
**APPROVED** - Rate/term refinance, LTV ~67%, DTI ~39%

### Why Approved
- Strong equity position (33% equity)
- Rate reduction saves money
- Stable long-term employment
- Good credit score
- DTI within guidelines

### Required Documents
- ✅ Driver's License
- ✅ 2 Pay Stubs
- ✅ 2 W-2 Forms
- ✅ 3 Bank Statements
- ✅ Current Mortgage Statement (being refinanced - Quicken Loans)
- ✅ Auto Loan Statement - Honda Financial ($400/mo)
- ✅ Credit Card Statement - Citi Double Cash ($200/mo)
- ✅ Credit Card Statement - Target RedCard ($100/mo)
- ✅ Student Loan Statement - FedLoan ($100/mo)
- ✅ Homeowner's Insurance Declaration
- ✅ Property Tax Statement
- ✅ Authorization/Consent Form

### Liability Breakdown ($800/month total - non-housing)
| Liability | Creditor | Balance | Monthly Payment |
|-----------|----------|---------|-----------------|
| Auto Loan | Honda Financial | $15,000 | $400 |
| Credit Card | Citi Double Cash | $5,000 | $200 |
| Credit Card | Target RedCard | $2,000 | $100 |
| Student Loan | FedLoan | $8,000 | $100 |

**Note**: NO Purchase Agreement needed (this is a refinance)

---

## 10. EDGE CASE - Gift Funds for Down Payment

**Email**: `edge.giftfunds@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | Emily Garcia |
| DOB | 1993-06-14 |
| SSN | XXX-XX-8901 |
| Employment | Marketing Coordinator at Denver Media Group |
| Annual Income | $72,000 |
| Monthly Debt | $350 |
| Credit Score | Good (700-749) |
| Loan Amount | $240,000 |
| Property | 789 Starter Home Ct, Thornton, CO 80229 |

### Assets
| Type | Institution | Balance |
|------|-------------|---------|
| Checking | Local Credit Union | $8,500 |
| Savings | Local Credit Union | $12,000 |
| **Gift from Parents** | - | $35,000 |

### Gift Details
| Field | Value |
|-------|-------|
| Donor | Maria Garcia (Mother) |
| Relationship | Parent |
| Amount | $35,000 |
| Purpose | Down payment |
| Repayment Expected | NO (critical requirement) |

### Expected Outcome
**APPROVED** - First-time buyer, DTI ~38%, gift letter required

### Why Approved
- Gift funds acceptable for down payment (from family member)
- Combined assets sufficient for closing
- Gift letter confirms no repayment expected
- DTI within guidelines
- Good credit score

### Why Gift Letter is Essential
- Without the $35,000 gift, Emily only has $20,500 in personal assets
- On a $300,000 home with 20% down, she'd need $60,000+
- The gift makes the purchase possible
- This is the "edge case" - without the gift, she wouldn't qualify

### Required Documents
- ✅ Driver's License
- ✅ 2 Pay Stubs
- ✅ 2 W-2 Forms
- ✅ 3 Bank Statements (personal accounts)
- ✅ Donor Bank Statement (proof of gift funds)
- ✅ **Gift Letter** (signed by donor and recipient)
- ✅ Credit Card Statement - Bank of America ($150/mo)
- ✅ Student Loan Statement - Nelnet ($200/mo)
- ✅ Purchase Agreement
- ✅ Authorization/Consent Form

### Liability Breakdown ($350/month total)
| Liability | Creditor | Balance | Monthly Payment |
|-----------|----------|---------|-----------------|
| Credit Card | Bank of America | $2,200 | $150 |
| Student Loan | Nelnet | $18,000 | $200 |

---

## 11. EDGE CASE - Non-Permanent Resident Alien

**Email**: `edge.nonresident@test.com`

### Profile
| Field | Value |
|-------|-------|
| Name | Hiroshi Tanaka |
| DOB | 1989-02-20 |
| SSN | XXX-XX-9012 |
| Citizenship | Non-Permanent Resident Alien |
| Visa Type | H-1B |
| Visa Expiration | December 31, 2026 |
| Country of Origin | Japan |
| Employment | Senior Consultant at Global Tech Partners |
| Annual Income | $135,000 |
| Monthly Debt | $400 |
| Credit Score | Excellent (750+) |
| Loan Amount | $420,000 |
| Property | 600 Tech Hub Blvd, Denver, CO 80202 |

### Expected Outcome
**CONDITIONAL** - DTI ~33%, requires work authorization verification

### Why Conditional (Not Outright Approved)
- Non-permanent resident status requires additional verification
- Visa expiration must be monitored
- Employment Authorization Document (EAD) may be required
- Lender may require additional reserves

### Conditions for Approval
1. Valid passport with H-1B visa stamp
2. Current I-94 arrival/departure record
3. Employment verification with visa status confirmation
4. Additional 3 months reserves (beyond normal requirements)

### Required Documents
- ✅ Passport (with visa stamp)
- ✅ I-94 Arrival/Departure Record
- ✅ H-1B Approval Notice (I-797)
- ✅ 2 Pay Stubs
- ✅ 2 W-2 Forms
- ✅ 3 Bank Statements
- ✅ Auto Loan Statement - Toyota Financial ($400/mo)
- ✅ Purchase Agreement
- ✅ Employment Verification Letter (confirming visa status)
- ✅ Authorization/Consent Form

### Liability Breakdown ($400/month total)
| Liability | Creditor | Balance | Monthly Payment |
|-----------|----------|---------|-----------------|
| Auto Loan | Toyota Financial | $22,000 | $400 |

---

## Summary Matrix

| Email | Scenario | Expected Result | Key Documents |
|-------|----------|-----------------|---------------|
| approved.w2@test.com | Strong W-2 Employee | ✅ APPROVED | Standard package |
| approved.dual@test.com | Dual Income | ✅ APPROVED | Dual borrower docs |
| approved.selfemployed@test.com | Self-Employed | ✅ APPROVED | P&L, Tax Returns |
| approved.veteran@test.com | VA Loan | ✅ APPROVED | VA COE, Military ID |
| denied.highdti@test.com | High DTI | ❌ DENIED (DTI) | All docs + liabilities |
| denied.badcredit@test.com | Poor Credit | ❌ DENIED (Credit) | All docs present |
| denied.nodocs@test.com | Missing Docs | ❌ DENIED (No Docs) | NO documents |
| edge.investment@test.com | Investment Property | ⚠️ CONDITIONAL | Rental income, mortgages |
| edge.refinance@test.com | Refinance | ✅ APPROVED | Current mortgage |
| edge.giftfunds@test.com | Gift Funds | ✅ APPROVED | Gift letter, donor proof |
| edge.nonresident@test.com | Non-Resident | ⚠️ CONDITIONAL | Passport, visa docs |

---

## Document Generation Notes

### Files Generated per User

For W-2 employees, generate:
- 2 pay stubs (most recent pay periods)
- 2 W-2 forms (2023, 2024)
- 3 bank statements (Oct, Nov, Dec)
- Driver's license or passport
- Liability statements as applicable

For Self-Employed, generate:
- 2 P&L statements (2024, 2025 YTD)
- 2 tax returns (1040 + Schedule C)
- 3 bank statements (personal and business)
- Driver's license

### All Test Documents Include
- "SAMPLE DOCUMENT" watermark
- "FOR TESTING PURPOSES ONLY" disclaimer
- Clearly marked as non-valid for actual applications

---

## Running the Test Data Scripts

```bash
# 1. Generate all test documents
node scripts/generateTestDocs.js

# 2. Seed user data to database
node scripts/seedTestData.js

# 3. Upload documents to Azure and link to users
node scripts/uploadTestDocs.js

# 4. Verify everything is correctly linked
node scripts/verifyDocs.js
```

---

*Last Updated: January 2026*

