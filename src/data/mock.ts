import type { Badge, CategoryKey, CategoryMeta, Tip } from "./types";

/** Current local date, used as the default date on new records. */
export const APP_TODAY = (() => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value["year"]}-${value["month"]}-${value["day"]}`;
})();

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "food",
    name: "Food",
    budget: 0,
    accentClass: "bg-crimson",
    banner: "food",
    icon: "utensils",
    essential: true,
  },
  {
    key: "transport",
    name: "Transport",
    budget: 0,
    accentClass: "bg-navy",
    banner: "transport",
    icon: "bus",
    essential: true,
  },
  {
    key: "rent",
    name: "Rent",
    budget: 0,
    accentClass: "bg-navy",
    icon: "house",
    essential: true,
  },
  {
    key: "bursary",
    name: "Bursary",
    budget: 0,
    accentClass: "bg-bursary",
    banner: "bursary",
    icon: "graduation",
  },
  {
    key: "electricity",
    name: "Electricity",
    budget: 0,
    accentClass: "bg-navy",
    banner: "electricity",
    icon: "zap",
    essential: true,
  },
  {
    key: "airtime",
    name: "Airtime & Data",
    budget: 0,
    accentClass: "bg-primary",
    icon: "smartphone",
    essential: true,
  },
  {
    key: "entertainment",
    name: "Entertainment",
    budget: 0,
    accentClass: "bg-success",
    icon: "clapper",
    essential: false,
  },
  { key: "other", name: "Other", budget: 0, accentClass: "bg-muted-foreground", icon: "package" },
];

export const TIPS: Tip[] = [
  {
    id: "tip1",
    title: "Tips of the Day",
    category: "saving",
    excerpt: "Small daily savings can lead to huge financial freedom tomorrow.",
    body: [
      "Saving R10 a day sounds tiny, but it adds up to R300 a month and R3,650 a year. That is a textbook, a data bundle top-up, or the start of an emergency fund.",
      "Try the jar method: every evening, move whatever loose change is in your pocket or wallet into a savings pocket in your banking app. Small, daily, automatic.",
    ],
    saved: true,
    completed: false,
  },
  {
    id: "tip2",
    title: "Saving Tip",
    category: "saving",
    excerpt: "Build your emergency fund until it feels calm and financially secure.",
    body: [
      "An emergency fund is money set aside for real surprises: a phone that breaks before exams, a trip home, or a medical bill.",
      "Aim for one month of your essential costs first. If your essentials are about R2,500 a month, save towards R2,500 in a separate savings pocket you do not touch.",
    ],
    saved: false,
    completed: false,
  },
  {
    id: "tip3",
    title: "Budgeting Tip",
    category: "budgeting",
    excerpt: "Track your spending so you know where your money actually goes.",
    body: [
      "Most students underestimate how much small swipes cost. A R35 taxi here, a R60 snack there — that is R300+ a week on things you barely remember.",
      "Log every expense for one full week in PlanWisely. At the end of the week, check your Spending Breakdown. Most students find one surprise category to cut immediately.",
    ],
    saved: true,
    completed: true,
  },
  {
    id: "tip4",
    title: "How to Start Investing",
    category: "investing",
    excerpt: "Start small, stay consistent, and trust the magic of compounding.",
    body: [
      "Investing is not only for rich people. In South Africa you can start with as little as R100 per month on easy platforms using ETFs (exchange traded funds).",
      "The key is time: money invested consistently grows exponentially. R500 a month for 10 years is roughly R84,000 invested — and can grow to well over R100,000 with average market growth.",
      "Never invest money you may need this month, and avoid anything promising guaranteed quick profits.",
    ],
    saved: false,
    completed: false,
  },
  {
    id: "tip5",
    title: "The 50/30/20 Rule",
    category: "budgeting",
    excerpt: "A simple split that works with a student allowance.",
    body: [
      "Split every allowance the day it lands: 50% to needs (food, transport, electricity, data), 30% to wants (takeout, outings), 20% to savings and goals.",
      "With a R10,000 NSFAS allowance that is R5,000 for needs, R3,000 for wants and R2,000 to savings — but even a 70/20/10 split builds the habit.",
    ],
    saved: false,
    completed: false,
  },
  {
    id: "tip6",
    title: "Cooking on a Budget",
    category: "saving",
    excerpt: "Beat the takeout trap with two hours of meal prep a week.",
    body: [
      "Takeout is the #1 budget killer for students — R80 here and R120 there quietly becomes R800+ a month.",
      "Cook one big meal on Sunday (pap, rice, pasta, stew) and portion it for the week. You will cut takeout spending by more than half without feeling deprived.",
    ],
    saved: false,
    completed: true,
  },
  {
    id: "tip7",
    title: "Understanding Compound Interest",
    category: "investing",
    excerpt: "The interest that earns interest — and why starting early wins.",
    body: [
      "Compound interest means the growth on your money also starts growing. Year one, your R1,000 earns interest. Year two, the original R1,000 AND last year's interest both earn.",
      "Over decades this snowballs. Starting at 20 instead of 30 can double your final outcome — even with the exact same monthly amount.",
    ],
    saved: false,
    completed: false,
  },
  {
    id: "tip8",
    title: "Stretch Your NSFAS Further",
    category: "budgeting",
    excerpt: "Four practical moves for the last week of the month.",
    body: [
      "Week-of-month-end survival kit: cook what is left in your cupboard before shopping again, use student discounts on campus, walk or share lifts for short trips, and buy data in bigger bundles (per-MB it is far cheaper than daily top-ups).",
      "If you genuinely run out, PlanWisely's budget view shows exactly which category drained fastest so next month's plan fixes the real problem.",
    ],
    saved: false,
    completed: false,
  },
];

export const BADGES: Badge[] = [
  {
    id: "b1",
    name: "First Budget",
    description: "Create your first budget",
    requirement: "Create a budget",
    earned: true,
    icon: "target",
  },
  {
    id: "b2",
    name: "Saver",
    description: "Save money for 30 days straight",
    requirement: "30-day savings streak",
    earned: true,
    icon: "piggy",
  },
  {
    id: "b3",
    name: "Deal Settler",
    description: "Settle your first monthly goal",
    requirement: "Complete a monthly goal",
    earned: true,
    icon: "handshake",
  },
  {
    id: "b4",
    name: "Investor",
    description: "Complete all investing lessons",
    requirement: "Finish investing module",
    earned: false,
    icon: "trending",
  },
];

export const SUGGESTED_PROMPTS = [
  { icon: "wallet", text: "What should I do with my last R200?" },
  { icon: "calendar", text: "Help me create a monthly budget" },
  { icon: "trending", text: "Should I start investing?" },
  { icon: "lightbulb", text: "Explain investing in simple terms" },
];
