# Product Overlay Guide — Fixed & Danish-style ARMs (Consolidated)

Single reference for product‑specific qualifying rate rules, DTI caps, reserves multipliers, and data‑driven credit floors (including adders).

## Shared Base Rules
- Global credit floors by occupancy: **Primary 640 / Second 660 / Investment 700** (`policy_overlays`).  
- Seasoning & lates: per Engineering Spec.  
- Reserves base: **Primary 2m / Second 6m / Investment 6m / +2m** per financed REO.  
- Global stress buffer floor: **+200 bps**.  
- Data‑driven floors: use `v_application_effective_min_score` (do **not** hard‑code).

## Fixed Products

### 30-Year Fixed
- Term **360**; Qualifying rate = **par + 75 bps**; Stress **+200 bps**.  
- DTI cap **0.43**; Reserves multiplier **1.00**.  
- Product `min_score_override` target: **640**.

### 15-Year Fixed
- Term **180**; Qualifying rate = **par + 50 bps**; Stress **+200 bps**.  
- DTI cap **0.43**; Reserves multiplier **1.00**.  
- Product `min_score_override` target: **650**.

## Danish-style ARM Family

### F1 (1‑Year reset)
- **Qualifying rate**: `max(fully indexed, note+200 bps, max in first 5y)`  
- **DTI cap**: **0.41**; **Reserves multiplier**: **1.50×**  
- ARM params default: margin **+275 bps**; caps: first **+200** / periodic **+100** / lifetime **+500** bps.

### F2 (2‑Year reset)
- **Qualifying rate**: `max(fully indexed, note+150 bps, max in first 5y)`  
- **DTI cap**: **0.41**; **Reserves multiplier**: **1.50×**

### F3 (3‑Year reset)
- **Qualifying rate**: `max(fully indexed, note+125 bps, max in first 5y)`  
- **DTI cap**: **0.42**; **Reserves multiplier**: **1.25×**

### F5 (5‑Year reset)
- **Qualifying rate**: `max(fully indexed, note+100 bps, max in first 5y)`  
- **DTI cap**: **0.43**; **Reserves multiplier**: **1.00×** (optionally **1.25×** for Investment)

### F10 (10‑Year reset)
- **Qualifying rate**: `max(fully indexed, note+75 bps, max in first 5y)`  
- **DTI cap**: **0.43**; **Reserves multiplier**: **1.00×**

## Credit Floors — Product Targets & Occupancy Adders
- Product `min_score_override` targets (before adders):  
  `FIXED_30 640`, `FIXED_15 650`, `ARM_F10 645`, `ARM_F5 650`, `ARM_F3 660`, `ARM_F2 670`, `ARM_F1 680`.
- Occupancy adders (from `product_occupancy_adders`):  
  **Fixed**: +0 all occupancies. **ARM\_***: +0 Primary, **+20** Second, **+60** Investment.

## Operational Hooks
1. Set `application_underwriting_intent` for the application.  
2. Load `product_overlays` for term, DTI cap, reserves multiplier, caps/margin.  
3. Build qualifying-rate candidates per product; select prudential rate (plus stress floor).  
4. Run iterative Max‑Loan; enforce product DTI cap and reserves multiplier; enforce credit floor via view/function.

## Borrower-Facing Guidance
- Shorter reset = more payment-shock risk → we tighten DTI and require more reserves.  
- Longer reset (F5/F10) behaves closer to fixed-rate in underwriting and approval amount.
