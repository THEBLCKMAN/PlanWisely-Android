export type TxType = "income" | "expense";

/** Category keys are user-scoped slugs; built-in categories use the familiar keys below. */
export type CategoryKey = string;

export type PaymentMethod = "Card" | "Cash" | "EFT" | "NSFAS Wallet";

export interface Transaction {
  id: string;
  title: string;
  note?: string;
  category: CategoryKey;
  type: TxType;
  /** Positive rand amount, direction given by `type`. */
  amount: number;
  /** ISO date string */
  date: string;
  method: PaymentMethod;
  incomeSource?: IncomeSource;
  isRecurring?: boolean;
  expectedNextPaymentDate?: string;
}

export type IncomeSource =
  "allowance" | "bursary_nsfas" | "part_time_work" | "family_support" | "other";

export interface UpcomingExpense {
  id: string;
  title: string;
  category: CategoryKey;
  amount: number;
  dueDate: string;
  essential: boolean;
  status: "planned" | "paid" | "cancelled";
  paidTransactionId?: string;
}

export interface AppNotification {
  id: string;
  category: string;
  title: string;
  body: string;
  rule?: string;
  details: Record<string, unknown>;
  actionPath?: string;
  readAt?: string;
  createdAt: string;
}

export interface HealthScoreSnapshot {
  id: string;
  weekStart: string;
  score: number;
  budgetAdherence: number;
  savingsProgress: number;
  spendingConsistency: number;
  appEngagement: number;
  explanation: Record<string, unknown>;
}

export interface SavingsChallenge {
  id: string;
  title: string;
  description: string;
  category: CategoryKey;
  baselineAmount: number;
  targetReductionPercent: number;
  startsOn: string;
  endsOn: string;
  status: "offered" | "accepted" | "declined" | "completed" | "expired";
  xpAwarded: number;
}

export interface CategoryMeta {
  key: CategoryKey;
  name: string;
  /** Monthly budget limit in rand */
  budget: number;
  accentClass: string;
  banner?: "food" | "transport" | "bursary" | "electricity";
  icon: string;
  essential?: boolean;
}

export type TipCategory = "saving" | "budgeting" | "investing";

export interface Tip {
  id: string;
  title: string;
  excerpt: string;
  body: string[];
  category: TipCategory;
  saved: boolean;
  completed: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  requirement: string;
  earned: boolean;
  icon: "target" | "piggy" | "handshake" | "trending";
}

export type SavingsGoalCategory =
  "emergency" | "travel" | "car" | "education" | "home" | "shopping" | "general";

export interface SavingsGoal {
  id: string;
  name: string;
  category: SavingsGoalCategory;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
}

export interface WiseyMessage {
  id: string;
  role: "user" | "wisey";
  text: string;
}

export interface Conversation {
  id: string;
  title: string;
  date: string;
  messages: WiseyMessage[];
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  university: string;
  studentNumber: string;
  year: string;
  nsfasRecipient: boolean;
  avatarPath?: string;
  avatarUrl?: string;
  birthDate?: string;
  guardianConsentAt?: string;
  wiseyAiConsentAt?: string;
  budgetPeriodStart?: string;
  nextPaymentDate?: string;
  incomePattern?: "recurring" | "irregular";
  spendingAlertsEnabled?: boolean;
  weeklySummaryEnabled?: boolean;
}

export interface MonthlyReport {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  topCategories: { name: string; amount: number; share: number }[];
}
