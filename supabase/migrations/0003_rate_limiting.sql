-- ============================================================================
-- Ecosystem Realty — Migration 0003: Durable Rate Limiting
-- Postgres-backed fixed-window limiter for cost-critical endpoints.
-- Service-role only: no client-facing policies.
-- ============================================================================

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  hit_count integer not null default 1
);

alter table public.rate_limit_buckets enable row level security;
-- Zero policies: only the service-role key can touch this table.

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  insert into rate_limit_buckets (bucket_key, window_started_at, hit_count)
  values (p_key, v_now, 1)
  on conflict (bucket_key) do update set
    hit_count = case
      when rate_limit_buckets.window_started_at < v_now - make_interval(secs => p_window_seconds)
        then 1
      else rate_limit_buckets.hit_count + 1
    end,
    window_started_at = case
      when rate_limit_buckets.window_started_at < v_now - make_interval(secs => p_window_seconds)
        then v_now
      else rate_limit_buckets.window_started_at
    end
  returning hit_count into v_count;

  -- Opportunistic cleanup of expired buckets (~1% of calls)
  if random() < 0.01 then
    delete from rate_limit_buckets
    where window_started_at < v_now - interval '2 hours';
  end if;

  return v_count;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer) from anon, authenticated;
