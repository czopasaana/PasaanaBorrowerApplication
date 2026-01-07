Pasaana Mortgage Approval — 3-Stage Overview
Purpose: Provide a clear, high-level guide to the three approval stages we’ve implemented, how they connect, what each requires, and what each returns to the borrower and to downstream systems (pricing, series assignment, and servicing).
Context & Principles
We are adapting the Danish realkredit model for the U.S.: pass-through funding via Realkredit-style bonds, tight borrower capacity controls, and fully transparent servicing. Stage-2 underwrites the borrower absent a specific collateral; Stage-3 locks collateral, terms, and the exact bond series. AI agents orchestrate data collection, verification, and explainability; our Cosmos-SDK blockchain records key lifecycle events using BondCoin for on-chain fees.
Stage Snapshots

Stage 1 — Pre-Approval (Short Form)
Goal: Give the borrower a quick, realistic ceiling without uploads. Ideal for shopping and agent conversations.
Inputs
• Self-reported monthly income (range or value), employment type (W-2 / SE / 1099), and time-in-line-of-work.
• Self-reported monthly non-housing debts (credit cards, autos, student loans).
• Credit score band acknowledgement (e.g., 640–659, 660–679, 680–699, 700+).
• Location (zip/state) for taxes proxy; occupancy intent (Primary/Second/Investment).
• No document uploads; no hard credit pull.
Logic
• Apply conservative income factors (e.g., variable income scalar 0.85 at this stage).
• Use policy DTI cap (43% fixed baseline) and placeholder escrows (taxes 0.80%/yr, insurance per occupancy, HOA=0).
• Compute Max PI and amortization-based Max Loan (30Y fixed default); show a range, not a single dollar.
Outputs
• Pre-approval letter (non-binding) with Max Loan range and plain-English caveats.
• Next-best-actions to increase buying power (payoff small debts, bring assets, consider longer reset ARMs).
Stage 2 — Full Application (URLA + Docs, No Collateral)
Goal: Instant, explainable decision grounded in verified income, assets, and liabilities; specific product math; still collateral-agnostic.
Inputs
• Completed URLA + structured intake (we validated coverage against URLA).
• Verified income (W-2/Paystubs, 1099, 1040s), assets, and liabilities; credit report (lowest FICO).
• Occupancy, product intent (30Y fixed default; ARMs and 15Y supported).
Policy Gates (Launch Values)
• FICO floors: Primary ≥640, Second ≥660, Investment ≥700.
• Derog seasoning: BK/FC ≥48 months; mortgage lates: none 60-day in 24m; none 30-day in 12m.
• DTI back cap: 43% (product overlay may tighten for short-reset ARMs).
• Reserves: Primary 2m, Second 6m, Investment 6m; +2m per financed REO.
Math (30Y Fixed at Stage-2)
• Qualifying rate = par + 75 bps; stress check at +200 bps.
• Iterative Max Loan using amortization formula and placeholder escrows.
• Decision = APPROVE / CONDITIONAL / DECLINE with machine-readable conditions.
Outputs
• Firm Max Loan (subject to collateral), DTI, reserves, qualifying/stress rates.
• Explainability (findings) and conditions; underwriting run id for audit.
Stage 3 — Collateral & Final Terms
Goal: Lock property and finalize economics, including exact PITIA, closing funds, and bond series assignment under the Danish pass-through model.
Inputs
• Property address; appraisal/AVM; title commitment; taxes/HOA actuals; hazard/flood insurance binder.
• Final fees and credits; down payment and reserves verification to close.
Logic
• Replace placeholders with actual taxes/HOA/insurance; re-run capacity; apply LTV and collateral criteria.
• Confirm product (30Y fixed or F1/F2/F3/F5/F10 ARM; 15Y fixed) and price; compute final Note Rate and PITIA.
• Assign bond series (realkredit obligationer), register on-chain ledger events, and produce closing package.
Outputs
• Clear-to-Close or Conditional CTC; final Loan Amount and Note Rate; PITIA; funds to close.
• Series assignment and servicing setup; compliance and disclosures packet.
Agents & Responsibilities
• Intake Agent (Stage 1): capture short form; fraud screening; guidance.
• Income/Asset/Liability Managers (Stage 2): normalize & verify data; produce assertions.
• Credit Agent (Stage 2): derive lowest FICO, lates, and seasoning.
• Underwriting Engine (Stage 2): compute, decide, explain, and log.
• Collateral Agent (Stage 3): appraisal, title, insurance, taxes/HOA; LTV and collateral gates.
• Funding & Series Agent (Stage 3): pricing, series allocation, closing & on-chain registration.
Data Flow & System Handshakes
1) Stage 1 → Stage 2: promote pre-approval record to full application; begin doc ingestion; soft data becomes verified data.
2) Stage 2 → Stage 3: freeze borrower capacity numbers; swap in property specifics; finalize economics.
3) Stage 3 → Servicing & Ledger: board loan; activate on-chain events for payments, servicing actions, and bond waterfall.
KPIs & Guardrails
• Instant decision rate (Stage 2), conditional-to-approve conversion, average conditions per file.
• Pull-through from Stage 1 → 3, fallout reasons (price, collateral, docs).
• Average DTI at close, average reserves at close, seasoning exceptions rate (should be ~0).