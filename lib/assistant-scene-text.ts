/**
 * 清理模型回复进入主聊天前的文本。
 *
 * 圆括号、方括号和星号都可能承载正常语义，单凭包裹符号无法可靠判断
 * 其中是否为舞台动作。因此这里默认保留原文，只延续既有的首尾空白清理。
 * 若未来服务端提供明确的结构化动作标签，再针对该标签增加窄规则。
 */
export function sanitizeAssistantSceneText(text: string): string {
  return text.trim();
}
