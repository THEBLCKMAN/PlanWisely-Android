# PlanWisely transaction update

- Transactions screen: removed search/date/category filters and the duplicate second pair of action links.
- Top-right + opens an Add Transaction dialog. Expense and Income buttons open the same dialog with their respective type selected.
- Dialog collects amount, category/source, optional description/note, and transaction date. The store persists positive amounts with `type` indicating expense or income.
- Uses the existing Supabase `addTransaction` and shared transaction state, so existing dashboard, budget, analytics and period calculations receive updated records. No new SQL migration required for this UI change.
- Save is guarded against duplicate submissions and errors are shown as toast messages.
- Existing standalone Add Income/Add Expense routes remain for backwards compatibility.

## Verify with your own Supabase project
1. Set `.env.local` from `.env.example`, run `npm.cmd install` then `npm.cmd run dev`.
2. Add an expense and income using the Transactions dialog; confirm entries and balances on dashboard, budgets, analytics, and health score.
3. Edit/delete a transaction from its detail screen and check totals again.
4. Health score is computed separately and may require its Supabase migration/RPC; check that the function exists and scores refresh.

Not tested against a live Supabase account. Do not rerun existing SQL migrations without checking which have been applied.
