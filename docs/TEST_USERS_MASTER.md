# 🏠 Comprehensive Test Users Documentation

This document provides a complete reference for all 41 test users in the mortgage application system. Each user represents a specific scenario designed to test different aspects of the loan approval workflow.

> **Note:** VA, FHA, and DPA (Down Payment Assistance) loan types are not supported in Danish realkredit style loans and have been removed from test scenarios.

---

## 📊 Quick Reference Table

| # | Email | Category | Expected Outcome | Key Scenario |
|---|-------|----------|------------------|--------------|
| 1 | `approved.w2@test.com` | ✅ Approved | APPROVED | Strong W-2 employee |
| 2 | `approved.dual@test.com` | ✅ Approved | APPROVED | Dual income household |
| 3 | `approved.selfemployed@test.com` | ✅ Approved | APPROVED | Self-employed business owner |
| 4 | `approved.conditional@test.com` | ✅ Approved | APPROVED | Conditional → Cleared |
| 5 | `approved.plaid@test.com` | ✅ Approved | APPROVED | Plaid-verified assets |
| 6 | `coborrower.nonoccupant@test.com` | ✅ Approved | APPROVED | Non-occupant co-signer |
| 7 | `denied.highdti@test.com` | ❌ Denied | DENIED | DTI > 50% |
| 8 | `denied.badcredit@test.com` | ❌ Denied | DENIED | Credit < 640, BK < 48mo |
| 9 | `denied.nodocs@test.com` | ❌ Denied | DENIED | Missing documentation |
| 10 | `denied.bankruptcyrecent@test.com` | ❌ Denied | DENIED | BK < 48 months |
| 11 | `denied.lates30@test.com` | ❌ Denied | DENIED | 30-day mortgage late |
| 12 | `denied.lates60@test.com` | ❌ Denied | DENIED | 60-day mortgage late |
| 13 | `denied.judgment@test.com` | ❌ Denied | DENIED | Unresolved judgment |
| 14 | `denied.secondhomecredit@test.com` | ❌ Denied | DENIED | Second home credit < 660 |
| 15 | `denied.investmentcredit@test.com` | ❌ Denied | DENIED | Investment credit < 700 |
| 16 | `product.15year@test.com` | 📦 Product | APPROVED | 15-Year Fixed loan |
| 17 | `product.arm5@test.com` | 📦 Product | APPROVED | ARM F5 (5-year reset) |
| 18 | `product.arm1@test.com` | 📦 Product | APPROVED | ARM F1 (1-year reset) |
| 19 | `occupancy.secondhome@test.com` | 📦 Product | APPROVED | Second home purchase |
| 20 | `income.1099@test.com` | 💼 Income | APPROVED | 1099 contractor |
| 21 | `income.commission@test.com` | 💼 Income | APPROVED | Variable/commission W-2 |
| 22 | `income.multiple@test.com` | 💼 Income | APPROVED | W-2 + 1099 + Rental |
| 23 | `income.retired@test.com` | 💼 Income | APPROVED | Pension + 401k |
| 24 | `income.socialsecurity@test.com` | 💼 Income | APPROVED | Social Security only |
| 25 | `income.alimony@test.com` | 💼 Income | APPROVED | Alimony + child support |
| 26 | `edge.newjob@test.com` | 💼 Income | CONDITIONAL | Job < 24 months |
| 27 | `edge.investment@test.com` | 🔶 Edge | APPROVED | Investment property |
| 28 | `edge.refinance@test.com` | 🔶 Edge | APPROVED | Rate/term refinance |
| 29 | `edge.giftfunds@test.com` | 🔶 Edge | APPROVED | Gift funds for down payment |
| 30 | `edge.nonresident@test.com` | 🔶 Edge | CONDITIONAL | H-1B visa holder |
| 31 | `edge.creditfloor@test.com` | 🔶 Edge | APPROVED | Credit exactly at 640 |
| 32 | `edge.bankruptcy@test.com` | 🔶 Edge | APPROVED | BK 52 months (seasoned) |
| 33 | `edge.foreclosure@test.com` | 🔶 Edge | APPROVED | Foreclosure 50mo (seasoned) |
| 34 | `edge.dti43@test.com` | 🔶 Edge | APPROVED | DTI exactly at 43% |
| 35 | `edge.reservesfloor@test.com` | 🔶 Edge | APPROVED | Reserves at 2mo minimum |
| 36 | `edge.largedeposit@test.com` | 🔶 Edge | CONDITIONAL | $55k deposit requiring source |
| 37 | `edge.highutilization@test.com` | 🔶 Edge | APPROVED | 88% credit utilization |
| 38 | `edge.nsf@test.com` | 🔶 Edge | CONDITIONAL | NSF incidents on statements |
| 39 | `edge.deferredloans@test.com` | 🔶 Edge | APPROVED | Student loans in deferment |
| 40 | `edge.multiplereo@test.com` | 🔶 Edge | APPROVED | 3+ financed properties |
| 41 | `edge.sellerconcession@test.com` | 🔶 Edge | APPROVED | 3% seller concession |
| 42 | `edge.trust@test.com` | 🔶 Edge | APPROVED | Property in revocable trust |
| 43 | `stage1.preapproval@test.com` | 📋 Stage | PRE-APPROVED | Stage 1 only (no property) |

**All test accounts use password: `Test123!`**

---

## 📁 SECTION 1: APPROVED SCENARIOS (6 Users)

These users represent ideal or straightforward approval scenarios.

---

### 1. `approved.w2@test.com` - Strong W-2 Employee

**Profile:**
| Field | Value |
|-------|-------|
| Name | Michael Johnson |
| Income | $125,000/year (W-2) |
| Monthly Debt | $500 |
| Credit Score | 750+ (Excellent) |
| Loan Amount | $450,000 |
| Occupancy | Primary Residence |
| Product | 30-Year Fixed |

**DTI Calculation:**
- Monthly Income: $10,417
- Housing Payment: ~$2,700 (estimated PITIA)
- Other Debt: $500
- Total DTI: ~31%

**Purpose:** Tests standard, clean approval path for a salaried employee with excellent credit.

**Documents Required:**
- 2 pay stubs, 2 W-2s, 2 tax returns
- 3 months bank statements
- Credit card statement, auto loan statement
- Purchase agreement, authorization form

**Expected AI Agent Flags:** None - clean approval

---

### 2. `approved.dual@test.com` - Dual Income Household

**Profile:**
| Field | Value |
|-------|-------|
| Primary Borrower | Sarah Williams |
| Co-Borrower | David Williams |
| Combined Income | $180,000/year |
| Monthly Debt | $800 |
| Credit Score | 700-749 (Good) |
| Loan Amount | $380,000 |
| Type of Credit | Joint |

**Purpose:** Tests co-borrower income stacking and joint credit applications.

**Expected AI Agent Flags:** None - combined income easily qualifies

---

### 3. `approved.selfemployed@test.com` - Self-Employed Business Owner

**Profile:**
| Field | Value |
|-------|-------|
| Name | Robert Chen |
| Business | Chen Consulting Group |
| Net Income | $175,000/year |
| Ownership | 100% |
| Credit Score | 750+ (Excellent) |
| Loan Amount | $550,000 |

**Purpose:** Tests self-employed income verification, P&L requirements, and 2-year business history verification.

**Documents Required:**
- 2 years tax returns
- YTD P&L statement
- 3 months bank statements (personal + business)

**Expected AI Agent Flags:** 
- `IncomeAgent`: Will verify 2-year SE history
- `IncomeAgent`: Will average income over 24 months

---

### 4. `approved.conditional@test.com` - Conditional then Cleared

**Profile:**
| Field | Value |
|-------|-------|
| Name | Patricia Nelson |
| Income | $88,000/year |
| Loan Amount | $320,000 |

**Purpose:** Tests the conditional approval → cleared to close workflow. Simulates a scenario where initial conditions (like updated paystubs) are satisfied.

**Expected AI Agent Flags:** Initially conditional, then cleared after documentation updated

---

### 6. `approved.plaid@test.com` - Plaid Verified Assets

**Profile:**
| Field | Value |
|-------|-------|
| Name | Andrew Mitchell |
| Income | $105,000/year |
| Loan Amount | $380,000 |
| Asset Verification | Plaid-linked |

**Purpose:** Tests Plaid integration for automated asset verification without manual bank statement uploads.

**Expected AI Agent Flags:**
- `AssetAgent`: Assets verified via Plaid API

---

### 6. `coborrower.nonoccupant@test.com` - Non-Occupant Co-Signer

**Profile:**
| Field | Value |
|-------|-------|
| Primary | Michelle Taylor ($52,000/year) |
| Co-Signer | Richard Taylor ($95,000/year) |
| Co-Signer Role | Non-occupant |
| Loan Amount | $280,000 |

**Purpose:** Tests non-occupant co-signer income inclusion and occupancy rules.

**Expected AI Agent Flags:**
- Non-occupant co-signer verified
- Primary borrower is occupant

---

## 📁 SECTION 2: DENIED SCENARIOS (9 Users)

These users have complete documentation but are denied for specific policy reasons.

---

### 9. `denied.highdti@test.com` - High DTI Ratio

**Profile:**
| Field | Value |
|-------|-------|
| Name | Kevin Miller |
| Income | $55,000/year |
| Monthly Debt | $2,500 |
| Loan Amount | $350,000 |

**DTI Calculation:**
- Monthly Income: $4,583
- Existing Debt: $2,500
- Housing Payment: ~$2,100
- Total DTI: **100%+** ❌

**Purpose:** Tests DTI > 43% rejection with complete documentation.

**Expected AI Agent Flags:**
- `DTIAgent`: DTI exceeds 43% maximum
- `DENIAL`: High debt-to-income ratio

**Denial Reason:** DTI exceeds 50%, debt burden too high

---

### 10. `denied.badcredit@test.com` - Poor Credit History

**Profile:**
| Field | Value |
|-------|-------|
| Name | Lisa Thompson |
| Credit Score | Below 620 |
| Bankruptcy | Chapter 7, 24 months ago |

**Purpose:** Tests credit floor rejection (640 for primary) and bankruptcy seasoning requirements (48 months required).

**Expected AI Agent Flags:**
- `CreditAgent`: Credit score below 640 floor
- `CreditAgent`: Bankruptcy < 48 months seasoning
- `DENIAL`: Does not meet credit requirements

---

### 11. `denied.nodocs@test.com` - Insufficient Documentation

**Profile:**
| Field | Value |
|-------|-------|
| Name | Tyler Martinez |
| Employment | Gig Worker |
| Claimed Income | $85,000/year |

**Purpose:** Tests missing documentation rejection. This user has **NO uploaded documents**.

**Expected AI Agent Flags:**
- `IncomeAgent`: Cannot verify income
- `AssetAgent`: No bank statements provided
- `IdentificationAgent`: No ID provided
- `DENIAL`: Missing required documentation

**Note:** This is the ONLY test user intentionally without documents.

---

### 12. `denied.bankruptcyrecent@test.com` - Recent Bankruptcy

**Profile:**
| Field | Value |
|-------|-------|
| Name | Brandon Davis |
| Bankruptcy | Chapter 7, 36 months ago |
| Required Seasoning | 48 months |

**Purpose:** Tests bankruptcy seasoning requirement (48 months required, only 36 months elapsed).

**Expected AI Agent Flags:**
- `CreditAgent`: Bankruptcy 36 months ago
- `DENIAL`: BK requires 48 month seasoning

---

### 13. `denied.lates30@test.com` - 30-Day Mortgage Late

**Profile:**
| Field | Value |
|-------|-------|
| Name | Amanda Wilson |
| Loan Purpose | Refinance |
| Mortgage Lates | 1x 30-day in past 12 months |

**Purpose:** Tests mortgage late payment policy (no 30-day lates in 12 months).

**Expected AI Agent Flags:**
- `MortgageAgent`: 30-day late in past 12 months
- `DENIAL`: Policy violation

---

### 14. `denied.lates60@test.com` - 60-Day Mortgage Late

**Profile:**
| Field | Value |
|-------|-------|
| Name | Christopher Martin |
| Loan Purpose | Refinance |
| Mortgage Lates | 1x 60-day in past 24 months |

**Purpose:** Tests 60-day mortgage late policy (no 60-day lates in 24 months).

**Expected AI Agent Flags:**
- `MortgageAgent`: 60-day late in past 24 months
- `DENIAL`: Policy violation

---

### 15. `denied.judgment@test.com` - Unresolved Judgment

**Profile:**
| Field | Value |
|-------|-------|
| Name | Daniel Garcia |
| Outstanding Judgment | $12,500 |

**Purpose:** Tests outstanding judgment rejection (must be resolved before approval).

**Expected AI Agent Flags:**
- `CreditAgent`: Unresolved judgment of $12,500
- `DENIAL`: Outstanding judgment must be resolved

---

### 16. `denied.secondhomecredit@test.com` - Second Home Credit Floor

**Profile:**
| Field | Value |
|-------|-------|
| Name | Stephanie Lee |
| Credit Score | 655 |
| Occupancy | Second Home |
| Required Credit | 660+ |

**Purpose:** Tests second home credit floor requirement (660 minimum, applicant at 655).

**Expected AI Agent Flags:**
- `CreditAgent`: Credit 655 < 660 floor for second home
- `DENIAL`: Does not meet credit requirements

---

### 17. `denied.investmentcredit@test.com` - Investment Property Credit Floor

**Profile:**
| Field | Value |
|-------|-------|
| Name | Gregory Adams |
| Credit Score | 695 |
| Occupancy | Investment |
| Required Credit | 700+ |

**Purpose:** Tests investment property credit floor (700 minimum, applicant at 695).

**Expected AI Agent Flags:**
- `CreditAgent`: Credit 695 < 700 floor for investment
- `DENIAL`: Does not meet credit requirements

---

## 📁 SECTION 3: PRODUCT VARIATIONS (4 Users)

These users test different loan products and terms.

---

### 18. `product.15year@test.com` - 15-Year Fixed

**Profile:**
| Field | Value |
|-------|-------|
| Name | Catherine Wright |
| Income | $165,000/year |
| Loan Amount | $400,000 |
| Product | 15-Year Fixed |
| Credit Floor | 650 |

**Purpose:** Tests 15-year fixed product with higher monthly payment but lower rate.

**Expected AI Agent Flags:**
- Higher monthly payment calculated at 15-year amortization
- Rate typically lower than 30-year

---

### 19. `product.arm5@test.com` - ARM F5 (5-Year Reset)

**Profile:**
| Field | Value |
|-------|-------|
| Name | Thomas Baker |
| Income | $145,000/year |
| Loan Amount | $520,000 |
| Product | ARM F5 |
| DTI Cap | 43% |

**Purpose:** Tests ARM F5 product with 5-year initial fixed period.

**Qualifying Rate:** max(fully indexed rate, note rate + 100bps)

**Expected AI Agent Flags:**
- ARM product identified
- Qualifying rate calculation verified

---

### 20. `product.arm1@test.com` - ARM F1 (1-Year Reset)

**Profile:**
| Field | Value |
|-------|-------|
| Name | Rebecca Hill |
| Income | $178,000/year |
| Loan Amount | $480,000 |
| Product | ARM F1 |
| DTI Cap | 41% |
| Reserves | 1.5x base |

**Purpose:** Tests ARM F1 with tighter DTI (41%) and higher reserve requirements (1.5x).

**Expected AI Agent Flags:**
- Tighter DTI cap applied
- 1.5x reserves required

---

### 21. `occupancy.secondhome@test.com` - Second Home Purchase

**Profile:**
| Field | Value |
|-------|-------|
| Name | William Scott |
| Income | $185,000/year |
| Loan Amount | $450,000 |
| Occupancy | Second Home |
| Location | Breckenridge, CO |
| Credit Floor | 660 |
| Reserves | 6 months PITIA |

**Purpose:** Tests second home underwriting with higher credit floor and reserve requirements.

**Expected AI Agent Flags:**
- Second home occupancy verified
- 6-month reserves confirmed

---

## 📁 SECTION 4: INCOME TYPE VARIATIONS (7 Users)

These users test different income documentation scenarios.

---

### 22. `income.1099@test.com` - 1099 Contractor

**Profile:**
| Field | Value |
|-------|-------|
| Name | Jennifer Moore |
| Income | $125,000/year (1099) |
| Employment | Independent Consultant |

**Purpose:** Tests 1099 contractor income verification requiring 2 years of 1099s and tax returns.

**Documents Required:**
- 2 years 1099 forms
- 2 years tax returns
- P&L statement

**Expected AI Agent Flags:**
- `IncomeAgent`: 1099 income averaged over 24 months

---

### 23. `income.commission@test.com` - Variable/Commission W-2

**Profile:**
| Field | Value |
|-------|-------|
| Name | Mark Robinson |
| Base Income | $65,000/year |
| Commission | $80,000/year |
| Total | $145,000/year |

**Purpose:** Tests variable/commission income averaging over 24 months per policy.

**Expected AI Agent Flags:**
- `IncomeAgent`: Variable income detected
- `IncomeAgent`: 24-month average applied

---

### 24. `income.multiple@test.com` - Multiple Income Sources

**Profile:**
| Field | Value |
|-------|-------|
| Name | Elizabeth Clark |
| W-2 Income | $95,000/year |
| 1099 Consulting | $35,000/year |
| Rental Income | $24,000/year |
| Total | $154,000/year |

**Purpose:** Tests multiple income source verification and aggregation.

**Expected AI Agent Flags:**
- Each income source verified separately
- Rental income requires 12-month history

---

### 25. `income.retired@test.com` - Retirement/Pension Income

**Profile:**
| Field | Value |
|-------|-------|
| Name | Robert Lewis |
| Pension | $48,000/year |
| 401k Distribution | $24,000/year |
| Total | $72,000/year |

**Purpose:** Tests retirement income verification requiring 36-month continuance documentation.

**Expected AI Agent Flags:**
- `IncomeAgent`: Retirement income requires 36-month continuance

---

### 26. `income.socialsecurity@test.com` - Social Security Only

**Profile:**
| Field | Value |
|-------|-------|
| Name | Dorothy Walker |
| Social Security | $42,000/year |
| Age | 70 |

**Purpose:** Tests Social Security as sole income source (stable, non-expiring).

**Expected AI Agent Flags:**
- `IncomeAgent`: Social Security is stable income

---

### 27. `income.alimony@test.com` - Alimony/Child Support

**Profile:**
| Field | Value |
|-------|-------|
| Name | Susan Hall |
| W-2 Income | $65,000/year |
| Alimony | $24,000/year (5 years remaining) |
| Child Support | $18,000/year (8 years remaining) |
| Total | $107,000/year |

**Purpose:** Tests other income sources with 36+ month continuance requirement.

**Expected AI Agent Flags:**
- Alimony/child support requires 36+ months remaining
- Court order/divorce decree required

---

### 28. `edge.newjob@test.com` - Recent Job Change

**Profile:**
| Field | Value |
|-------|-------|
| Name | Brian Young |
| Current Job | 10 months |
| Same Field | 5 years |
| Previous Employer | 4 years |

**Purpose:** Tests job change < 24 months but same field continuity.

**Expected AI Agent Flags:**
- `IncomeAgent`: Current job tenure < 24 months (flags for continuity check)
- `IncomeAgent`: Line-of-work history ≥ 24 months verified (meets policy)
- Letter of Explanation required for recent transition

**Expected Outcome:** CONDITIONAL (Procedural check only; meets hard policy duration requirements)

---

## 📁 SECTION 5: EDGE CASES (16 Users)

These users test specific edge scenarios and policy boundaries.

---

### 29. `edge.investment@test.com` - Investment Property

**Profile:**
| Field | Value |
|-------|-------|
| Name | David Park |
| Income | $145,000/year |
| Existing Rentals | 2 properties |
| Monthly Rental Income | $3,500 |
| Loan Amount | $280,000 |
| Occupancy | Investment |

**Purpose:** Tests investment property underwriting with rental income and existing financed properties.

**Requirements:**
- Credit 700+
- 25% down payment
- 6 months base + 2 months per financed property

**Expected AI Agent Flags:**
- Investment property identified
- Rental income offset applied (75% of gross)
- REO reserves calculated

---

### 30. `edge.refinance@test.com` - Refinance Scenario

**Profile:**
| Field | Value |
|-------|-------|
| Name | Jennifer White |
| Current Rate | 6.5% |
| Property Value | $425,000 |
| Current Balance | $285,000 |
| LTV | ~67% |

**Purpose:** Tests rate/term refinance with existing mortgage documentation.

**Documents Required:**
- Current mortgage statement
- No purchase agreement (refinance)

**Expected AI Agent Flags:**
- Refinance transaction identified
- Current mortgage payment verified
- LTV calculated from current balance

---

### 31. `edge.giftfunds@test.com` - Gift Funds for Down Payment

**Profile:**
| Field | Value |
|-------|-------|
| Name | Emily Garcia |
| Own Assets | $20,500 |
| Gift from Parents | $35,000 |
| Total for Closing | $55,500 |

**Purpose:** Tests gift funds documentation and donor verification.

**Documents Required:**
- Gift letter
- Donor bank statement (proving funds)
- Standard borrower bank statements

**Expected AI Agent Flags:**
- `AssetAgent`: Gift funds identified
- Donor relationship verified (family)
- Funds are true gift (no repayment)

---

### 32. `edge.nonresident@test.com` - Non-Permanent Resident Alien

**Profile:**
| Field | Value |
|-------|-------|
| Name | Hiroshi Tanaka |
| Citizenship | Non-Permanent Resident |
| Visa Type | H-1B |
| Visa Expiration | 2027-06-30 |

**Purpose:** Tests non-US citizen eligibility and work authorization verification.

**Documents Required:**
- Passport (instead of driver's license)
- Work visa documentation

**Expected AI Agent Flags:**
- `IdentificationAgent`: Non-citizen identified
- Work authorization verified
- Visa expiration checked

**Expected Outcome:** CONDITIONAL (requires work auth verification)

---

### 33. `edge.creditfloor@test.com` - Credit Score at Floor

**Profile:**
| Field | Value |
|-------|-------|
| Name | Marcus Green |
| Credit Score | 640 (exactly) |
| Occupancy | Primary Residence |
| Credit Floor | 640 |

**Purpose:** Tests exact boundary condition for credit floor.

**Expected AI Agent Flags:**
- Credit at minimum acceptable score
- No margin for error on credit

---

### 34. `edge.bankruptcy@test.com` - Bankruptcy Seasoned (48+ months)

**Profile:**
| Field | Value |
|-------|-------|
| Name | Rachel Turner |
| Bankruptcy | Chapter 7 |
| Discharged | 52 months ago |
| Required Seasoning | 48 months |

**Purpose:** Tests bankruptcy that meets seasoning requirement (48+ months).

**Expected AI Agent Flags:**
- Bankruptcy detected
- Seasoning requirement met (52 > 48)
- Credit rebuilt post-bankruptcy

---

### 35. `edge.foreclosure@test.com` - Foreclosure Seasoned (48+ months)

**Profile:**
| Field | Value |
|-------|-------|
| Name | Kenneth Hughes |
| Foreclosure | 50 months ago |
| Required Seasoning | 48 months |

**Purpose:** Tests foreclosure that meets seasoning requirement.

**Expected AI Agent Flags:**
- Foreclosure detected
- Seasoning requirement met (50 > 48)

---

### 36. `edge.dti43@test.com` - DTI at Exactly 43%

**Profile:**
| Field | Value |
|-------|-------|
| Name | Angela King |
| Monthly Income | $7,000 |
| Total Debt + Housing | $3,010 |
| DTI | 43.0% |

**Purpose:** Tests exact DTI boundary at maximum allowed.

**Expected AI Agent Flags:**
- `DTIAgent`: DTI at maximum 43%
- No margin for additional debt

---

### 37. `edge.reservesfloor@test.com` - Reserves at Minimum

**Profile:**
| Field | Value |
|-------|-------|
| Name | Timothy Evans |
| Reserves | 2 months PITIA |
| Required | 2 months (primary residence) |

**Purpose:** Tests minimum reserves for primary residence.

**Expected AI Agent Flags:**
- `AssetAgent`: Reserves at minimum
- Exactly 2 months PITIA verified

---

### 38. `edge.largedeposit@test.com` - Large Deposit Requiring Source

**Profile:**
| Field | Value |
|-------|-------|
| Name | Nicole Phillips |
| Large Deposit | $55,000 |
| Source | Year-end bonus |
| Date | October 2025 |

**Purpose:** Tests large deposit sourcing requirement (deposits > $1000 need explanation).

**Expected AI Agent Flags:**
- `AssetAgent`: Large deposit detected
- Source documentation required
- Bonus letter/documentation needed

**Expected Outcome:** CONDITIONAL (requires source documentation)

---

### 39. `edge.highutilization@test.com` - High Credit Utilization

**Profile:**
| Field | Value |
|-------|-------|
| Name | Jason Campbell |
| Total Credit Limit | $28,000 |
| Current Balance | $25,500 |
| Utilization | 88% |

**Purpose:** Tests high credit utilization flag (does not fail but is noted).

**Expected AI Agent Flags:**
- `CreditCardAgent`: High utilization (88%)
- Does not necessarily disqualify
- May impact credit score negatively

---

### 40. `edge.nsf@test.com` - NSF Incidents on Statements

**Profile:**
| Field | Value |
|-------|-------|
| Name | Melissa Roberts |
| NSF Incidents | 2 in past 90 days |
| Overdrafts | 3 in past 90 days |

**Purpose:** Tests bank account health assessment when NSF/overdrafts are present.

**Expected AI Agent Flags:**
- `AssetAgent`: NSF incidents detected
- Account health assessment required
- May require LOE for NSF incidents

**Expected Outcome:** CONDITIONAL (account health review)

---

### 41. `edge.deferredloans@test.com` - Student Loans in Deferment

**Profile:**
| Field | Value |
|-------|-------|
| Name | Ryan Collins |
| Student Loan Balance | $85,000 |
| Current Payment | $0 (deferred) |
| IBR Payment | $425/month |

**Purpose:** Tests deferred loan treatment (1% of balance or IBR payment for DTI).

**Expected AI Agent Flags:**
- `StudentLoanAgent`: Deferred loan detected
- Using IBR payment ($425) or 1% of balance ($850)
- Whichever is documented

---

### 42. `edge.multiplereo@test.com` - Multiple REO Properties

**Profile:**
| Field | Value |
|-------|-------|
| Name | Steven Peterson |
| Primary Residence | Owned with mortgage |
| Rental Properties | 2 (financed) |
| New Purchase | Investment (4th property) |

**Purpose:** Tests multiple financed property reserve requirements (+2 months per property).

**Reserve Calculation:**
- Base: 6 months
- +2 months × 3 financed properties = 6 months
- Total Required: 12 months PITIA

**Expected AI Agent Flags:**
- Multiple financed properties detected
- Additional reserves required

---

### 41. `edge.sellerconcession@test.com` - Seller Concessions

**Profile:**
| Field | Value |
|-------|-------|
| Name | Laura Morris |
| Purchase Price | $315,000 |
| Seller Concession | $9,450 (3%) |

**Purpose:** Tests seller concession limits (typically 3-6% depending on occupancy/LTV).

**Expected AI Agent Flags:**
- Seller concession within limits
- Applied to closing costs

---

### 42. `edge.trust@test.com` - Property in Revocable Trust

**Profile:**
| Field | Value |
|-------|-------|
| Name | Richard Nelson |
| Trust | Nelson Family Revocable Trust |
| Trust Type | Revocable Living Trust |
| Trustor Occupies | Yes |

**Purpose:** Tests trust ownership with trustor as occupant (standard underwriting applies).

**Expected AI Agent Flags:**
- Revocable trust identified
- Trustor is borrower and occupant
- Standard underwriting applies

---

### 43. `stage1.preapproval@test.com` - Stage 1 Pre-Approval Only

**Profile:**
| Field | Value |
|-------|-------|
| Name | Matthew Richardson |
| Income | $95,000/year |
| Max Loan | ~$350,000 |
| Status | Pre-Approved (Stage 1) |

**Purpose:** Tests Stage 1 pre-approval status (no property identified yet).

**Expected AI Agent Flags:**
- Stage 1 only
- No URLA application
- No property-related documents

**Note:** This user only has pre-approval, not a full application.

---

## 📊 AI Agent Testing Matrix

| Agent | Approved Test Cases | Denied Test Cases | Edge Cases |
|-------|---------------------|-------------------|------------|
| `IdentificationAgent` | All approved users | denied.nodocs | edge.nonresident |
| `IncomeAgent` | All approved users | denied.nodocs, denied.highdti | income.*, edge.newjob |
| `AssetAgent` | All approved users | denied.nodocs | edge.giftfunds, edge.largedeposit, edge.nsf |
| `CreditAgent` | All approved users | denied.badcredit, denied.*credit | edge.creditfloor, edge.bankruptcy |
| `DTIAgent` | All approved users | denied.highdti | edge.dti43 |
| `CreditCardAgent` | Users with credit cards | - | edge.highutilization |
| `AutoLoanAgent` | Users with auto loans | - | - |
| `StudentLoanAgent` | Users with student loans | - | edge.deferredloans |
| `MortgageAgent` | Users with mortgages | denied.lates30, denied.lates60 | edge.refinance, edge.multiplereo |

---

## 🔧 Running the Test Suite

### Step 1: Seed Test Users
```bash
node scripts/seedTestData.js
```

### Step 2: Generate Test Documents
```bash
node scripts/generateTestDocs.js
```

### Step 3: Upload Documents to Azure
```bash
node scripts/uploadTestDocs.js
```

### Step 4: Verify Documents
```bash
node scripts/verifyDocs.js
```

### Step 5: Clean Up (if needed)
```bash
node scripts/cleanupDocs.js
```

---

## 📝 Notes

1. **All test accounts use password: `Test123!`**
2. **Only `denied.nodocs@test.com` has no uploaded documents** - this is intentional
3. **All other denied users have complete documentation** - they are denied for specific policy reasons, not missing documents
4. **Edge cases are designed to test boundary conditions** - they should either pass narrowly or fail for specific, flagged reasons
5. **Document filenames follow pattern:** `{prefix}-{doctype}-{date/details}.pdf`

---

*Last Updated: January 2026*

