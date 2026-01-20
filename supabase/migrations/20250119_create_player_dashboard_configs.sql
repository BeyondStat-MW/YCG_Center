-- Create a table to store dashboard configurations for each player
create table if not exists player_dashboard_configs (
  player_id uuid references profiles(id) not null primary key,
  config jsonb not null, -- Stores the 'cards' array
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table player_dashboard_configs enable row level security;

-- Policies
create policy "Allow read access for authenticated users"
  on player_dashboard_configs for select
  to authenticated
  using (true);

create policy "Allow insert/update for authenticated users"
  on player_dashboard_configs for insert
  to authenticated
  with check (true);

create policy "Allow update for authenticated users"
  on player_dashboard_configs for update
  to authenticated
  using (true);
