import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BADGES, CATEGORIES, TIPS } from "@/data/mock";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type {
  Badge,
  CategoryKey,
  CategoryMeta,
  Conversation,
  SavingsGoal,
  Transaction,
  Tip,
  UserProfile,
  WiseyMessage,
  UpcomingExpense,
  AppNotification,
  HealthScoreSnapshot,
  SavingsChallenge,
  IncomeSource,
} from "@/data/types";
import { getBudgetPeriod } from "@/lib/budget-period";
import { calculateFinancialTotals } from "@/lib/financial-totals";

interface MonthTotals {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
}
interface AppContextValue {
  user: UserProfile;
  userId: string;
  loading: boolean;
  isAdmin: boolean;
  transactions: Transaction[];
  tips: Tip[];
  badges: Badge[];
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversation: (id: string) => void;
  startConversation: () => string;
  askWisey: (conversationId: string, text: string) => Promise<void>;
  receiveWiseyMessage: (conversationId: string, text: string) => void;
  openingBalance: number;
  setOpeningBalance: (amount: number) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "savedAmount">) => Promise<void>;
  updateSavingsGoal: (goal: SavingsGoal) => Promise<void>;
  addSavingsContribution: (id: string, amount: number) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  updateCategoryBudget: (category: CategoryKey, amount: number, month: string) => Promise<void>;
  createBudgetCategory: (name: string, amount: number, month: string) => Promise<void>;
  deleteBudgetCategory: (category: CategoryKey) => Promise<void>;
  getCategoryBudget: (category: CategoryKey, month: string) => number;
  toggleTipSaved: (id: string) => Promise<void>;
  markTipCompleted: (id: string) => Promise<void>;
  updateUser: (patch: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  sendSupportMessage: (message: string) => Promise<void>;
  categories: CategoryMeta[];
  spentByCategory: (month: string) => Record<string, number>;
  totalsForMonth: (month: string) => MonthTotals;
  totalsForPeriod: (start: string, end: string) => MonthTotals;
  topCategoryForMonth: (month: string) => { name: string; amount: number } | undefined;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  upcomingExpenses: UpcomingExpense[];
  addUpcomingExpense: (
    expense: Omit<UpcomingExpense, "id" | "status" | "paidTransactionId">,
  ) => Promise<void>;
  updateUpcomingExpense: (expense: UpcomingExpense) => Promise<void>;
  deleteUpcomingExpense: (id: string) => Promise<void>;
  markUpcomingExpensePaid: (id: string, method?: Transaction["method"]) => Promise<void>;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  healthScoreHistory: HealthScoreSnapshot[];
  currentStreak: number;
  challenges: SavingsChallenge[];
  decideChallenge: (id: string, accept: boolean) => Promise<void>;
  setBudgetSchedule: (
    start: string,
    next: string,
    pattern: "recurring" | "irregular",
  ) => Promise<void>;
  setWiseyConsent: (enabled: boolean) => Promise<void>;
  xpTotal: number;
  reloadData: () => Promise<void>;
}
const AppContext = createContext<AppContextValue | null>(null);
const budgetKey = (month: string, category: CategoryKey) => `${month.slice(0, 7)}|${category}`;
const todayISO = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value["year"]}-${value["month"]}-${value["day"]}`;
};
type ProfileRow = {
  opening_balance?: number | string | null;
  full_name?: string | null;
  phone?: string | null;
  university?: string | null;
  student_number?: string | null;
  study_year?: string | null;
  nsfas_recipient?: boolean | null;
  avatar_path?: string | null;
  birth_date?: string | null;
  guardian_consent_at?: string | null;
  wisey_ai_consent_at?: string | null;
  budget_period_start?: string | null;
  next_payment_date?: string | null;
  income_pattern?: "recurring" | "irregular" | null;
  spending_alerts_enabled?: boolean | null;
  weekly_summary_enabled?: boolean | null;
};
type TransactionRow = {
  id: string;
  title: string;
  note: string | null;
  category: CategoryKey;
  type: "income" | "expense";
  amount: number | string;
  transaction_date: string;
  method: Transaction["method"];
  income_source?: IncomeSource | null;
  is_recurring?: boolean | null;
  expected_next_payment_date?: string | null;
};
type GoalRow = {
  id: string;
  name: string;
  category: SavingsGoal["category"];
  target_amount: number | string;
  saved_amount: number | string;
  target_date: string | null;
};
type BudgetRow = { category: CategoryKey; monthly_limit: number | string; month_start: string };
type FinanceCategoryRow = {
  category_key: CategoryKey;
  name: string;
  icon: string;
  accent_class: string;
  essential: boolean;
  is_active: boolean;
};
type ChatRow = { id: string; title: string; created_at: string };
type UpcomingRow = {
  id: string;
  title: string;
  category: CategoryKey;
  amount: number | string;
  due_date: string;
  essential: boolean;
  status: UpcomingExpense["status"];
  paid_transaction_id: string | null;
};
type NotificationRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  rule: string | null;
  details: Record<string, unknown>;
  action_path: string | null;
  read_at: string | null;
  created_at: string;
};
type ScoreRow = {
  id: string;
  week_start: string;
  score: number;
  budget_adherence: number;
  savings_progress: number;
  spending_consistency: number;
  app_engagement: number;
  explanation: Record<string, unknown>;
};
type StreakRow = { current_streak: number };
type ChallengeRow = {
  id: string;
  title: string;
  description: string;
  category: CategoryKey;
  baseline_amount: number | string;
  target_reduction_percent: number | string;
  starts_on: string;
  ends_on: string;
  status: SavingsChallenge["status"];
  xp_awarded: number;
};
type EducationalContentRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  kind: "tip" | "guide";
};
type UserContentStateRow = { content_id: string; saved: boolean; completed_at: string | null };
const fromProfile = (row: ProfileRow | null, auth: User): UserProfile => ({
  name: row?.full_name || auth.user_metadata?.["full_name"] || "",
  email: auth.email || "",
  phone: row?.phone || "",
  university: row?.university || "",
  studentNumber: row?.student_number || "",
  year: row?.study_year || "",
  nsfasRecipient: Boolean(row?.nsfas_recipient),
  avatarPath: row?.avatar_path || undefined,
  avatarUrl: undefined,
  birthDate: row?.birth_date || undefined,
  guardianConsentAt: row?.guardian_consent_at || undefined,
  wiseyAiConsentAt: row?.wisey_ai_consent_at || undefined,
  budgetPeriodStart: row?.budget_period_start || undefined,
  nextPaymentDate: row?.next_payment_date || undefined,
  incomePattern: row?.income_pattern || "irregular",
  spendingAlertsEnabled: row?.spending_alerts_enabled ?? true,
  weeklySummaryEnabled: row?.weekly_summary_enabled ?? true,
});

export function AppProvider({ children, authUser }: { children: ReactNode; authUser: User }) {
  const userId = authUser.id;
  const [user, setUser] = useState<UserProfile>(() => fromProfile(null, authUser));
  const [openingBalance, setOpeningBalanceState] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tips, setTips] = useState<Tip[]>(
    TIPS.map((tip) => ({ ...tip, saved: false, completed: false })),
  );
  const [tipsLoaded, setTipsLoaded] = useState(false);
  const [managedTipIds, setManagedTipIds] = useState<string[]>([]);
  const [badges] = useState<Badge[]>(BADGES.map((b) => ({ ...b, earned: false })));
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [categories, setCategories] = useState<CategoryMeta[]>(CATEGORIES);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [upcomingExpenses, setUpcomingExpenses] = useState<UpcomingExpense[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [healthScoreHistory, setHealthScoreHistory] = useState<HealthScoreSnapshot[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [challenges, setChallenges] = useState<SavingsChallenge[]>([]);
  const [xpTotal, setXpTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const conversationCreates = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(`planwisely.tips.v1.${userId}`) || "{}",
      ) as Record<string, { saved?: boolean; completed?: boolean }>;
      setTips(
        TIPS.map((tip) => ({
          ...tip,
          saved: Boolean(saved[tip.id]?.saved),
          completed: Boolean(saved[tip.id]?.completed),
        })),
      );
    } catch {
      setTips(TIPS.map((tip) => ({ ...tip, saved: false, completed: false })));
    }
    setTipsLoaded(true);
  }, [userId]);
  useEffect(() => {
    if (!tipsLoaded) return;
    localStorage.setItem(
      `planwisely.tips.v1.${userId}`,
      JSON.stringify(
        Object.fromEntries(
          tips.map((tip) => [tip.id, { saved: tip.saved, completed: tip.completed }]),
        ),
      ),
    );
  }, [tips, tipsLoaded, userId]);

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    const [
      profileRes,
      txRes,
      goalsRes,
      budgetRes,
      categoriesRes,
      chatsRes,
      messagesRes,
      upcomingRes,
      notificationsRes,
      scoresRes,
      streakRes,
      challengesRes,
      adminRes,
      rewardsRes,
      contentRes,
      contentStateRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("transactions")
        .select(
          "id,title,note,category,type,amount,transaction_date,method,income_source,is_recurring,expected_next_payment_date",
        )
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false }),
      supabase
        .from("savings_goals")
        .select("id,name,category,target_amount,saved_amount,target_date")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("budgets").select("category,monthly_limit,month_start").eq("user_id", userId),
      supabase
        .from("finance_categories")
        .select("category_key,name,icon,accent_class,essential,is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("chat_sessions")
        .select("id,title,created_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("chat_messages")
        .select("id,session_id,role,content,created_at")
        .eq("user_id", userId)
        .order("created_at"),
      supabase
        .from("upcoming_expenses")
        .select("id,title,category,amount,due_date,essential,status,paid_transaction_id")
        .eq("user_id", userId)
        .order("due_date"),
      supabase
        .from("notifications")
        .select("id,category,title,body,rule,details,action_path,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("health_score_history")
        .select(
          "id,week_start,score,budget_adherence,savings_progress,spending_consistency,app_engagement,explanation",
        )
        .eq("user_id", userId)
        .order("week_start", { ascending: false })
        .limit(26),
      supabase.from("login_streaks").select("current_streak").eq("user_id", userId).maybeSingle(),
      supabase
        .from("savings_challenges")
        .select(
          "id,title,description,category,baseline_amount,target_reduction_percent,starts_on,ends_on,status,xp_awarded",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.rpc("has_planwisely_admin_role"),
      supabase.from("user_rewards").select("xp_total").eq("user_id", userId).maybeSingle(),
      supabase
        .from("educational_content")
        .select("id,title,body,category,kind")
        .eq("published", true),
      supabase
        .from("user_content_state")
        .select("content_id,saved,completed_at")
        .eq("user_id", userId),
    ]);
    const error =
      profileRes.error ||
      txRes.error ||
      goalsRes.error ||
      budgetRes.error ||
      categoriesRes.error ||
      chatsRes.error ||
      messagesRes.error;
    const additionalError =
      upcomingRes.error ||
      notificationsRes.error ||
      scoresRes.error ||
      streakRes.error ||
      challengesRes.error ||
      adminRes.error ||
      rewardsRes.error ||
      contentRes.error ||
      contentStateRes.error;
    if (error || additionalError) throw error || additionalError;
    const profile = profileRes.data as ProfileRow | null;
    const transactionRows = (txRes.data ?? []) as TransactionRow[];
    const goalRows = (goalsRes.data ?? []) as GoalRow[];
    const budgetRows = (budgetRes.data ?? []) as BudgetRow[];
    const categoryRows = (categoriesRes.data ?? []) as FinanceCategoryRow[];
    const chatRows = (chatsRes.data ?? []) as ChatRow[];
    const avatarPath = profile?.avatar_path;
    let avatarUrl: string | undefined;
    if (avatarPath) {
      const { data } = await supabase.storage.from("avatars").createSignedUrl(avatarPath, 3600);
      avatarUrl = data?.signedUrl;
    }
    setUser({ ...fromProfile(profile, authUser), avatarUrl });
    setOpeningBalanceState(Number(profile?.opening_balance ?? 0));
    setTransactions(
      transactionRows.map((r) => ({
        id: r.id,
        title: r.title,
        note: r.note ?? undefined,
        category: r.category,
        type: r.type,
        amount: Number(r.amount),
        date: r.transaction_date,
        method: r.method,
        incomeSource: r.income_source ?? undefined,
        isRecurring: Boolean(r.is_recurring),
        expectedNextPaymentDate: r.expected_next_payment_date ?? undefined,
      })),
    );
    setSavingsGoals(
      goalRows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        targetAmount: Number(r.target_amount),
        savedAmount: Number(r.saved_amount),
        targetDate: r.target_date ?? undefined,
      })),
    );
    setCategories(
      categoryRows.length
        ? categoryRows.map((row) => {
            const fallback = CATEGORIES.find((category) => category.key === row.category_key);
            return {
              key: row.category_key,
              name: row.name,
              budget: 0,
              icon: row.icon,
              accentClass: row.accent_class,
              essential: row.essential,
              banner: fallback?.banner,
            };
          })
        : CATEGORIES,
    );
    setBudgets(
      Object.fromEntries(
        budgetRows.map((row) => [
          budgetKey(row.month_start, row.category),
          Number(row.monthly_limit),
        ]),
      ),
    );
    const messagesBySession = new Map<string, WiseyMessage[]>();
    for (const msg of messagesRes.data ?? []) {
      const current = messagesBySession.get(msg.session_id) ?? [];
      current.push({
        id: msg.id,
        role: msg.role === "assistant" ? "wisey" : "user",
        text: msg.content,
      });
      messagesBySession.set(msg.session_id, current);
    }
    const chats = chatRows.map((r) => ({
      id: r.id,
      title: r.title,
      date: String(r.created_at).slice(0, 10),
      messages: messagesBySession.get(r.id) ?? [],
    }));
    setConversations(chats);
    setUpcomingExpenses(
      ((upcomingRes.data ?? []) as UpcomingRow[]).map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        amount: Number(r.amount),
        dueDate: r.due_date,
        essential: r.essential,
        status: r.status,
        paidTransactionId: r.paid_transaction_id ?? undefined,
      })),
    );
    setNotifications(
      ((notificationsRes.data ?? []) as NotificationRow[]).map((r) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        body: r.body,
        rule: r.rule ?? undefined,
        details: r.details ?? {},
        actionPath: r.action_path ?? undefined,
        readAt: r.read_at ?? undefined,
        createdAt: r.created_at,
      })),
    );
    setHealthScoreHistory(
      ((scoresRes.data ?? []) as ScoreRow[]).map((r) => ({
        id: r.id,
        weekStart: r.week_start,
        score: r.score,
        budgetAdherence: r.budget_adherence,
        savingsProgress: r.savings_progress,
        spendingConsistency: r.spending_consistency,
        appEngagement: r.app_engagement,
        explanation: r.explanation ?? {},
      })),
    );
    setCurrentStreak(Number((streakRes.data as StreakRow | null)?.current_streak ?? 0));
    setIsAdmin(Boolean(adminRes.data));
    setXpTotal(Number((rewardsRes.data as { xp_total: number } | null)?.xp_total || 0));
    setChallenges(
      ((challengesRes.data ?? []) as ChallengeRow[]).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        baselineAmount: Number(r.baseline_amount),
        targetReductionPercent: Number(r.target_reduction_percent),
        startsOn: r.starts_on,
        endsOn: r.ends_on,
        status: r.status,
        xpAwarded: r.xp_awarded,
      })),
    );
    const savedContentState = new Map(
      ((contentStateRes.data ?? []) as UserContentStateRow[]).map((row) => [row.content_id, row]),
    );
    const managedContents = (contentRes.data ?? []) as EducationalContentRow[];
    setManagedTipIds(managedContents.map((row) => row.id));
    const managedTips: Tip[] = managedContents.map((row) => {
      const state = savedContentState.get(row.id);
      const category: Tip["category"] =
        row.category === "saving"
          ? "saving"
          : row.category === "investing"
            ? "investing"
            : "budgeting";
      const paragraphs = row.body
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean);
      return {
        id: row.id,
        title: row.title,
        excerpt: paragraphs[0]?.slice(0, 180) ?? "",
        body: paragraphs,
        category,
        saved: Boolean(state?.saved),
        completed: Boolean(state?.completed_at),
      };
    });
    setTips((old) => [
      ...old.filter((tip) => !managedContents.some((row) => row.id === tip.id)),
      ...managedTips,
    ]);
    setActiveConversationId((current) =>
      current && chats.some((c) => c.id === current) ? current : (chats[0]?.id ?? null),
    );
  }, [authUser, userId]);
  const recordMeaningfulActivity = useCallback(
    async (type: "transaction" | "goal_contribution" | "budget_update" | "meaningful_login") => {
      const { data, error } = await getSupabase().rpc("record_meaningful_activity", {
        p_type: type,
      });
      if (!error && data && typeof data === "object" && "current_streak" in data)
        setCurrentStreak(Number((data as { current_streak: number }).current_streak));
    },
    [],
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    reload()
      .catch((e) => {
        if (active) console.error("PlanWisely data load failed", e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  const setOpeningBalance = useCallback(
    async (amount: number) => {
      if (!Number.isFinite(amount) || amount < 0)
        throw new Error("Enter a valid non-negative balance.");
      const { error } = await getSupabase()
        .from("profiles")
        .update({ opening_balance: amount, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
      setOpeningBalanceState(amount);
    },
    [userId],
  );

  const addTransaction = useCallback(
    async (tx: Omit<Transaction, "id">) => {
      if (!tx.title.trim() || !Number.isFinite(tx.amount) || tx.amount <= 0 || !tx.date)
        throw new Error("Enter a description, a valid amount, and a transaction date.");
      const { data, error } = await getSupabase()
        .from("transactions")
        .insert({
          user_id: userId,
          title: tx.title,
          note: tx.note ?? null,
          category: tx.category,
          type: tx.type,
          amount: tx.amount,
          transaction_date: tx.date,
          method: tx.method,
          income_source: tx.incomeSource ?? null,
          is_recurring: tx.isRecurring ?? false,
          expected_next_payment_date: tx.expectedNextPaymentDate ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      setTransactions((old) => [{ ...tx, id: data.id }, ...old]);
      if (tx.type === "income" && tx.expectedNextPaymentDate) {
        const { error: scheduleError } = await getSupabase()
          .from("profiles")
          .update({
            budget_period_start: tx.date,
            next_payment_date: tx.expectedNextPaymentDate,
            income_pattern: tx.isRecurring ? "recurring" : "irregular",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        if (!scheduleError)
          setUser((old) => ({
            ...old,
            budgetPeriodStart: tx.date,
            nextPaymentDate: tx.expectedNextPaymentDate,
            incomePattern: tx.isRecurring ? "recurring" : "irregular",
          }));
      }
      await recordMeaningfulActivity("transaction");
      await getSupabase().rpc("refresh_my_health_score");
    },
    [userId, recordMeaningfulActivity],
  );
  const updateTransaction = useCallback(
    async (tx: Transaction) => {
      if (!tx.title.trim() || !Number.isFinite(tx.amount) || tx.amount <= 0 || !tx.date)
        throw new Error("Enter a description, a valid amount, and a transaction date.");
      const { error } = await getSupabase()
        .from("transactions")
        .update({
          title: tx.title,
          note: tx.note ?? null,
          category: tx.category,
          type: tx.type,
          amount: tx.amount,
          transaction_date: tx.date,
          method: tx.method,
          income_source: tx.incomeSource ?? null,
          is_recurring: tx.isRecurring ?? false,
          expected_next_payment_date: tx.expectedNextPaymentDate ?? null,
        })
        .eq("id", tx.id)
        .eq("user_id", userId);
      if (error) throw error;
      setTransactions((old) => old.map((item) => (item.id === tx.id ? tx : item)));
      if (tx.type === "income" && tx.expectedNextPaymentDate) {
        const { error: scheduleError } = await getSupabase()
          .from("profiles")
          .update({
            budget_period_start: tx.date,
            next_payment_date: tx.expectedNextPaymentDate,
            income_pattern: tx.isRecurring ? "recurring" : "irregular",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        if (!scheduleError)
          setUser((old) => ({
            ...old,
            budgetPeriodStart: tx.date,
            nextPaymentDate: tx.expectedNextPaymentDate,
            incomePattern: tx.isRecurring ? "recurring" : "irregular",
          }));
      }
      await recordMeaningfulActivity("transaction");
      await getSupabase().rpc("refresh_my_health_score");
    },
    [userId, recordMeaningfulActivity],
  );
  const deleteTransaction = useCallback(
    async (id: string) => {
      const { error } = await getSupabase()
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      setTransactions((old) => old.filter((item) => item.id !== id));
      await getSupabase().rpc("refresh_my_health_score");
    },
    [userId],
  );
  const addSavingsGoal = useCallback(
    async (goal: Omit<SavingsGoal, "id" | "savedAmount">) => {
      const { data, error } = await getSupabase()
        .from("savings_goals")
        .insert({
          user_id: userId,
          name: goal.name,
          category: goal.category,
          target_amount: goal.targetAmount,
          target_date: goal.targetDate ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      setSavingsGoals((old) => [{ ...goal, id: data.id, savedAmount: 0 }, ...old]);
      await getSupabase().rpc("refresh_my_health_score");
    },
    [userId],
  );
  const updateSavingsGoal = useCallback(async (goal: SavingsGoal) => {
    const { error } = await getSupabase()
      .from("savings_goals")
      .update({
        name: goal.name,
        category: goal.category,
        target_amount: goal.targetAmount,
        target_date: goal.targetDate ?? null,
        saved_amount: goal.savedAmount,
      })
      .eq("id", goal.id);
    if (error) throw error;
    setSavingsGoals((old) => old.map((x) => (x.id === goal.id ? goal : x)));
    await getSupabase().rpc("refresh_my_health_score");
  }, []);
  const addSavingsContribution = useCallback(
    async (id: string, amount: number) => {
      const { data, error } = await getSupabase().rpc("add_goal_contribution", {
        p_goal_id: id,
        p_amount: amount,
      });
      if (error) throw error;
      setSavingsGoals((old) =>
        old.map((g) => (g.id === id ? { ...g, savedAmount: Number(data) } : g)),
      );
      await recordMeaningfulActivity("goal_contribution");
      await getSupabase().rpc("refresh_my_health_score");
    },
    [recordMeaningfulActivity],
  );
  const deleteSavingsGoal = useCallback(async (id: string) => {
    const { error } = await getSupabase().from("savings_goals").delete().eq("id", id);
    if (error) throw error;
    setSavingsGoals((old) => old.filter((g) => g.id !== id));
    await getSupabase().rpc("refresh_my_health_score");
  }, []);
  const updateCategoryBudget = useCallback(
    async (category: CategoryKey, amount: number, month: string) => {
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter a valid budget amount.");
      const monthStart = `${month.slice(0, 7)}-01`;
      const { error } = await getSupabase()
        .from("budgets")
        .upsert(
          { user_id: userId, category, month_start: monthStart, monthly_limit: amount },
          { onConflict: "user_id,category,month_start" },
        );
      if (error) throw error;
      setBudgets((old) => ({ ...old, [budgetKey(month, category)]: amount }));
      await recordMeaningfulActivity("budget_update");
      await getSupabase().rpc("refresh_my_health_score");
    },
    [userId, recordMeaningfulActivity],
  );
  const createBudgetCategory = useCallback(
    async (name: string, amount: number, month: string) => {
      const cleanName = name.trim().replace(/\s+/g, " ");
      if (!cleanName || cleanName.length > 60)
        throw new Error("Enter a category name (up to 60 characters).");
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter a valid monthly amount.");
      const key = cleanName
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
      if (!key) throw new Error("Use letters or numbers in the category name.");
      const { data, error } = await getSupabase()
        .from("finance_categories")
        .upsert(
          {
            user_id: userId,
            category_key: key,
            name: cleanName,
            icon: CATEGORIES.find((item) => item.key === key)?.icon ?? "package",
            accent_class:
              CATEGORIES.find((item) => item.key === key)?.accentClass ?? "bg-muted-foreground",
            essential: CATEGORIES.find((item) => item.key === key)?.essential ?? false,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,category_key" },
        )
        .select("category_key,name,icon,accent_class,essential,is_active")
        .single();
      if (error) throw error;
      const fallback = CATEGORIES.find((item) => item.key === data.category_key);
      const category: CategoryMeta = {
        key: data.category_key,
        name: data.name,
        icon: data.icon,
        accentClass: data.accent_class,
        essential: data.essential,
        banner: fallback?.banner,
        budget: amount,
      };
      setCategories((old) => [...old.filter((item) => item.key !== category.key), category]);
      await updateCategoryBudget(category.key, amount, month);
    },
    [userId, updateCategoryBudget],
  );
  const deleteBudgetCategory = useCallback(
    async (category: CategoryKey) => {
      const { error } = await getSupabase()
        .from("finance_categories")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("category_key", category);
      if (error) throw error;
      setCategories((old) => old.filter((item) => item.key !== category));
    },
    [userId],
  );
  const getCategoryBudget = useCallback(
    (category: CategoryKey, month: string) => budgets[budgetKey(month, category)] ?? 0,
    [budgets],
  );
  const updateUser = useCallback(
    async (patch: Partial<UserProfile>) => {
      const updates = {
        full_name: patch.name,
        phone: patch.phone,
        university: patch.university,
        student_number: patch.studentNumber,
        study_year: patch.year,
        nsfas_recipient: patch.nsfasRecipient,
        spending_alerts_enabled: patch.spendingAlertsEnabled,
        weekly_summary_enabled: patch.weeklySummaryEnabled,
        birth_date: patch.birthDate,
        guardian_consent_at: patch.guardianConsentAt,
        updated_at: new Date().toISOString(),
      };
      const { error } = await getSupabase()
        .from("profiles")
        .upsert({
          id: userId,
          ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)),
        });
      if (error) throw error;
      setUser((old) => ({ ...old, ...patch }));
    },
    [userId],
  );
  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)
        throw new Error("Choose an image under 5 MB.");
      const supabase = getSupabase();
      const path = `${userId}/avatar-${Date.now()}.${file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: userId, avatar_path: path });
      if (profileError) throw profileError;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      setUser((old) => ({ ...old, avatarPath: path, avatarUrl: data?.signedUrl }));
    },
    [userId],
  );
  const sendSupportMessage = useCallback(
    async (message: string) => {
      const { error } = await getSupabase()
        .from("support_requests")
        .insert({ user_id: userId, message: message.trim() });
      if (error) throw error;
    },
    [userId],
  );
  const addUpcomingExpense = useCallback(
    async (expense: Omit<UpcomingExpense, "id" | "status" | "paidTransactionId">) => {
      if (!expense.title.trim() || !Number.isFinite(expense.amount) || expense.amount <= 0)
        throw new Error("Enter a title and amount above R0.");
      const { data, error } = await getSupabase()
        .from("upcoming_expenses")
        .insert({
          user_id: userId,
          title: expense.title.trim(),
          category: expense.category,
          amount: expense.amount,
          due_date: expense.dueDate,
          essential: expense.essential,
        })
        .select()
        .single();
      if (error) throw error;
      setUpcomingExpenses((old) =>
        [...old, { id: data.id, ...expense, status: "planned" as const }].sort((a, b) =>
          a.dueDate.localeCompare(b.dueDate),
        ),
      );
    },
    [userId],
  );
  const updateUpcomingExpense = useCallback(
    async (expense: UpcomingExpense) => {
      const { error } = await getSupabase()
        .from("upcoming_expenses")
        .update({
          title: expense.title.trim(),
          category: expense.category,
          amount: expense.amount,
          due_date: expense.dueDate,
          essential: expense.essential,
          updated_at: new Date().toISOString(),
        })
        .eq("id", expense.id)
        .eq("user_id", userId)
        .eq("status", "planned");
      if (error) throw error;
      setUpcomingExpenses((old) => old.map((x) => (x.id === expense.id ? expense : x)));
    },
    [userId],
  );
  const deleteUpcomingExpense = useCallback(
    async (id: string) => {
      const { error } = await getSupabase()
        .from("upcoming_expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .eq("status", "planned");
      if (error) throw error;
      setUpcomingExpenses((old) => old.filter((x) => x.id !== id));
    },
    [userId],
  );
  const markUpcomingExpensePaid = useCallback(
    async (id: string, method: Transaction["method"] = "Card") => {
      const { data, error } = await getSupabase().rpc("mark_upcoming_expense_paid", {
        p_expense_id: id,
        p_method: method,
      });
      if (error) throw error;
      const row = upcomingExpenses.find((x) => x.id === id);
      setUpcomingExpenses((old) =>
        old.map((x) =>
          x.id === id ? { ...x, status: "paid", paidTransactionId: String(data) } : x,
        ),
      );
      if (row)
        setTransactions((old) =>
          old.some((tx) => tx.id === String(data))
            ? old
            : [
                {
                  id: String(data),
                  title: row.title,
                  note: "Paid planned expense",
                  category: row.category,
                  type: "expense",
                  amount: row.amount,
                  date: row.dueDate,
                  method,
                },
                ...old,
              ],
        );
      await recordMeaningfulActivity("transaction");
      await getSupabase().rpc("refresh_my_health_score");
    },
    [upcomingExpenses, recordMeaningfulActivity],
  );
  const markNotificationRead = useCallback(
    async (id: string) => {
      const stamp = new Date().toISOString();
      const { error } = await getSupabase()
        .from("notifications")
        .update({ read_at: stamp })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      setNotifications((old) => old.map((n) => (n.id === id ? { ...n, readAt: stamp } : n)));
    },
    [userId],
  );
  const markAllNotificationsRead = useCallback(async () => {
    const stamp = new Date().toISOString();
    const { error } = await getSupabase()
      .from("notifications")
      .update({ read_at: stamp })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw error;
    setNotifications((old) => old.map((n) => (n.readAt ? n : { ...n, readAt: stamp })));
  }, [userId]);
  const decideChallenge = useCallback(
    async (id: string, accept: boolean) => {
      const { error } = await getSupabase()
        .from("savings_challenges")
        .update({ status: accept ? "accepted" : "declined" })
        .eq("id", id)
        .eq("user_id", userId)
        .eq("status", "offered");
      if (error) throw error;
      setChallenges((old) =>
        old.map((c) => (c.id === id ? { ...c, status: accept ? "accepted" : "declined" } : c)),
      );
    },
    [userId],
  );
  const setBudgetSchedule = useCallback(
    async (start: string, next: string, pattern: "recurring" | "irregular") => {
      if (!start || !next || next < start)
        throw new Error("Choose a next payment date after the start date.");
      const { error } = await getSupabase()
        .from("profiles")
        .update({
          budget_period_start: start,
          next_payment_date: next,
          income_pattern: pattern,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) throw error;
      setUser((old) => ({
        ...old,
        budgetPeriodStart: start,
        nextPaymentDate: next,
        incomePattern: pattern,
      }));
      await recordMeaningfulActivity("budget_update");
      await getSupabase().rpc("refresh_my_health_score");
    },
    [userId, recordMeaningfulActivity],
  );
  const setWiseyConsent = useCallback(async (enabled: boolean) => {
    const { data, error } = await getSupabase().rpc(
      enabled ? "grant_my_wisey_consent" : "withdraw_my_wisey_consent",
    );
    if (error) throw error;
    setUser((old) => ({ ...old, wiseyAiConsentAt: enabled ? String(data) : undefined }));
  }, []);
  const startConversation = useCallback(() => {
    const id = crypto.randomUUID();
    const create = Promise.resolve(
      getSupabase()
        .from("chat_sessions")
        .insert({ id, user_id: userId, title: "New conversation" })
        .then(({ error }) => {
          if (error) throw error;
        }),
    );
    conversationCreates.current.set(id, create);
    setConversations((old) => [
      { id, title: "New conversation", date: todayISO(), messages: [] },
      ...old,
    ]);
    setActiveConversationId(id);
    return id;
  }, [userId]);
  const setActiveConversation = useCallback((id: string) => setActiveConversationId(id), []);
  const askWisey = useCallback(
    async (conversationId: string, text: string) => {
      const supabase = getSupabase();
      await conversationCreates.current.get(conversationId);
      const session = conversations.find((c) => c.id === conversationId);
      const title = session?.messages.length ? session.title : text.slice(0, 40);
      const { error: sessionError } = await supabase
        .from("chat_sessions")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      if (sessionError) throw sessionError;
      const { error: msgError } = await supabase
        .from("chat_messages")
        .insert({ user_id: userId, session_id: conversationId, role: "user", content: text });
      if (msgError) throw msgError;
      setConversations((old) =>
        old.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                title,
                messages: [...c.messages, { id: crypto.randomUUID(), role: "user", text }],
              }
            : c,
        ),
      );
      const { data, error } = await supabase.functions.invoke("wisey-chat", {
        body: { message: text, session_id: conversationId },
      });
      if (error) throw error;
      const reply = String(data?.reply ?? "I couldn't get a response right now. Please try again.");
      const { error: saveError } = await supabase
        .from("chat_messages")
        .insert({ user_id: userId, session_id: conversationId, role: "assistant", content: reply });
      if (saveError) throw saveError;
      setConversations((old) =>
        old.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, { id: crypto.randomUUID(), role: "wisey", text: reply }],
              }
            : c,
        ),
      );
    },
    [conversations, userId],
  );
  const receiveWiseyMessage = useCallback(
    (conversationId: string, text: string) =>
      setConversations((old) =>
        old.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, { id: crypto.randomUUID(), role: "wisey", text }] }
            : c,
        ),
      ),
    [],
  );
  const toggleTipSaved = useCallback(
    async (id: string) => {
      const current = tips.find((tip) => tip.id === id);
      if (!current) return;
      const nextSaved = !current.saved;
      setTips((old) => old.map((tip) => (tip.id === id ? { ...tip, saved: nextSaved } : tip)));
      if (managedTipIds.includes(id)) {
        const { error } = await getSupabase()
          .from("user_content_state")
          .upsert(
            {
              user_id: userId,
              content_id: id,
              saved: nextSaved,
              completed_at: current.completed ? new Date().toISOString() : null,
            },
            { onConflict: "user_id,content_id" },
          );
        if (error) {
          setTips((old) =>
            old.map((tip) => (tip.id === id ? { ...tip, saved: current.saved } : tip)),
          );
          throw error;
        }
      }
    },
    [tips, managedTipIds, userId],
  );
  const markTipCompleted = useCallback(
    async (id: string) => {
      const current = tips.find((tip) => tip.id === id);
      if (!current) return;
      setTips((old) => old.map((tip) => (tip.id === id ? { ...tip, completed: true } : tip)));
      if (managedTipIds.includes(id)) {
        const { error } = await getSupabase().from("user_content_state").upsert(
          {
            user_id: userId,
            content_id: id,
            saved: current.saved,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,content_id" },
        );
        if (error) {
          setTips((old) =>
            old.map((tip) => (tip.id === id ? { ...tip, completed: current.completed } : tip)),
          );
          throw error;
        }
      }
    },
    [tips, managedTipIds, userId],
  );
  const spentByCategory = useCallback(
    (month: string) =>
      transactions
        .filter((t) => t.type === "expense" && t.date.startsWith(month))
        .reduce(
          (acc, t) => ({ ...acc, [t.category]: (acc[t.category] ?? 0) + t.amount }),
          {} as Record<string, number>,
        ),
    [transactions],
  );
  const totalsForMonth = useCallback(
    (month: string): MonthTotals =>
      calculateFinancialTotals(transactions, openingBalance, `${month}-01`, `${month}-31`),
    [transactions, openingBalance],
  );
  const totalsForPeriod = useCallback(
    (start: string, end: string): MonthTotals =>
      calculateFinancialTotals(transactions, openingBalance, start, end),
    [transactions, openingBalance],
  );
  const topCategoryForMonth = useCallback(
    (month: string) => {
      const spent = spentByCategory(month);
      const entry = Object.entries(spent).sort((a, b) => b[1] - a[1])[0];
      if (!entry) return undefined;
      return {
        name: categories.find((c) => c.key === entry[0])?.name ?? entry[0],
        amount: entry[1],
      };
    },
    [categories, spentByCategory],
  );
  const value = useMemo<AppContextValue>(
    () => ({
      user,
      userId,
      loading,
      isAdmin,
      transactions,
      tips,
      badges,
      conversations,
      activeConversationId,
      setActiveConversation,
      startConversation,
      askWisey,
      receiveWiseyMessage,
      openingBalance,
      setOpeningBalance,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      savingsGoals,
      addSavingsGoal,
      updateSavingsGoal,
      addSavingsContribution,
      deleteSavingsGoal,
      updateCategoryBudget,
      createBudgetCategory,
      deleteBudgetCategory,
      getCategoryBudget,
      toggleTipSaved,
      markTipCompleted,
      updateUser,
      uploadAvatar,
      sendSupportMessage,
      categories: categories.map((c) => ({
        ...c,
        budget: getCategoryBudget(c.key, todayISO().slice(0, 7)),
      })),
      spentByCategory,
      totalsForMonth,
      totalsForPeriod,
      topCategoryForMonth,
      menuOpen,
      setMenuOpen,
      upcomingExpenses,
      addUpcomingExpense,
      updateUpcomingExpense,
      deleteUpcomingExpense,
      markUpcomingExpensePaid,
      notifications,
      markNotificationRead,
      markAllNotificationsRead,
      healthScoreHistory,
      currentStreak,
      challenges,
      decideChallenge,
      setBudgetSchedule,
      xpTotal,
      reloadData: reload,
      setWiseyConsent,
    }),
    [
      user,
      userId,
      loading,
      isAdmin,
      transactions,
      tips,
      badges,
      conversations,
      activeConversationId,
      setActiveConversation,
      startConversation,
      askWisey,
      receiveWiseyMessage,
      openingBalance,
      setOpeningBalance,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      savingsGoals,
      addSavingsGoal,
      updateSavingsGoal,
      addSavingsContribution,
      deleteSavingsGoal,
      updateCategoryBudget,
      createBudgetCategory,
      deleteBudgetCategory,
      getCategoryBudget,
      toggleTipSaved,
      markTipCompleted,
      updateUser,
      uploadAvatar,
      sendSupportMessage,
      categories,
      spentByCategory,
      totalsForMonth,
      totalsForPeriod,
      topCategoryForMonth,
      menuOpen,
      upcomingExpenses,
      addUpcomingExpense,
      updateUpcomingExpense,
      deleteUpcomingExpense,
      markUpcomingExpensePaid,
      notifications,
      markNotificationRead,
      markAllNotificationsRead,
      healthScoreHistory,
      currentStreak,
      challenges,
      decideChallenge,
      setBudgetSchedule,
      xpTotal,
      reload,
      setWiseyConsent,
    ],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
