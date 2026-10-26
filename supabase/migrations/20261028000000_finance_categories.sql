-- User-managed budget categories shared by Budget and expense entry.
-- Existing transactions and budget rows are preserved when a category is archived.

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_key text not null,
  name text not null,
  icon text not null default 'package',
  accent_class text not null default 'bg-muted-foreground',
  essential boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_key),
  constraint finance_categories_key_format check (category_key ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  constraint finance_categories_name_length check (char_length(trim(name)) between 1 and 60)
);

create index if not exists finance_categories_user_active_idx
  on public.finance_categories(user_id, is_active, name);

alter table public.finance_categories enable row level security;
drop policy if exists "Users manage own finance categories" on public.finance_categories;
create policy "Users manage own finance categories"
  on public.finance_categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Custom category slugs are stored in the same text columns as built-in categories.
alter table public.transactions drop constraint if exists transactions_category_check;
alter table public.transactions add constraint transactions_category_check
  check (category ~ '^[a-z0-9][a-z0-9_-]{0,79}$');
alter table public.budgets drop constraint if exists budgets_category_check;
alter table public.budgets add constraint budgets_category_check
  check (category ~ '^[a-z0-9][a-z0-9_-]{0,79}$');
alter table public.upcoming_expenses drop constraint if exists upcoming_expenses_category_check;
alter table public.upcoming_expenses add constraint upcoming_expenses_category_check
  check (category ~ '^[a-z0-9][a-z0-9_-]{0,79}$');
alter table public.savings_challenges drop constraint if exists savings_challenges_category_check;
alter table public.savings_challenges add constraint savings_challenges_category_check
  check (category ~ '^[a-z0-9][a-z0-9_-]{0,79}$');

create or replace function public.seed_default_finance_categories(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.finance_categories
    (user_id, category_key, name, icon, accent_class, essential)
  values
    (p_user_id, 'food', 'Food', 'utensils', 'bg-crimson', true),
    (p_user_id, 'transport', 'Transport', 'bus', 'bg-navy', true),
    (p_user_id, 'rent', 'Rent', 'house', 'bg-navy', true),
    (p_user_id, 'bursary', 'Bursary', 'graduation', 'bg-bursary', false),
    (p_user_id, 'electricity', 'Electricity', 'zap', 'bg-navy', true),
    (p_user_id, 'airtime', 'Airtime & Data', 'smartphone', 'bg-primary', true),
    (p_user_id, 'entertainment', 'Entertainment', 'clapper', 'bg-success', false),
    (p_user_id, 'other', 'Other', 'package', 'bg-muted-foreground', false)
  on conflict (user_id, category_key) do nothing;
$$;
revoke all on function public.seed_default_finance_categories(uuid) from public, anon, authenticated;

-- Seed accounts that already exist, then seed the defaults for new sign-ups.
select public.seed_default_finance_categories(id) from auth.users;

create or replace function public.seed_finance_categories_after_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_default_finance_categories(new.id);
  return new;
end;
$$;
revoke all on function public.seed_finance_categories_after_signup() from public, anon, authenticated;

drop trigger if exists seed_finance_categories_after_signup on auth.users;
create trigger seed_finance_categories_after_signup
  after insert on auth.users
  for each row execute function public.seed_finance_categories_after_signup();
