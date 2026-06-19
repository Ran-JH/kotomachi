export interface StructureNote {
  pattern?: string;
  explanation?: string;
  examples?: string[];
}

export type RevisionNoteType =
  | "meaning"
  | "structure"
  | "wording"
  | "grammar"
  | "tone"
  | "counter"
  | "fluency";

export interface RevisionNote {
  originalPart?: string;
  revisedPart?: string;
  explanation: string;
  type: RevisionNoteType;
}

function normalizeOptionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeRevisionNoteType(value: unknown): RevisionNoteType | undefined {
  switch (value) {
    case "meaning":
    case "structure":
    case "wording":
    case "grammar":
    case "tone":
    case "counter":
    case "fluency":
      return value;
    default:
      return undefined;
  }
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

export function normalizeRevisionNotes(value: unknown): RevisionNote[] | undefined {
  try {
    if (!Array.isArray(value)) {
      return undefined;
    }

    // Keep this forgiving so old cache entries or partial model output do not break the drawer.
    const notes = value
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return undefined;
        }

        const raw = item as {
          explanation?: unknown;
          originalPart?: unknown;
          revisedPart?: unknown;
          type?: unknown;
        };

        const type = normalizeRevisionNoteType(raw.type);
        const explanation = normalizeOptionalText(raw.explanation);
        const originalPart = normalizeOptionalText(raw.originalPart);
        const revisedPart = normalizeOptionalText(raw.revisedPart);

        if (!type || !explanation) {
          return undefined;
        }

        return {
          type,
          explanation,
          ...(originalPart ? { originalPart } : {}),
          ...(revisedPart ? { revisedPart } : {}),
        } satisfies RevisionNote;
      })
      .filter((item): item is RevisionNote => Boolean(item))
      .slice(0, 5);

    return notes.length > 0 ? notes : undefined;
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
  /** 轻量修改说明：逐项对照原句片段和优化后的片段 */
  revisionNotes?: RevisionNote[];
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
