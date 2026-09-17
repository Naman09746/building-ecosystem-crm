-- ============================================================================
-- Ecosystem Realty — Migration 0004: Tenant Default Safety Net
-- Defense in depth: even if a client insert forgets org_id, the default
-- resolves it from the caller's profile (auth.uid() -> profiles.org_id).
-- Service-role webhook inserts always pass org_id explicitly, so defaults
-- never mask a tenancy bug there.
-- ============================================================================

alter table public.activities alter column org_id set default public.current_org_id();
alter table public.tasks      alter column org_id set default public.current_org_id();
alter table public.documents  alter column org_id set default public.current_org_id();
