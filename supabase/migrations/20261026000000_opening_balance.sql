-- Run this once in Supabase SQL Editor before using the Starting Balance screen.
-- Additive migration; preserves existing users and records.
alter table public.profiles
  add column if not exists opening_balance numeric(12,2) not null default 0
  check (opening_balance >= 0);
