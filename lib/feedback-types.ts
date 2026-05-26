/** 单个场合的地道表达 + 因果分析 */
export interface FeedbackLevel {
  /** 该场合下最纯正地道的日文 */
  nativeSay: string;
  /** 双层分析：场合为何这样说 + 用户原句为何不妥 */
  analysis: string;
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
