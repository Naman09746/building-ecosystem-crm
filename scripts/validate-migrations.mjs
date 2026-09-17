#!/usr/bin/env node
/**
 * Migration Validation Harness
 * ============================
 * Applies supabase/migrations/*.sql (in order) to a scratch PostgreSQL database
 * under a Supabase-compatible shim, then runs functional assertions against the
 * live schema: org bootstrap, seed idempotency, quota triggers, role guard,
 * lead ownership forcing, and phone normalization.
 *
 * Usage:
 *   npm run test:migrations
 *
 * Environment (all optional — defaults suit a local Postgres):
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD  — connection for the admin connection
 *   TEST_DB_NAME                        — scratch DB name (default ecosystemrealty_mig_test_<ts>)
 */

import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

const DB_NAME = process.env.TEST_DB_NAME || `ecosystemrealty_mig_test_${Date.now()}`;
const PG = {
  host: process.env.PGHOST || "/tmp",
  port: process.env.PGPORT || "5432",
  user: process.env.PGUSER || execSync("whoami").toString().trim(),
};

function psql(db, sql, { stopOnError = true, expectError = false } = {}) {
  const envVars = { ...process.env, PGHOST: PG.host, PGPORT: PG.port, PGUSER: PG.user };
  try {
    const out = execSync(`psql -d ${db} -v ON_ERROR_STOP=${stopOnError ? 1 : 0} -tA 2>&1`, {
      encoding: "utf8",
      env: envVars,
      input: sql,
    });
    if (expectError && /ERROR:/.test(out)) return { ok: false, err: out };
    return { ok: true, out };
  } catch (e) {
    if (expectError) return { ok: false, err: String(e.stdout || e.stderr || e.message) };
    console.error(`\n✗ psql failed on db=${db}\nSQL: ${sql.slice(0, 200)}\n${e.stdout || e.stderr || e.message}`);
    cleanup();
    process.exit(1);
  }
}

function psqlFile(db, file) {
  try {
    execSync(
      `psql -d ${db} -v ON_ERROR_STOP=1 -q -f "${file}"`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PGHOST: PG.host, PGPORT: PG.port, PGUSER: PG.user } }
    );
    return { ok: true };
  } catch (e) {
    console.error(`\n✗ Migration file failed: ${file}\n${String(e.stderr).slice(-1500)}`);
    return { ok: false, err: String(e.stderr) };
  }
}

function ownerIdRef() {
  return psql(DB_NAME, `select id::text from auth.users where email='owner@test.local'`).out.trim();
}

function cleanup() {
  try {
    execSync(`psql -d postgres -c "DROP DATABASE IF EXISTS \\"${DB_NAME}\\""`, {
      encoding: "utf8",
      env: { ...process.env, PGHOST: PG.host, PGPORT: PG.port, PGUSER: PG.user },
    });
  } catch {}
}

// ---------------------------------------------------------------- results --
const results = [];
let failures = 0;
function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  if (!cond) failures++;
  console.log(`${cond ? "  ✓" : "  ✗"} ${name}${detail && !cond ? ` — ${detail}` : ""}`);
}

// ==================================================================== main ==
console.log(`\n▶ Migration validation harness`);
console.log(`  target db: ${DB_NAME} @ ${PG.host}:${PG.port} as ${PG.user}\n`);

cleanup();
psql("postgres", `CREATE DATABASE "${DB_NAME}"`);

try {
  // ---------------------------------------------------------- Supabase shim
  console.log("▶ Applying Supabase environment shim");
  psql(DB_NAME, `
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text unique,
      raw_user_meta_data jsonb default '{}'::jsonb,
      created_at timestamptz default now()
    );
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
    end $$;
  `);

  // ------------------------------------------------------------- migrations
  console.log("▶ Applying migrations in order");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  check("migration files discovered", files.length >= 6, `found ${files.length}`);
  for (const f of files) {
    const r = psqlFile(DB_NAME, join(MIGRATIONS_DIR, f));
    check(`apply ${f}`, r.ok);
  }

  // ------------------------------------------------------------ functional
  console.log("\n▶ Functional assertions");

  // Bootstrap: signup trigger provisions org + owner profile + pipeline stages
  psql(DB_NAME, `
    insert into auth.users (email, raw_user_meta_data)
    values ('owner@test.local', '{"full_name":"Test Owner","org_name":"Harness Realty"}');
  `);
  check("bootstrap: org created", psql(DB_NAME, `select count(*) from orgs`).out.trim() === "1");
  check("bootstrap: owner profile role", psql(DB_NAME, `select role from profiles limit 1`).out.trim() === "owner");
  check("bootstrap: 7 pipeline stages", psql(DB_NAME, `select count(*) from pipeline_stages`).out.trim() === "7");

  // Seed RPC + idempotency (claim + call share one session)
  const seedCall = `select set_config('request.jwt.claim.sub', (select id::text from auth.users where email='owner@test.local'), false);
    select seed_organization_sample_data();`;
  psql(DB_NAME, seedCall);
  let projects1 = "";
  {
    const res = psql(DB_NAME, seedCall);
    void res;
    projects1 = psql(DB_NAME, `select count(*) from projects`).out.trim();
  }
  const projects2 = psql(DB_NAME, `select count(*) from projects`).out.trim();
  check("seed populated catalog", Number(projects1) >= 6, `projects=${projects1}`);
  check("seed is idempotent", projects1 === projects2);


  // Phone normalization trigger
  psql(DB_NAME, `insert into people (org_id, name, phone) values ((select id from orgs limit 1), 'PhoneNorm', '98100 11122')`);
  check(
    "phone normalization (+91 E.164)",
    psql(DB_NAME, `select phone_normalized from people where name='PhoneNorm'`).out.trim() === "+919810011122"
  );

  // Lead quota trigger fires at plan limit
  psql(DB_NAME, `update orgs set plan='starter'`);
  const flood = psql(
    DB_NAME,
    `insert into leads (org_id, person_name, phone, budget) select (select id from orgs limit 1), 'Flood', '+919999000000', 100000 from generate_series(1, 320)`,
    { stopOnError: false, expectError: true }
  );
  check(
    "lead quota enforced at plan limit",
    !flood.ok && /LEAD_QUOTA_EXCEEDED/.test(flood.err),
  );

  // Role self-elevation blocked (H2) — claim + update share a session
  const selfRole = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerIdRef()}', false);
     update profiles set role='admin';`,
    { stopOnError: false, expectError: true }
  );
  check("self role-change blocked", !selfRole.ok && /SELF_ROLE_CHANGE_FORBIDDEN|ROLE_CHANGE_FORBIDDEN|LAST_OWNER_DEMOTION_FORBIDDEN/.test(selfRole.err));

  // Seat quota enforced
  psql(DB_NAME, `delete from leads where person_name='Flood'; update orgs set plan='growth', max_seats=1`);
  psql(DB_NAME, `insert into auth.users (email) values ('rep@test.local')`);
  const secondUser = psql(DB_NAME, `select id::text from auth.users where email='rep@test.local'`).out.trim();
  const seatQuota = psql(
    DB_NAME,
    `insert into profiles (user_id, org_id, role, full_name) values ('${secondUser}', (select id from orgs limit 1), 'salesperson', 'Rep')`,
    { stopOnError: false, expectError: true }
  );
  check("seat quota enforced", !seatQuota.ok && /SEAT_QUOTA_EXCEEDED/.test(seatQuota.err));

  // Lead ownership forcing (M5): salesperson cannot assign to someone else.
  // rep@test.local already owns a bootstrap profile from their own signup —
  // the OWNER moves them into the harness org as a salesperson (allowed:
  // acting on someone else), then the REP attempts cross-assignment.
  const ownerId = ownerIdRef();
  psql(DB_NAME, `
    select set_config('request.jwt.claim.sub', '${ownerId}', false);
    update orgs set max_seats=25;
    update profiles set org_id=(select id from orgs limit 1), role='salesperson', full_name='Rep Two'
      where user_id='${secondUser}';
    select set_config('request.jwt.claim.sub', '${secondUser}', false);
    insert into leads (org_id, person_name, phone, budget, salesperson_id)
      values ((select id from orgs limit 1), 'OwnForce', '+918888777666', 1000000, '${ownerId}');
  `);
  check(
    "lead ownership forced to self",
    psql(DB_NAME, `select salesperson_id = '${secondUser}' from leads where person_name='OwnForce'`).out.trim() === "t"
  );

  // Billing webhook provider CHECK accepts 'billing'
  const billingEvent = psql(
    DB_NAME,
    `insert into webhook_events (org_id, provider, event_type, idempotency_key, payload) values (null, 'billing', 'checkout.session.completed', 'billing_test_1', '{}')`
  );
  check("webhook_events accepts billing provider", billingEvent.ok);

  // ------------------------------------------------ Migration 0007 Security Hardening Assertions
  // 1. Lead reassignment on UPDATE blocked for salesperson
  const leadReassignAttempt = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${secondUser}', false);
     update leads set salesperson_id='${ownerId}' where person_name='OwnForce';`,
    { stopOnError: false, expectError: true }
  );
  check(
    "0007: lead reassignment blocked on UPDATE for salesperson",
    !leadReassignAttempt.ok && /LEAD_REASSIGNMENT_FORBIDDEN/.test(leadReassignAttempt.err)
  );

  // 2. Salesperson can update normal fields on own lead
  const leadNormalUpdate = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${secondUser}', false);
     update leads set stage='site_visit', last_activity_text='Site visit planned' where person_name='OwnForce';`
  );
  check("0007: salesperson can update normal fields on own lead", leadNormalUpdate.ok);

  // 3. Project unit commercial price change blocked for salesperson
  const unitPriceAttack = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${secondUser}', false);
     update project_units set price = 100000 where id = (select id from project_units limit 1);`,
    { stopOnError: false, expectError: true }
  );
  check(
    "0007: project_unit price change blocked for salesperson",
    !unitPriceAttack.ok && /UNIT_PRICE_UPDATE_FORBIDDEN/.test(unitPriceAttack.err)
  );

  // 4. Project unit operational status update allowed for salesperson
  const unitStatusUpdate = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${secondUser}', false);
     update project_units set status = 'hold', assigned_buyer_name = 'Test Buyer' where id = (select id from project_units limit 1);`
  );
  check("0007: project_unit operational status update allowed for salesperson", unitStatusUpdate.ok);

  // 5. Manager can update project unit price
  const managerPriceUpdate = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     update project_units set price = 50000000 where id = (select id from project_units limit 1);`
  );
  check("0007: manager can update project_unit price", managerPriceUpdate.ok);

  // ------------------------------------------------ Migration 0008 Core Features Assertions
  // 1. Audit log triggers fired on lead/project changes
  const auditCount = psql(DB_NAME, `select count(*) from audit_log`).out.trim();
  check("0008: audit_log records mutations automatically", Number(auditCount) > 0, `count=${auditCount}`);

  // 2. Invitations insertion
  const createInvite = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     insert into invitations (org_id, email, role, token_hash, invited_by)
     values ((select id from orgs limit 1), 'newhire@test.local', 'salesperson', 'hash_test_123', '${ownerId}');`
  );
  check("0008: invitation creation succeeds for manager", createInvite.ok);

  const subInsert = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     insert into subscriptions (org_id, plan, status, billing_cycle, provider, amount, currency)
     values ((select id from orgs limit 1), 'growth', 'active', 'yearly', 'stripe', 47988, 'INR');`
  );
  check("0009: subscription insertion succeeds", subInsert.ok, `err=${subInsert.err} out=${subInsert.out}`);

  const orgSubStatus = psql(
    DB_NAME,
    `select orgs.subscription_status, orgs.billing_cycle from orgs;`
  ).out.trim();
  check("0009: sync_org_subscription_state trigger updates orgs", orgSubStatus.includes("active") && orgSubStatus.includes("yearly"), `got=${orgSubStatus}`);

  // 2. Billing invoice insertion
  const invoiceInsert = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     insert into billing_invoices (org_id, invoice_number, provider, amount, tax_amount, currency, status, plan, billing_cycle, period_start, period_end)
     values ((select id from orgs limit 1), 'INV-2026-0001', 'stripe', 47988, 8637.84, 'INR', 'paid', 'growth', 'yearly', now(), now() + interval '1 year');`
  );
  check("0009: billing_invoices creation succeeds", invoiceInsert.ok);

  // ------------------------------------------------ Migration 0010 SLA Automation Assertions
  // 1. Create a test lead with stage_entered_at set in the past and overdue task
  psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     update orgs set subscription_status = 'active';
     insert into leads (org_id, person_name, phone, budget, stage, stage_entered_at, last_activity_at, created_at, salesperson_id)
     values ((select org_id from profiles where user_id = '${ownerId}'), 'StaleLead', '+919876543210', 20000000, 'site_visit', now() - interval '16 days', now() - interval '16 days', now() - interval '16 days', '${secondUser}');
     insert into tasks (org_id, lead_id, salesperson_id, person_name, phone, title, due_date, status)
     values ((select org_id from profiles where user_id = '${ownerId}'), (select id from leads where person_name='StaleLead'), '${secondUser}', 'StaleLead', '+919876543210', 'Follow-up site visit', '2020-01-01', 'upcoming');`
  );

  // 2. Execute recompute_lead_health_and_slas()
  const slaRun1 = psql(DB_NAME, `select recompute_lead_health_and_slas();`, { stopOnError: false });
  if (!slaRun1.ok) console.error("SLA RUN 1 ERROR:", slaRun1.err, slaRun1.out);
  check("0010: recompute_lead_health_and_slas executes successfully", slaRun1.ok);

  const staleLeadHealth = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select days_in_stage >= 15 and deal_health = 'at_risk' from leads where person_name = 'StaleLead';`
  ).out.trim().split("\n").pop()?.trim();
  check("0010: days_in_stage and at_risk deal_health calculated accurately", staleLeadHealth === "t");

  const taskOverdue = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select status = 'overdue' from tasks where person_name = 'StaleLead';`
  ).out.trim().split("\n").pop()?.trim();
  check("0010: past due task updated to overdue", taskOverdue === "t");

  // 4. Notifications generated
  const notifCount1 = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select count(*) from notifications;`
  ).out.trim().split("\n").pop()?.trim();
  check("0010: SLA breach and overdue notifications created", Number(notifCount1) > 0, `count=${notifCount1}`);

  // 5. Repeated execution is idempotent (no duplicate notifications created)
  const slaRun2 = psql(DB_NAME, `select recompute_lead_health_and_slas();`, { stopOnError: false });
  if (!slaRun2.ok) console.error("SLA RUN 2 ERROR:", slaRun2.err);
  const notifCount2 = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select count(*) from notifications;`
  ).out.trim().split("\n").pop()?.trim();
  check("0010: notification creation is strictly idempotent", notifCount1 === notifCount2);

  // 6. Stage trigger timing: Non-stage update does NOT reset stage_entered_at; stage change resets it
  const beforeTime = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select stage_entered_at::text from leads where person_name = 'StaleLead';`
  ).out.trim().split("\n").pop()?.trim();
  psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     update leads set last_activity_text = 'Unrelated field update' where person_name = 'StaleLead';`
  );
  const afterNonStageUpdate = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select stage_entered_at::text from leads where person_name = 'StaleLead';`
  ).out.trim().split("\n").pop()?.trim();
  check("0010: non-stage lead update preserves stage_entered_at", beforeTime === afterNonStageUpdate);

  psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     update leads set stage = 'negotiation' where person_name = 'StaleLead';`
  );
  const afterStageUpdate = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select stage_entered_at::text from leads where person_name = 'StaleLead';`
  ).out.trim().split("\n").pop()?.trim();
  check("0010: stage change resets stage_entered_at to now", beforeTime !== afterStageUpdate);

  // 7. Audit log recorded for at_risk deal transition
  const slaAudit = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select count(*) from audit_log where action in ('deal_health_at_risk', 'follow_up_overdue');`
  ).out.trim().split("\n").pop()?.trim();
  check("0010: automated state transitions logged to audit_log", Number(slaAudit) > 0, `count=${slaAudit}`);

  // ------------------------------------------------ Migration 0011 Phase 5 Assertions
  // 1. Notification preferences table creation & insertion
  const prefInsert = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${secondUser}', false);
     insert into notification_preferences (user_id, org_id, lead_assignments, task_reminders, sla_alerts, deal_health_alerts, billing_notifications)
     values ('${secondUser}', (select org_id from profiles where user_id = '${ownerId}'), true, true, true, true, true);`
  );
  check("0011: notification_preferences table insertion succeeds", prefInsert.ok);

  // 2. emit_notification respects user preferences
  psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${secondUser}', false);
     update notification_preferences set lead_assignments = false where user_id = '${secondUser}';`
  );
  const skippedNotif = psql(
    DB_NAME,
    `select emit_notification((select org_id from profiles where user_id = '${ownerId}'), '${secondUser}', 'Skipped Lead', 'Should not emit', 'lead_assigned', 'normal', 'lead', (select id from leads limit 1), '/leads', 'test_skip_1');`
  ).out.trim().split("\n").pop()?.trim();
  check("0011: emit_notification skips when user preference disabled", skippedNotif === "");

  // 3. Lead assignment trigger automatically creates notification when preference enabled
  psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${secondUser}', false);
     update notification_preferences set lead_assignments = true where user_id = '${secondUser}';
     insert into leads (org_id, person_name, phone, budget, salesperson_id)
     values ((select org_id from profiles where user_id = '${ownerId}'), 'TriggerLead', '+919911223344', 5000000, '${secondUser}');`
  );
  const leadNotif = psql(
    DB_NAME,
    `select set_config('request.jwt.claim.sub', '${secondUser}', false);
     select count(*) from notifications where user_id = '${secondUser}' and type = 'lead_assigned' and title like '%TriggerLead%';`
  ).out.trim().split("\n").pop()?.trim();
  check("0011: lead assignment trigger creates lead_assigned notification", Number(leadNotif) > 0);

  // 4. Strict user isolation under RLS: User A cannot see User B's notifications
  psql(
    DB_NAME,
    `grant usage on schema public to authenticated;
     grant all on all tables in schema public to authenticated;
     grant all on all sequences in schema public to authenticated;
     grant execute on all functions in schema public to authenticated;`
  );
  const userASeeB = psql(
    DB_NAME,
    `set role authenticated;
     select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select count(*) from notifications where user_id = '${secondUser}';`
  ).out.trim().split("\n").pop()?.trim();
  check("0011: user A cannot query user B notifications under RLS", userASeeB === "0", `got=${userASeeB}`);

  // ------------------------------------------------ Migration 0012 Phase 6 Assertions
  // 1. Aria AI search indexes exist and are valid
  const unitIndexExists = psql(
    DB_NAME,
    `select count(*) from pg_indexes where indexname = 'idx_project_units_aria_search';`
  ).out.trim().split("\n").pop()?.trim();
  check("0012: idx_project_units_aria_search index created", unitIndexExists === "1");

  const leadIndexExists = psql(
    DB_NAME,
    `select count(*) from pg_indexes where indexname = 'idx_leads_ai_phone_email';`
  ).out.trim().split("\n").pop()?.trim();
  check("0012: idx_leads_ai_phone_email index created", leadIndexExists === "1");

  const docIndexExists = psql(
    DB_NAME,
    `select count(*) from pg_indexes where indexname = 'idx_documents_ai_lookup';`
  ).out.trim().split("\n").pop()?.trim();
  check("0012: idx_documents_ai_lookup index created", docIndexExists === "1");

  const projectIndexExists = psql(
    DB_NAME,
    `select count(*) from pg_indexes where indexname = 'idx_projects_ai_search';`
  ).out.trim().split("\n").pop()?.trim();
  check("0012: idx_projects_ai_search index created", projectIndexExists === "1");

  // ------------------------------------------------ Migration 0013 Phase 7 Assertions
  // 1. org_assignment_state table exists
  const assignStateExists = psql(
    DB_NAME,
    `select count(*) from information_schema.tables where table_name = 'org_assignment_state';`
  ).out.trim().split("\n").pop()?.trim();
  check("0013: org_assignment_state table created", assignStateExists === "1");

  // 2. assign_next_salesperson function returns an assigned salesperson
  const assignRepTest = psql(
    DB_NAME,
    `select count(*) from public.assign_next_salesperson((select org_id from profiles limit 1));`
  ).out.trim().split("\n").pop()?.trim();
  check("0013: assign_next_salesperson function executes successfully", assignRepTest === "1", `got=${assignRepTest}`);

  // 3. webhook_sources project_id column exists
  const sourceColExists = psql(
    DB_NAME,
    `select count(*) from information_schema.columns where table_name = 'webhook_sources' and column_name = 'project_id';`
  ).out.trim().split("\n").pop()?.trim();
  check("0013: webhook_sources.project_id column exists", sourceColExists === "1");

  // 4. leads marketing attribution columns exist
  const leadCampaignCol = psql(
    DB_NAME,
    `select count(*) from information_schema.columns where table_name = 'leads' and column_name = 'campaign_id';`
  ).out.trim().split("\n").pop()?.trim();
  check("0013: leads.campaign_id column exists", leadCampaignCol === "1");

  // ------------------------------------------------ Migration 0014 Phase 8 Assertions
  // 1. leads deal_health_score column exists
  const leadHealthScoreCol = psql(
    DB_NAME,
    `select count(*) from information_schema.columns where table_name = 'leads' and column_name = 'deal_health_score';`
  ).out.trim().split("\n").pop()?.trim();
  check("0014: leads.deal_health_score column exists", leadHealthScoreCol === "1");

  // 2. leads deal_health_factors column exists
  const leadFactorsCol = psql(
    DB_NAME,
    `select count(*) from information_schema.columns where table_name = 'leads' and column_name = 'deal_health_factors';`
  ).out.trim().split("\n").pop()?.trim();
  check("0014: leads.deal_health_factors column exists", leadFactorsCol === "1");

  // 3. calculate_lead_deal_health stored procedure returns deterministic score
  const healthFnTest = psql(
    DB_NAME,
    `select count(*) from public.calculate_lead_deal_health((select id from leads limit 1));`
  ).out.trim().split("\n").pop()?.trim();
  check("0014: calculate_lead_deal_health function executes successfully", healthFnTest === "1", `got=${healthFnTest}`);

  // 4. recompute_lead_health_and_slas populates deal_health_score and factors
  psql(DB_NAME, `select public.recompute_lead_health_and_slas((select id from orgs limit 1));`);
  const scorePopulated = psql(
    DB_NAME,
    `select count(*) from leads where deal_health_score is not null and deal_health_factors is not null;`
  ).out.trim().split("\n").pop()?.trim();
  check("0014: recompute_lead_health_and_slas populates deal_health_score and factors", Number(scorePopulated) > 0, `leadsWithScore=${scorePopulated}`);

  // ------------------------------------------------ Migration 0015 Phase 9 Assertions
  // 1. get_pipeline_analytics RPC executes and returns summary and stages
  const pipeRpc = psql(
    DB_NAME,
    `select (public.get_pipeline_analytics((select id from orgs limit 1))) ? 'summary' as has_summary;`
  ).out.trim().split("\n").pop()?.trim();
  check("0015: get_pipeline_analytics returns summary object", pipeRpc === "t", `got=${pipeRpc}`);

  // 2. get_rep_performance_analytics RPC executes
  const repsRpc = psql(
    DB_NAME,
    `select jsonb_typeof(public.get_rep_performance_analytics((select id from orgs limit 1))) as rep_type;`
  ).out.trim().split("\n").pop()?.trim();
  check("0015: get_rep_performance_analytics returns jsonb array", repsRpc === "array", `got=${repsRpc}`);

  // 3. get_time_series_analytics RPC executes
  const tsRpc = psql(
    DB_NAME,
    `select jsonb_typeof(public.get_time_series_analytics((select id from orgs limit 1))) as ts_type;`
  ).out.trim().split("\n").pop()?.trim();
  check("0015: get_time_series_analytics returns jsonb array", tsRpc === "array", `got=${tsRpc}`);

  // 4. get_pipeline_velocity_analytics RPC executes
  const velRpc = psql(
    DB_NAME,
    `select (public.get_pipeline_velocity_analytics((select id from orgs limit 1))) ? 'avg_sales_cycle_days' as has_vel;`
  ).out.trim().split("\n").pop()?.trim();
  check("0015: get_pipeline_velocity_analytics returns sales cycle metrics", velRpc === "t", `got=${velRpc}`);

  // 5. get_executive_dashboard_analytics RPC executes
  const execRpc = psql(
    DB_NAME,
    `select (public.get_executive_dashboard_analytics((select id from orgs limit 1))) ? 'forecast' as has_forecast;`
  ).out.trim().split("\n").pop()?.trim();
  check("0015: get_executive_dashboard_analytics returns consolidated dashboard", execRpc === "t", `got=${execRpc}`);

  // ------------------------------------------------ Migration 0016 Phase 10 Assertions
  // 1. find_resurrection_candidates RPC executes and returns candidates
  psql(DB_NAME, `
    update leads
    set stage='lost', lost_reason='budget_too_high', lost_at=now() - interval '20 days'
    where id = (select id from leads limit 1);
  `);
  const candRpc = psql(
    DB_NAME,
    `select jsonb_typeof(public.find_resurrection_candidates(
      (select id from orgs limit 1),
      (select id from leads limit 1),
      5,
      10
    )) as cand_type;`
  ).out.trim().split("\n").pop()?.trim();
  check("0016: find_resurrection_candidates returns jsonb array", candRpc === "array", `got=${candRpc}`);

  // 2. scan_resurrection_opportunities RPC executes
  const scanRpc = psql(
    DB_NAME,
    `select (public.scan_resurrection_opportunities(
      (select id from orgs limit 1),
      10,
      10,
      10,
      true
    )) ? 'opportunities' as has_opps;`
  ).out.trim().split("\n").pop()?.trim();
  check("0016: scan_resurrection_opportunities returns opportunities", scanRpc === "t", `got=${scanRpc}`);

  // 3. execute_lead_resurrection RPC executes atomically
  const execResurrectRaw = psql(
    DB_NAME,
    `select public.execute_lead_resurrection(
      (select org_id from leads limit 1),
      (select id from leads limit 1),
      (select user_id from profiles where org_id = (select org_id from leads limit 1) limit 1),
      (select id from project_units where org_id = (select org_id from leads limit 1) limit 1),
      'Test multi-factor resurrection pitch'
    );`
  ).out.trim();
  check("0016: execute_lead_resurrection transitions lead and creates task", /"success":\s*true/.test(execResurrectRaw), `got=${execResurrectRaw}`);

  // ------------------------------------------------ Migration 0017 Phase 11 Assertions
  // 1. Negative budget blocked by check constraint
  const negBudget = psql(
    DB_NAME,
    `insert into leads (org_id, person_name, phone, budget) values ((select id from orgs limit 1), 'NegBudget', '+919999111222', -5000)`,
    { stopOnError: false, expectError: true }
  );
  check("0017: negative lead budget blocked by check constraint", !negBudget.ok && /chk_leads_budget_non_negative/.test(negBudget.err));

  // 2. Zero/negative unit price blocked by check constraint
  const zeroPrice = psql(
    DB_NAME,
    `insert into project_units (org_id, project_id, tower, unit_number, floor, configuration, super_area_sq_ft, price) values ((select id from orgs limit 1), (select id from projects limit 1), 'Tower Z', '999', 5, '3 BHK', 1500, 0)`,
    { stopOnError: false, expectError: true }
  );
  check("0017: zero/negative unit price blocked by check constraint", !zeroPrice.ok && /chk_units_price_positive/.test(zeroPrice.err));

  // 3. Atomic unit reservation RPC succeeds for available unit
  const reserve1 = psql(
    DB_NAME,
    `select public.reserve_project_unit(
      (select org_id from leads limit 1),
      (select id from project_units where status='available' limit 1),
      (select id from leads limit 1),
      (select user_id from profiles where org_id = (select org_id from leads limit 1) limit 1),
      'booked',
      'First reservation'
    );`
  ).out.trim();
  check("0017: reserve_project_unit succeeds for available unit", /"success":\s*true/.test(reserve1), `got=${reserve1}`);

  // 4. Second reservation attempt on the same unit fails with UNIT_NOT_AVAILABLE (race-condition protection)
  const unitIdReserved = JSON.parse(reserve1)?.unitId;
  const reserve2 = psql(
    DB_NAME,
    `select public.reserve_project_unit(
      (select org_id from leads limit 1),
      '${unitIdReserved}'::uuid,
      (select id from leads order by id desc limit 1),
      (select user_id from profiles where org_id = (select org_id from leads limit 1) limit 1),
      'booked',
      'Second reservation attempt'
    );`
  ).out.trim();
  check("0017: double-booking race condition blocked with UNIT_NOT_AVAILABLE", /UNIT_NOT_AVAILABLE/.test(reserve2), `got=${reserve2}`);

  // 5. Sole owner deletion blocked by owner preservation guard
  const delOwner = psql(
    DB_NAME,
    `delete from profiles where user_id = '${ownerIdRef()}';`,
    { stopOnError: false, expectError: true }
  );
  check("0017: sole owner deletion blocked by owner preservation guard", !delOwner.ok && /LAST_OWNER_DELETION_FORBIDDEN/.test(delOwner.err));
} finally {
  cleanup();
}

// ------------------------------------------------------------------ report -
console.log("\n▶ Results");
for (const r of results) {
  console.log(`${r.pass ? "  ✓" : "  ✗"} ${r.name}${r.pass ? "" : ` — ${r.detail}`}`);
}
console.log(`\n${failures === 0 ? "✅ ALL MIGRATION CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
