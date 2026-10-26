-- Additive PlanWisely student finance, Wisey automation, privacy, and admin schema.
-- Safe to apply to the existing project after the original migrations. This does
-- not recreate base tables or rely on re-running the original policy migration.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists guardian_email text,
  add column if not exists guardian_consent_at timestamptz,
  add column if not exists wisey_ai_consent_at timestamptz,
  add column if not exists budget_period_start date,
  add column if not exists next_payment_date date,
  add column if not exists spending_alerts_enabled boolean not null default true,
  add column if not exists weekly_summary_enabled boolean not null default true,
  add column if not exists income_pattern text not null default 'irregular'
    check (income_pattern in ('recurring','irregular'));

alter table public.transactions
  add column if not exists income_source text,
  add column if not exists is_recurring boolean not null default false,
  add column if not exists expected_next_payment_date date;
alter table public.transactions drop constraint if exists transactions_income_source_check;
alter table public.transactions add constraint transactions_income_source_check
  check (income_source is null or income_source in ('allowance','bursary_nsfas','part_time_work','family_support','other'));

alter table public.transactions drop constraint if exists transactions_category_check;
alter table public.transactions add constraint transactions_category_check
  check (category in ('food','transport','rent','bursary','electricity','airtime','entertainment','other'));
alter table public.budgets drop constraint if exists budgets_category_check;
alter table public.budgets add constraint budgets_category_check
  check (category in ('food','transport','rent','bursary','electricity','airtime','entertainment','other'));

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_birth text := new.raw_user_meta_data ->> 'birth_date';
  v_guardian_email text := new.raw_user_meta_data ->> 'guardian_email';
  v_wisey_ai boolean := coalesce((new.raw_user_meta_data ->> 'wisey_ai_consent')::boolean,false);
begin
  insert into public.profiles(id,full_name,birth_date,guardian_email,guardian_consent_at,wisey_ai_consent_at)
  values(new.id,coalesce(new.raw_user_meta_data ->> 'full_name',''),nullif(v_birth,'')::date,
    nullif(v_guardian_email,''),case when coalesce((new.raw_user_meta_data ->> 'guardian_consent')::boolean,false) then now() else null end,
    case when v_wisey_ai then now() else null end)
  on conflict(id) do update set full_name=excluded.full_name,birth_date=excluded.birth_date,
    guardian_email=excluded.guardian_email,guardian_consent_at=excluded.guardian_consent_at,
    wisey_ai_consent_at=excluded.wisey_ai_consent_at;
  insert into public.consent_records(user_id,purpose,version)
  select new.id,'data_processing','2026-10-v1'
  where coalesce((new.raw_user_meta_data ->> 'privacy_consent')::boolean,false)
  on conflict do nothing;
  if coalesce((new.raw_user_meta_data ->> 'guardian_consent')::boolean,false) then
    insert into public.consent_records(user_id,purpose,version)
    values(new.id,'guardian_consent','2026-10-v1') on conflict do nothing;
  end if;
  if v_wisey_ai then
    insert into public.consent_records(user_id,purpose,version)
    values(new.id,'wisey_ai','2026-10-v1') on conflict do nothing;
  end if;
  return new;
end; $$;

create table if not exists public.upcoming_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (category in ('food','transport','rent','airtime','entertainment','other')),
  amount numeric(12,2) not null check (amount > 0 and amount <= 100000000),
  due_date date not null,
  essential boolean not null default true,
  status text not null default 'planned' check (status in ('planned','paid','cancelled')),
  paid_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'paid') = (paid_transaction_id is not null))
);

-- If a user removes the linked transaction, put the planned cost back in the
-- upcoming list so the budget never silently loses the planned expense.
create or replace function public.restore_upcoming_expense_after_transaction_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.upcoming_expenses
  set status='planned', paid_transaction_id=null, updated_at=now()
  where paid_transaction_id=old.id;
  return old;
end; $$;
drop trigger if exists restore_upcoming_expense_before_transaction_delete on public.transactions;
create trigger restore_upcoming_expense_before_transaction_delete
before delete on public.transactions
for each row execute function public.restore_upcoming_expense_after_transaction_delete();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('budget','upcoming','pace','quiet','goal','weekly_summary','tip','streak','challenge','system')),
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 2000),
  rule text,
  details jsonb not null default '{}'::jsonb,
  action_path text,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  action_type text not null,
  dedupe_key text not null unique,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.health_score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  score integer not null check (score between 0 and 100),
  budget_adherence integer not null check (budget_adherence between 0 and 30),
  savings_progress integer not null check (savings_progress between 0 and 25),
  spending_consistency integer not null check (spending_consistency between 0 and 25),
  app_engagement integer not null check (app_engagement between 0 and 20),
  explanation jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default (timezone('Africa/Johannesburg', now()))::date,
  activity_type text not null check (activity_type in ('transaction','goal_contribution','budget_update','meaningful_login')),
  created_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

create table if not exists public.wisey_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check(request_count >= 0),
  primary key(user_id,window_start)
);
alter table public.wisey_usage enable row level security;

create or replace function public.consume_wisey_request()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_window timestamptz:=date_trunc('hour',now()); v_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  insert into public.wisey_usage(user_id,window_start,request_count) values(v_uid,v_window,1)
  on conflict(user_id,window_start) do update set request_count=public.wisey_usage.request_count+1
  where public.wisey_usage.request_count < 20 returning request_count into v_count;
  if v_count is null then raise exception 'Wisey message limit reached. Please try again later.'; end if;
  return v_count;
end; $$;

create or replace function public.grant_my_wisey_consent()
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_granted timestamptz:=now();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  insert into public.consent_records(user_id,purpose,version,granted_at)
  values(v_uid,'wisey_ai','2026-10-v1',v_granted);
  update public.profiles set wisey_ai_consent_at=v_granted,updated_at=now() where id=v_uid;
  return v_granted;
end; $$;

create or replace function public.withdraw_my_wisey_consent()
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_withdrawn timestamptz:=now();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  update public.consent_records set withdrawn_at=v_withdrawn
  where user_id=v_uid and purpose='wisey_ai' and withdrawn_at is null;
  update public.profiles set wisey_ai_consent_at=null,updated_at=now() where id=v_uid;
  return v_withdrawn;
end; $$;

create table if not exists public.login_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_active_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  description text not null check (char_length(description) between 1 and 1000),
  category text not null check (category in ('food','transport','rent','airtime','entertainment','other')),
  baseline_amount numeric(12,2) not null check (baseline_amount >= 0),
  target_reduction_percent numeric(5,2) not null check (target_reduction_percent between 1 and 90),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'offered' check (status in ('offered','accepted','declined','completed','expired')),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (ends_on >= starts_on)
);

create table if not exists public.user_rewards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp_total integer not null default 0 check(xp_total >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.educational_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('tip','guide')),
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 12000),
  category text not null default 'budgeting',
  risk_level text check (risk_level in ('low','medium','high')),
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.educational_content(kind,title,body,category,risk_level,published)
select 'tip','Make a small weekly saving automatic',
  'Choose one manageable amount after essentials are covered. Move it to a separate savings pocket on payment day, then review it before increasing the amount.',
  'saving',null,true
where not exists(select 1 from public.educational_content where title='Make a small weekly saving automatic');
insert into public.educational_content(kind,title,body,category,risk_level,published)
select 'tip','Set a limit for your flexible spending',
  'Look at your recorded spending for one flexible category. Choose a realistic amount for the next week and check it once midweek. Keep rent, food, transport and other essentials covered first.',
  'budgeting',null,true
where not exists(select 1 from public.educational_content where title='Set a limit for your flexible spending');
insert into public.educational_content(kind,title,body,category,risk_level,published)
select 'tip','Learn before you invest',
  'Before choosing an investment, understand the fees, risks, time horizon and how easy it is to access your money. Avoid offers promising guaranteed quick returns.',
  'investing',null,true
where not exists(select 1 from public.educational_content where title='Learn before you invest');

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow text not null,
  status text not null check (status in ('started','succeeded','failed')),
  processed_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.support_requests add column if not exists admin_reply text;
alter table public.support_requests add column if not exists updated_at timestamptz not null default now();
-- Define the helper before policies that call it.
create or replace function public.is_planwisely_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt()->>'aal','aal1')='aal2'
    and exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;
create or replace function public.has_planwisely_admin_role()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;
drop policy if exists "Admins manage support requests" on public.support_requests;
create policy "Admins manage support requests" on public.support_requests for all to authenticated using(public.is_planwisely_admin()) with check(public.is_planwisely_admin());

create table if not exists public.support_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  admin_id uuid references auth.users(id) on delete set null,
  message text not null check(char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);
alter table public.support_replies enable row level security;
drop policy if exists "Users view own support replies" on public.support_replies;
create policy "Users view own support replies" on public.support_replies for select to authenticated using(exists(select 1 from public.support_requests r where r.id=request_id and r.user_id=auth.uid()));
drop policy if exists "Admins manage support replies" on public.support_replies;
create policy "Admins manage support replies" on public.support_replies for all to authenticated using(public.is_planwisely_admin()) with check(public.is_planwisely_admin());

create or replace function public.log_admin_action(p_action text,p_subject_user_id uuid,p_reason text,p_details jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_planwisely_admin() then raise exception 'Admin access required'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'A reason is required'; end if;
  insert into public.audit_logs(actor_id,subject_user_id,action,reason,details)
  values(auth.uid(),p_subject_user_id,p_action,trim(p_reason),coalesce(p_details,'{}'::jsonb)) returning id into v_id;
  return v_id;
end; $$;

create table if not exists public.user_content_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.educational_content(id) on delete cascade,
  saved boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, content_id)
);

create or replace function public.record_meaningful_activity(p_type text default 'meaningful_login')
returns public.login_streaks language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (timezone('Africa/Johannesburg', now()))::date;
  v_last date;
  v_current integer;
  v_row public.login_streaks;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_type not in ('transaction','goal_contribution','budget_update','meaningful_login') then raise exception 'Invalid activity'; end if;
  insert into public.user_activity(user_id, activity_date, activity_type)
  values (v_uid, v_today, p_type) on conflict (user_id, activity_date) do nothing;
  select current_streak, last_active_date into v_current, v_last
  from public.login_streaks where user_id = v_uid for update;
  if not found then
    insert into public.login_streaks(user_id,current_streak,longest_streak,last_active_date)
    values(v_uid,1,1,v_today) returning * into v_row;
    return v_row;
  end if;
  if v_last = v_today then return (select s from public.login_streaks s where s.user_id = v_uid); end if;
  v_current := case when v_last = v_today - 1 then v_current + 1 else 1 end;
  update public.login_streaks set current_streak=v_current,
    longest_streak=greatest(longest_streak,v_current), last_active_date=v_today, updated_at=now()
  where user_id=v_uid returning * into v_row;
  return v_row;
end; $$;

create or replace function public.refresh_my_health_score()
returns public.health_score_history language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (timezone('Africa/Johannesburg', now()))::date;
  v_week date := date_trunc('week', v_today)::date;
  v_period_start date;
  v_period_end date;
  v_income_pattern text := 'irregular';
  v_cycle_days integer;
  v_budget numeric := 0;
  v_spent numeric := 0;
  v_goal_target numeric := 0;
  v_goal_saved numeric := 0;
  v_days integer := 0;
  v_spending_days integer := 0;
  v_avg_daily numeric := 0;
  v_sd_daily numeric := 0;
  v_budget_points integer := 0;
  v_savings_points integer := 0;
  v_consistency_points integer := 0;
  v_engagement_points integer := 0;
  v_score integer := 0;
  v_row public.health_score_history;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select p.budget_period_start,p.next_payment_date,p.income_pattern
  into v_period_start,v_period_end,v_income_pattern
  from public.profiles p where p.id=v_uid;
  v_period_start:=coalesce(v_period_start,date_trunc('month',v_today)::date);
  if v_income_pattern='recurring' and v_period_end is not null and v_period_end<v_today then
    v_cycle_days:=greatest(1,v_period_end-v_period_start);
    while v_period_end<v_today loop
      v_period_start:=v_period_end+1;
      v_period_end:=v_period_start+v_cycle_days-1;
    end loop;
  end if;
  select coalesce(sum(b.monthly_limit),0) into v_budget from public.budgets b
  where b.user_id=v_uid and b.month_start <= v_today
    and b.month_start = (select max(b2.month_start) from public.budgets b2 where b2.user_id=v_uid and b2.category=b.category and b2.month_start <= v_today);
  select coalesce(sum(t.amount),0) into v_spent from public.transactions t
  where t.user_id=v_uid and t.type='expense' and t.transaction_date >= v_period_start and t.transaction_date <= v_today;
  select coalesce(sum(target_amount),0), coalesce(sum(saved_amount),0) into v_goal_target,v_goal_saved
  from public.savings_goals where user_id=v_uid;
  select count(distinct activity_date) into v_days from public.user_activity
  where user_id=v_uid and activity_date >= v_week and activity_date <= v_today;
  select count(*),coalesce(avg(day_total),0),coalesce(stddev_pop(day_total),0)
  into v_spending_days,v_avg_daily,v_sd_daily
  from (select transaction_date,sum(amount) as day_total from public.transactions
    where user_id=v_uid and type='expense' and transaction_date >= v_today-6 and transaction_date <= v_today
    group by transaction_date) daily;
  v_budget_points := case when v_budget <= 0 then 0 else greatest(0, least(30, round(30 * greatest(0, 1 - greatest(0, (v_spent-v_budget)/v_budget)))::integer)) end;
  v_savings_points := case when v_goal_target <= 0 then 0 else least(25, round(25 * least(1, v_goal_saved/v_goal_target))::integer) end;
  -- Consistency rewards steadier spending across days with recorded expenses.
  v_consistency_points := case when v_spending_days=0 or v_avg_daily=0 then 0
    else least(25,round(25*greatest(0,least(1,1-(v_sd_daily/v_avg_daily))))::integer) end;
  v_engagement_points := least(20, round(20 * least(1, v_days::numeric/7))::integer);
  v_score := v_budget_points + v_savings_points + v_consistency_points + v_engagement_points;
  insert into public.health_score_history(user_id,week_start,score,budget_adherence,savings_progress,spending_consistency,app_engagement,explanation)
  values(v_uid,v_week,v_score,v_budget_points,v_savings_points,v_consistency_points,v_engagement_points,
    jsonb_build_object('period_start',v_period_start,'period_spent',v_spent,'cycle_budget',v_budget,'goal_saved',v_goal_saved,'goal_target',v_goal_target,'active_days',v_days,'spending_days',v_spending_days,'daily_spending_variation',v_sd_daily))
  on conflict(user_id,week_start) do update set score=excluded.score,budget_adherence=excluded.budget_adherence,
    savings_progress=excluded.savings_progress,spending_consistency=excluded.spending_consistency,
    app_engagement=excluded.app_engagement,explanation=excluded.explanation,calculated_at=now()
  returning * into v_row;
  return v_row;
end; $$;

create or replace function public.mark_upcoming_expense_paid(p_expense_id uuid, p_method text default 'Card')
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_expense public.upcoming_expenses;
  v_transaction_id uuid;
begin
  select * into v_expense from public.upcoming_expenses
  where id=p_expense_id and user_id=auth.uid() for update;
  if not found then raise exception 'Upcoming expense not found'; end if;
  if v_expense.status='paid' then return v_expense.paid_transaction_id; end if;
  if v_expense.status <> 'planned' then raise exception 'This expense cannot be marked as paid'; end if;
  if p_method not in ('Card','Cash','EFT','NSFAS Wallet') then raise exception 'Invalid payment method'; end if;
  insert into public.transactions(user_id,title,note,category,type,amount,transaction_date,method)
  values(auth.uid(),v_expense.title,'Paid planned expense',v_expense.category,'expense',v_expense.amount,v_expense.due_date,p_method)
  returning id into v_transaction_id;
  update public.upcoming_expenses set status='paid',paid_transaction_id=v_transaction_id,updated_at=now()
  where id=p_expense_id;
  return v_transaction_id;
end; $$;

alter table public.consent_records enable row level security;
alter table public.upcoming_expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.agent_actions enable row level security;
alter table public.health_score_history enable row level security;
alter table public.user_activity enable row level security;
alter table public.login_streaks enable row level security;
alter table public.savings_challenges enable row level security;
alter table public.user_rewards enable row level security;
alter table public.educational_content enable row level security;
alter table public.admin_users enable row level security;
alter table public.audit_logs enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.user_content_state enable row level security;

drop policy if exists "Users manage own consent records" on public.consent_records;
drop policy if exists "Users read own consent records" on public.consent_records;
create policy "Users read own consent records" on public.consent_records for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users manage own upcoming expenses" on public.upcoming_expenses;
create policy "Users manage own upcoming expenses" on public.upcoming_expenses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users manage own notifications" on public.notifications;
create policy "Users manage own notifications" on public.notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users update read status on own notifications" on public.notifications;
create policy "Users update read status on own notifications" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users read own agent actions" on public.agent_actions;
create policy "Users read own agent actions" on public.agent_actions for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users read own scores" on public.health_score_history;
create policy "Users read own scores" on public.health_score_history for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users read own activity" on public.user_activity;
create policy "Users read own activity" on public.user_activity for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users read own streak" on public.login_streaks;
create policy "Users read own streak" on public.login_streaks for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users read own challenges" on public.savings_challenges;
create policy "Users read own challenges" on public.savings_challenges for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users update own challenge choice" on public.savings_challenges;
create policy "Users update own challenge choice" on public.savings_challenges for update to authenticated using(user_id=auth.uid() and status='offered') with check(user_id=auth.uid() and status in ('accepted','declined'));
drop policy if exists "Users create own offered challenges" on public.savings_challenges;
create policy "Users create own offered challenges" on public.savings_challenges for insert to authenticated with check(user_id=auth.uid() and status='offered' and xp_awarded=0);
revoke update on table public.savings_challenges from authenticated;
grant update(status) on table public.savings_challenges to authenticated;
drop policy if exists "Users read own rewards" on public.user_rewards;
create policy "Users read own rewards" on public.user_rewards for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users read published educational content" on public.educational_content;
create policy "Users read published educational content" on public.educational_content for select to authenticated using(published or public.is_planwisely_admin());
drop policy if exists "Admins manage educational content" on public.educational_content;
create policy "Admins manage educational content" on public.educational_content for all to authenticated using(public.is_planwisely_admin()) with check(public.is_planwisely_admin());
drop policy if exists "Users read own content state" on public.user_content_state;
create policy "Users read own content state" on public.user_content_state for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users manage own content state" on public.user_content_state;
create policy "Users manage own content state" on public.user_content_state for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Admins read admin roster" on public.admin_users;
create policy "Admins read admin roster" on public.admin_users for select to authenticated using(public.is_planwisely_admin());
drop policy if exists "Admins read audit logs" on public.audit_logs;
create policy "Admins read audit logs" on public.audit_logs for select to authenticated using(public.is_planwisely_admin());
drop policy if exists "Admins read workflow runs" on public.workflow_runs;
create policy "Admins read workflow runs" on public.workflow_runs for select to authenticated using(public.is_planwisely_admin());

grant execute on function public.record_meaningful_activity(text) to authenticated;
grant execute on function public.refresh_my_health_score() to authenticated;
grant execute on function public.mark_upcoming_expense_paid(uuid,text) to authenticated;
grant execute on function public.is_planwisely_admin() to authenticated;
grant execute on function public.has_planwisely_admin_role() to authenticated;
grant execute on function public.log_admin_action(text,uuid,text,jsonb) to authenticated;
grant execute on function public.consume_wisey_request() to authenticated;
grant execute on function public.grant_my_wisey_consent() to authenticated;
grant execute on function public.withdraw_my_wisey_consent() to authenticated;

create index if not exists idx_transactions_user_date on public.transactions(user_id,transaction_date desc);
create index if not exists idx_upcoming_user_due on public.upcoming_expenses(user_id,due_date) where status='planned';
create index if not exists idx_notifications_user_created on public.notifications(user_id,created_at desc);
create index if not exists idx_activity_user_day on public.user_activity(user_id,activity_date desc);
create index if not exists idx_scores_user_week on public.health_score_history(user_id,week_start desc);
