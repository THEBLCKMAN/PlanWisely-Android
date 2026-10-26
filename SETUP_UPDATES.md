# PlanWisely update instructions

1. Back up your current project. Extract this ZIP and open `PlanWisely` in VS Code.
2. In Supabase SQL Editor run `supabase/migrations/20261026000000_opening_balance.sql` ONCE. It only adds an opening balance field to `profiles`. Do not rerun the original initial migration.
3. Create `.env.local` in the project root with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` copied from your existing local project. Do not place secret keys in frontend environment files.
4. Run `npm.cmd install` then `npm.cmd run dev`.
5. Log in; open Dashboard > Set your opening balance. Save a nonnegative value. Open Transactions > Add > Add Income or Add Expense. Submit a transaction and confirm it appears in Transactions and Supabase.
6. Profile > Edit info now enables editing; Cancel discards changes; Save persists them.

## Scope / limits
- The existing transaction form and Supabase insert logic were preserved. The top-right Add control now exposes both Income and Expense routes.
- Opening balance is stored per user and included in the tracked balance; monthly income and expense figures remain transaction-only.
- My Cards / multiple account balances and transfers are NOT implemented in this release. Existing Card payment method remains a label, not a live bank connection.
- No live Supabase test was performed. Build verification was blocked because dependencies could not be installed from the offline package cache. Test on your PC before deployment.
- ZIP excludes `.env.local` and `node_modules` intentionally.
