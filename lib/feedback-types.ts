export interface StructureNote {
  pattern?: string;
  explanation?: string;
  examples?: string[];
}

export function normalizeStructureNote(value: unknown): StructureNote | undefined {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    const raw = value as {
      pattern?: unknown;
      explanation?: unknown;
      examples?: unknown;
    };

    const pattern =
      typeof raw.pattern === "string" && raw.pattern.trim()
        ? raw.pattern.trim()
        : undefined;
    const explanation =
      typeof raw.explanation === "string" && raw.explanation.trim()
        ? raw.explanation.trim()
        : undefined;
    const examples = Array.isArray(raw.examples)
      ? raw.examples
          .filter((example): example is string => typeof example === "string")
          .map((example) => example.trim())
          .filter(Boolean)
          .slice(0, 2)
      : undefined;

    if (!pattern && !explanation && (!examples || examples.length === 0)) {
      return undefined;
    }

    return {
      ...(pattern ? { pattern } : {}),
      ...(explanation ? { explanation } : {}),
      ...(examples && examples.length > 0 ? { examples } : {}),
    };
  } catch {
    return undefined;
  }
}

/** 单个场合的地道表达 + 因果分析 */
export interface FeedbackLevel {
  /** 该场合下最自然的建议表达 */
  nativeSay: string;
  /** 双层分析：场合为何这么说 + 原句为何不够自然 */
  analysis: string;
  /** 可选的表达结构说明，用于提示可复用句型 */
  structureNote?: StructureNote;
}

/** /api/feedback 返回结构 */
export interface FeedbackResponse {
  casual: FeedbackLevel;
  business: FeedbackLevel;
  formal: FeedbackLevel;
}

/** 抽屉内三档场合的展示元数据 */
export const FEEDBACK_LEVEL_META = [
  {
    key: "casual" as const,
    title: "轻松闲聊",
    emoji: "☕",
    subtitle: "朋友、网友、放松聊天",
  },
  {
    key: "business" as const,
    title: "职场社交",
    emoji: "🏪",
    subtitle: "同事、店员、邻居、日常协作",
  },
  {
    key: "formal" as const,
    title: "正式交际",
    emoji: "🧔",
    subtitle: "面试、客户、上级、书面场合",
  },
] as const;

export type FeedbackLevelKey = (typeof FEEDBACK_LEVEL_META)[number]["key"];
