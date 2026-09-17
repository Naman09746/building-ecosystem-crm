-- ====================================================================
-- MIGRATION 0029: Phase 0c — Base Table Revocations & Secrets Lockdown
-- Patches vulnerabilities:
-- C-DB4: Revoke direct base table SELECT on property_listings so users
--        must read through property_listings_masked with role-based price floor.
-- C-DB3: Restrict integration_endpoints and crm_domain_events access to
--        owners/managers to prevent secret_token exfiltration.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. PROPERTY LISTINGS CONFIDENTIALITY (C-DB4)
-- --------------------------------------------------------------------
-- Revoke direct SELECT on base table from authenticated users.
-- Code queries now hit property_listings_masked.
revoke select on public.property_listings from authenticated;

-- Ensure property_listings_masked has SELECT granted to authenticated
grant select on public.property_listings_masked to authenticated;

-- Ensure INSERT/UPDATE/DELETE still permitted on property_listings for authenticated
grant insert, update, delete on public.property_listings to authenticated;

-- --------------------------------------------------------------------
-- 2. INTEGRATION ENDPOINTS & DOMAIN EVENTS PRIVILEGE LOCKDOWN (C-DB3)
-- --------------------------------------------------------------------
-- Drop broad "all members" access policies
drop policy if exists "Tenant isolation for integration_endpoints" on public.integration_endpoints;
drop policy if exists "Tenant isolation for crm_domain_events" on public.crm_domain_events;

-- Enforce Manager/Owner only access for integration endpoints (protects secret_token & webhook config)
create policy "Manager only for integration_endpoints" on public.integration_endpoints
  for all
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'manager')
  )
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'manager')
  );

-- Enforce Manager/Owner only access for crm_domain_events outbox inspection/manipulation
create policy "Manager only for crm_domain_events" on public.crm_domain_events
  for all
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'manager')
  )
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'manager')
  );
