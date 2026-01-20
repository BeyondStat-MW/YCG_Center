-- Function to refresh materialized views
-- Can be called via Supabase RPC

create or replace function refresh_stats()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently mv_team_stats;
  refresh materialized view concurrently mv_daily_stats;
end;
$$;
