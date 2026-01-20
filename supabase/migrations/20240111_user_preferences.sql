-- Migration: Create UserPreferences Table
-- Purpose: Store user-specific application settings (theme, notifications, etc.) linked to 'Users' table.

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme varchar(20) default 'light',
  notifications_enabled boolean default true,
  language varchar(10) default 'ko',
  dashboard_layout jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- One-to-One constraint
  constraint unique_user_prefs unique (user_id)
);

-- RLS Policies
alter table public.user_preferences enable row level security;

create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

-- Trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_user_preferences_modtime
    before update on public.user_preferences
    for each row
    execute function update_updated_at_column();
