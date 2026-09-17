# 13. Cement Manufacturer — 7 MUST HAVEs (Ambuja Scale)

> Business spec distilled from owner review 2026-09-17. No tech jargon — answers the owner's morning questions.

## Lifecycle

```
Dealer Network (who sells)
  → Construction Site (where demand lives, 5-10 orders each)
  → Quote (daily rate + scheme)
  → Order [credit gate + stock gate]
  → Dispatch Challan + LR
  → Delivery POD (photo + short/damage) → Khata Credit auto
  → Collection (ageing → daily list) → Khata Debit
  → Scheme Accrual (bags → slab) → Performance + Target rollup
  → Site Revisit (same site next stage) → Repeat
  → Complaint (anywhere, 48h SLA)
```

If POD, credit gate, or site persistence is missing, the pipe leaks.

## MUST HAVE 1 — Dealer Network Master + Territory/Beat
**Owner Q:** Which 40 of 3000 dealers did not order in 21 days, and who is their stockist?
- Table `dealers`: `id, org_id, dealer_code, name, dealer_type (cfa|stockist|dealer|retailer|sub_dealer), parent_dealer_id, region_id, state, district, taluka, beat, salesperson_id, phone, gstin, address, city, status (active|dormant|blocked|new), created_at`
- Hierarchy: CFA → Stockist → Dealer → Retailer. Retailer.parent = Dealer, Dealer.parent = Stockist.
- Beat = free text + TSO id. One TSO owns one beat.
- Links: `materials_khata_ledgers.dealer_id`, `orders.dealer_id`, `materials_daily_rates` unchanged, `scouts.contractorPhone` link to dealer if matches.

## MUST HAVE 2 — Construction Site (durable, not Lead)
**Owner Q:** How many foundation-stage sites using UltraTech today have not ordered in 14 days?
- Table `construction_sites`: `id, org_id, site_name, address, gps_lat, gps_lng, site_type (ihb|builder|infra|government), stage (excavation|foundation|structure|finishing|roof), estimated_total_cement_mt, current_brand (ambuja|ultratech|acc|other), owner_name, owner_phone, contractor_name, contractor_phone, mason_name, architect_name, responsible_salesperson_id, dealer_id (serving retailer), last_visited_at, next_visit_at, source (scouting|walkin|dealer_tip), status (active|completed|dormant), created_at`
- Every `material_field_scout`, `footfall` with address, `order`, `khata_transaction` links to `site_id`.
- Revisit task auto: foundation 7d, structure 14d, finishing 21d.

## MUST HAVE 3 — Target vs Actual (MT/Bags)
**Owner Q:** MP is at 71% with 11 days left — which 3 stockists drag it?
- Table `sales_targets`: `id, org_id, period_month date (YYYY-MM-01), target_mt, target_bags, level (company|state|region|area|salesperson|dealer), level_id, created_by, notes`
- Level hierarchy: company (level_id = org_id) → state (text) → region_id → area (property_areas) → salesperson_id → dealer_id.
- `Achieved` = sum `dispatch_challans.delivered_quantity` (bags) where `delivered_at` in month and `org_id` and hierarchy filter. `Pace = achieved / target * (days_in_month / day_of_month)`.
- UI: CSV import + manual entry + hierarchy rollup table + pace bar.

## MUST HAVE 4 — Order→Stock→Dispatch→Delivery→Khata Chain Hardened
**Owner Q:** 142 orders yesterday — 18 not dispatched, 9 in transit >24h, 2 short.
- Hard gates at `orders` creation: `Available = closing - reserved`; if `order.qty > Available` → short; if `khata.outstanding + order.value > creditLimit` and `khata.status != active` → blocked (owner override with reason logged).
- `dispatch_challans`: add `lr_no, freight_amount, pod_photo_url, pod_receiver_name, pod_received_at, short_bags, damaged_bags, pod_notes`. `status` transitions `pending→in_transit→delivered|failed`.
- On `delivered`: `fulfilledQuantity += delivered_qty - short - damaged`, `inventory_stock.quantity -= delivered`, `khata credit (+ order value)` auto.
- On `payment`: `khata debit (- amount)` linking `order_id` or `site_id`.

## MUST HAVE 5 — Collections (Money to Collect Today)
**Owner Q:** Whose promised payment dates are past due?
- No new table. View over `materials_khata_ledgers` + `materials_khata_transactions` ageing.
- Ageing buckets: `current, 1-15, 16-30, 31-60, 60+` days since `lastPaymentAt` or `credit.created_at + credit_days`.
- Daily list: `overdue >0` + `promised_date` (store in `notes` json or new `collections` table: `dealer_id, overdue_amount, oldest_due_date, promised_date, assigned_tso`). TSO `Collect Now` creates `khata debit`.
- Metrics: `Collected Today/MTD, Outstanding Drop %, Overdue Drop %` by TSO.

## MUST HAVE 6 — Credit Ageing (inside Khata)
**Owner Q:** Rs 4.2cr overdue >30d — 1.1cr with 9 dealers, list them.
- Add computed `ageing_bucket` via RPC `get_khata_ageing(org_id)` grouping by dealer.
- No interest calc now. Just bucket + `lastPaymentAt` + `cheque_bounce_count` (increment on `paymentMode=cheque` + `notes contains bounce`).

## MUST HAVE 7 — Complaint Ticketing
**Owner Q:** Which depot has 60% of short quantity complaints?
- Table `complaints`: `id, org_id, case_no (SEQ), reported_by_dealer_id, reported_by_phone, site_id, order_id, dispatch_challan_id, complaint_type (late_delivery|short_quantity|damaged_bags|wrong_grade|rate_difference|quality_doubt|service_behaviour), description, photo_url, assigned_to_user_id, priority (low|medium|high), status (open|in_progress|resolved|closed), due_at (created+48h), resolved_at, closure_notes, closure_photo_url, created_at`
- Auto `due_at = created + 48h`. SLA breach = `now > due_at and status != closed`.
- Repeat flag: `3 complaints same dealer 60d`.
- Link to dealer performance: `complaints_count 60d`.

## Deferred (SHOULD later)
- Depot `Available = Closing - Reserved + InTransit` + `DaysOfCover` + transfers
- Scheme slab accrual (single volume slab, dealer statement)
- Scouting revisit cadence automation

## Not Building
- Multi-formula incentive engine, full ERP inventory, supplier compare, in-app payout

## Implementation Order
1. Migration 0031: dealers + construction_sites + sales_targets + complaints
2. Migration 0032: POD columns on dispatch_challans + khata dealer_id link
3. Types + RLS + RPCs
4. APIs: /api/dealers, /api/sites, /api/targets, /api/complaints, harden /api/commercial/orders + /api/materials/dispatch
5. UI: Dealer directory, Site map/list, Targets table, Collections daily list, Complaints inbox, 4 morning screens
