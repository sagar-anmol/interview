export type PracticeTrack =
  | "system-design"
  | "product-management"
  | "dsa"
  | "behavioral"
  | "sql"
  | "investment-banking"
  | "machine-learning"
  | "frontend"
  | "data-science"
  | "devops";

export interface TrackMeta {
  id: PracticeTrack;
  title: string;
  shortTitle: string;
  description: string;
  durationSec: number;
  icon:
    | "layers"
    | "code"
    | "message"
    | "users"
    | "database"
    | "briefcase"
    | "sparkles"
    | "monitor"
    | "activity"
    | "cloud";
  isNew?: boolean;
}

export const TRACKS: TrackMeta[] = [
  {
    id: "product-management",
    title: "Product Management",
    shortTitle: "Product Management",
    description: "Practice product sense, estimation, and more.",
    durationSec: 20 * 60,
    icon: "layers",
  },
  {
    id: "dsa",
    title: "Data Structures & Algorithms",
    shortTitle: "DSA",
    description: "Practice coding questions.",
    durationSec: 20 * 60,
    icon: "code",
  },
  {
    id: "system-design",
    title: "System Design",
    shortTitle: "System Design",
    description: "Practice designing technical architectures.",
    durationSec: 20 * 60,
    icon: "database",
  },
  {
    id: "behavioral",
    title: "Behavioral",
    shortTitle: "Behavioral",
    description: "Practice questions about your work experiences.",
    durationSec: 10 * 60,
    icon: "users",
  },
  {
    id: "sql",
    title: "SQL",
    shortTitle: "SQL",
    description: "Practice writing and optimizing SQL queries.",
    durationSec: 20 * 60,
    icon: "database",
  },
  {
    id: "investment-banking",
    title: "Investment Banking",
    shortTitle: "IB",
    description: "Practice technical finance and IB interview questions.",
    durationSec: 20 * 60,
    icon: "briefcase",
    isNew: true,
  },
  {
    id: "machine-learning",
    title: "Machine Learning",
    shortTitle: "ML",
    description: "Model design, training trade-offs, evaluation and MLOps.",
    durationSec: 20 * 60,
    icon: "sparkles",
    isNew: true,
  },
  {
    id: "frontend",
    title: "Frontend Engineering",
    shortTitle: "Frontend",
    description: "UI architecture, rendering, performance and state management.",
    durationSec: 20 * 60,
    icon: "monitor",
    isNew: true,
  },
  {
    id: "data-science",
    title: "Data Science",
    shortTitle: "Data Science",
    description: "Experiment design, statistics, causal inference and product analytics.",
    durationSec: 20 * 60,
    icon: "activity",
  },
  {
    id: "devops",
    title: "DevOps & SRE",
    shortTitle: "DevOps",
    description: "CI/CD, observability, incident response and reliability.",
    durationSec: 20 * 60,
    icon: "cloud",
  },
];

export function getTrack(id: string | undefined): TrackMeta {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[2];
}

export type InterviewFormat = "conversation" | "record";

export const PM_FOCUS_AREAS = [
  {
    id: "surprise",
    title: "Pick a question for me",
    description: "Surprise me with a random PM question",
  },
  {
    id: "estimation",
    title: "Estimation",
    description: "Market sizing and quantitative estimation questions",
  },
  {
    id: "product-design",
    title: "Product Design",
    description: "Design new features, products, or user experiences",
  },
  {
    id: "strategy",
    title: "Strategy",
    description: "Competitive strategy, prioritisation, and trade-offs",
  },
  {
    id: "execution",
    title: "Execution",
    description: "Launch planning, metrics, and cross-functional delivery",
  },
];

export const TARGET_ROLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Staff Engineer",
  "Engineering Manager",
  "Product Manager",
  "Data Engineer",
  "Machine Learning Engineer",
];

export const VOICE_STAGE_QUESTIONS: Record<string, string> = {
  "product-management": "Design a smart shoe.",
  behavioral: "Tell me about a time you disagreed with a teammate.",
  sql: "Find the top 3 customers by total order value.",
  "investment-banking": "Walk me through how you would value this company.",
  "machine-learning": "Design a recommendation system for a large e-commerce catalog.",
  frontend: "Architect a high-traffic dashboard with realtime updates.",
  "data-science": "How would you measure whether a new feature improved retention?",
  devops: "Walk me through your approach to reducing deploy failures.",
};

export const VOICE_STAGE_QUESTION_BANK: Record<string, string[]> = {
  "product-management": [
    "Design a smart shoe.",
    "How would you improve onboarding for a food delivery app?",
    "Estimate the monthly active users of a language learning app.",
    "What metrics would you use to decide if a feature launch succeeded?",
  ],
  behavioral: [
    "Tell me about a time you disagreed with a teammate.",
    "Describe a project where you had to work with incomplete information.",
    "Tell me about a time you received difficult feedback.",
    "Walk me through a decision you made that did not go as planned.",
  ],
  sql: [
    "Find the top 3 customers by total order value.",
    "Write a query to find users with no activity in the last 30 days.",
    "How would you optimise a slow query over a large events table?",
    "Find the second-highest salary in each department.",
  ],
  "investment-banking": [
    "Walk me through how you would value this company.",
    "Explain the difference between DCF and comparable company analysis.",
    "How would a rise in interest rates affect a leveraged buyout?",
    "Walk me through a three-statement model.",
  ],
  "machine-learning": [
    "Design a recommendation system for a large e-commerce catalog.",
    "How would you detect and handle data drift in production?",
    "A model has high offline AUC but poor online conversion — diagnose it.",
    "Design an LLM-powered support assistant with evaluation and guardrails.",
  ],
  frontend: [
    "Architect a high-traffic dashboard with realtime updates.",
    "How would you improve the loading performance of a large React app?",
    "Design a design-system component API that scales across teams.",
    "Explain how you would debug a memory leak in a long-lived SPA.",
  ],
  "data-science": [
    "How would you measure whether a new feature improved retention?",
    "Design an A/B test for a pricing change with network effects.",
    "Explain Simpson's paradox with a product analytics example.",
    "How would you estimate the causal impact of a marketing campaign?",
  ],
  devops: [
    "Walk me through your approach to reducing deploy failures.",
    "Design an observability strategy for a distributed service.",
    "How would you handle a database failover during peak traffic?",
    "Design a CI/CD pipeline that supports safe canary releases.",
  ],
};
