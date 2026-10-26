create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', phone text not null default '', university text not null default '',
  student_number text not null default '', study_year text not null default '', nsfas_recipient boolean not null default false,
  avatar_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', '')) on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute procedure public.create_profile_for_user();

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, note text, category text not null check (category in ('food','transport','bursary','electricity','airtime','entertainment','other')),
  type text not null check (type in ('income','expense')), amount numeric(12,2) not null check (amount > 0),
  transaction_date date not null default current_date, method text not null default 'Card' check (method in ('Card','Cash','EFT','NSFAS Wallet')),
  receipt_path text, created_at timestamptz not null default now()
);
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('food','transport','bursary','electricity','airtime','entertainment','other')),
  month_start date not null, monthly_limit numeric(12,2) not null check (monthly_limit >= 0), created_at timestamptz not null default now(),
  unique (user_id, category, month_start)
);
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, category text not null default 'general', target_amount numeric(12,2) not null check (target_amount > 0),
  saved_amount numeric(12,2) not null default 0 check (saved_amount >= 0), target_date date, created_at timestamptz not null default now()
);
create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade, amount numeric(12,2) not null check (amount > 0), created_at timestamptz not null default now()
);
create or replace function public.add_goal_contribution(p_goal_id uuid, p_amount numeric) returns numeric
language plpgsql security invoker set search_path = '' as $$
declare v_saved numeric;
begin
  if p_amount <= 0 then raise exception 'Contribution must be positive'; end if;
  update public.savings_goals set saved_amount = least(target_amount, saved_amount + p_amount)
  where id = p_goal_id and user_id = auth.uid() returning saved_amount into v_saved;
  if v_saved is null then raise exception 'Goal not found'; end if;
  insert into public.goal_contributions(user_id, goal_id, amount) values (auth.uid(), p_goal_id, p_amount);
  return v_saved;
end; $$;
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 5000), status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz not null default now()
);
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')), content text not null, created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.support_requests enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users manage own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Users manage own transactions" on public.transactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own budgets" on public.budgets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own goals" on public.savings_goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own goal contributions" on public.goal_contributions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users read own support requests" on public.support_requests for select to authenticated using (user_id = auth.uid());
create policy "Users create own support requests" on public.support_requests for insert to authenticated with check (user_id = auth.uid());
create policy "Users manage own chat sessions" on public.chat_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own chat messages" on public.chat_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Users read own avatar" on storage.objects for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own avatar" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
