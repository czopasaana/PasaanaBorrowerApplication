# Stage-2 Product & Engineering Spec — 30-Year Fixed (Consolidated)

Comprehensive specification for Stage‑2 borrower underwriting **without collateral**: rules, math, data sources, agent responsibilities, and outputs.

## Scope
- Borrower-only risk decision (no subject property/LTV yet).
- Product covered here: **30‑Year Fixed** (other products in the Overlay Guide).
- Occupancy: **Primary**, **Second Home**, **Investment**.

## Hard Policy (Launch Defaults)
- **Credit floors (global)**: Primary ≥ **640**; Second ≥ **660**; Investment ≥ **700**.
- **Derogs**: BK and FC seasoning ≥ **48 months**; Mortgage lates: none 60‑day in **24m** / none 30‑day in **12m**; judgments/liens resolved.
- **Income stability**: ≥ **24 months** in line of work; variable W‑2 averaged over **24m** (12m allowed only with compensating factors); Self‑employed 24m returns (12m off at launch); other‑income continuance ≥ **36m**.
- **Capacity**: Back‑end DTI cap **43%** (front‑end advisory **33%**).
- **Stress testing**: **+200 bps** on qualifying rate; final loan = **min(base, stress)**.
- **Reserves**: Primary **2m**; Second **6m**; Investment **6m**; **+2m** per additional financed REO.
- **Placeholder escrows**: Taxes **0.80%/yr** of estimated price; Insurance (monthly) **$85** Primary / **$125** Second / **$150** Investment; HOA default **$0**.

## Data-Driven Credit Floor (Authoritative)
Effective minimum FICO for the application is computed in SQL as **data**, not code:

```
effective_min = MAX(global floor by occupancy, product_overlays.min_score_override) + product_occupancy_adders.add_points
```

**Artifacts**
- **Intent table**: `application_underwriting_intent(application_id, product_code, occupancy, channel)`  
- **Function**: `dbo.fn_effective_min_score(channel, occupancy, product_code) -> INT`
- **View**: `dbo.v_application_effective_min_score` → per‑application `(effective_min_score, borrower_fico, meets_floor)`

**Usage**
- Set intent for the app, then `SELECT * FROM dbo.v_application_effective_min_score WHERE application_id = @AppId;`

## Inputs (from DB)
- **Income**: `v_application_income_monthly.qgmi_monthly` (variable-income scalar already applied).
- **Debts excluding housing**: `v_application_liabilities_monthly.md_monthly`.
- **Credit**: `credit_reports` (latest per application).
- **Policy & Product**: `policy_overlays` (latest by channel), `product_overlays` (by product_code).
- **Intent**: `application_underwriting_intent` (product_code, occupancy, channel).

## Qualifying Rate & Term (30Y Fixed)
- **Term** *n* = **360** months.
- **Base qualifying rate** *r* = `par + qual_rate_buffer_bps` (default **+75 bps**).
- **Stress rate** `r_stress = r + 200 bps`.

## Iterative Maximum Loan Computation
We iterate because taxes depend on estimated price which depends on loan.

1. Initial guess: `Loan0 = (QGMI * 0.43 – MD) * 200` (rough seed).  
2. `EstimatedPrice = Loan / 0.80` (80% used here only for taxes proxy).  
3. `TaxesMonthly = (0.0080 * EstimatedPrice) / 12`.  
4. InsuranceMonthly by occupancy; HOA default 0.  
5. `Max_Total_Debt = QGMI * 0.43`; `Max_Housing = Max_Total_Debt – MD`.  
6. `Max_PI = Max_Housing – (Taxes + Insurance + HOA)`.  
7. **Amortization**: `Loan(rate) = Max_PI * (1 – (1 + rate/12)^(-360)) / (rate/12)`.  
8. Iterate until `|Loan_i – Loan_{i-1}| < $250`.  
9. Compute `Loan_base` at `r` and `Loan_stress` at `r_stress`; **Max Loan = MIN(Loan_base, Loan_stress)**.

## Reserves Check
- `PITIA_placeholder = PI_base(Loan_max) + Taxes + Insurance + HOA`  
- `RequiredReserves = (base months by occupancy + 2m per financed REO) × PITIA_placeholder`  
- Eligible assets: verified liquid balances (no haircut at launch).  
- **Pass** if `eligible_assets – est_cash_to_close ≥ RequiredReserves` (use **2%** of EstimatedPrice as Stage‑2 proxy).

## Decision Logic
- Enforce credit floor via `v_application_effective_min_score` (`meets_floor=1`).  
- Fail any hard gate (seasoning, DTI at base or stress, reserves) → **DECLINE**.  
- Fixable via payoff/add assets/reduce loan → **CONDITIONAL** with machine‑readable conditions.  
- Else **APPROVE** with Max Loan and explicit assumptions.

## Outputs
- `decision` (APPROVE/CONDITIONAL/DECLINE), `loan_max`, `pi_max`, `price_max = loan_max/0.80`  
- `qualifying_rate`, `stress_rate`, `dti_result`, `pitia_placeholder`  
- `reserves_required`, `reserves_available`, `assumptions[]`, `conditions[]`, `reasons[]`, `uw_run_id`

## Agents & Responsibilities
- **Product Selection Agent**: writes `application_underwriting_intent`.  
- **Income Verification Manager**: normalize W‑2/1099/SE, write assertions.  
- **Asset Verification Manager**: tag eligible liquid assets.  
- **Liability Manager**: confirm payments & payoffs.  
- **Credit Agent**: derive lowest FICO, lates, seasoning.  
- **Underwriting Engine**: perform math, enforce floors via view/function, emit decision + findings.
