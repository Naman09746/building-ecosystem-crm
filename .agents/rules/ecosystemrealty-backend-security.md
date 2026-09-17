---
name: ecosystemrealty-backend-security
description: Security and operational constraints for EcosystemRealty backend/Supabase tasks.
---

# EcosystemRealty Backend & Security Constraints

When interacting with the EcosystemRealty backend (Supabase/Postgres), the following strict constraints apply:

1. **Production Isolation**: NEVER connect MCP to production data. The configured `YOUR_SUPABASE_PAT` and `YOUR_PROJECT_REF` must ONLY point to the development or staging environment.
2. **Credential Safety**: NEVER expose `service-role` credentials, `SUPABASE_SERVICE_ROLE_KEY`, or any backend secrets to the frontend codebase. Frontend code must only ever use the `anon` public key.
3. **Execution Safety**: 
   - Prefer read-only mode and safe queries for standard schema inspection.
   - NEVER automatically execute destructive SQL (e.g., `DROP`, `DELETE`, `TRUNCATE`).
   - YOU MUST explicitly ask for User confirmation before running migrations, deleting data, dropping tables/columns, or altering Row Level Security (RLS) policies.
4. **Primary Tools**: The primary interface for database operations is the official Supabase MCP Server (`@supabase/mcp-server-supabase`). Do not use redundant Postgres MCP servers. Use the Supabase MCP to:
   - Inspect schemas, RLS policies, and indexes.
   - Generate TypeScript database types.
   - Run safe read-only queries.
   - Inspect Supabase security/performance advisors.
   - Manage Edge Functions, storage, and branching.
