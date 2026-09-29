// ============================================================
// 记忆存储 — Agent 的三层记忆管理
// ============================================================

import { MessageForLLM, MemoryConfig, CourtPhase } from '@/types/court';

export class MemoryStore {
  private conversationHistory: MessageForLLM[] = [];
  private caseFactSummary: string = '';
  private strategyNotes: string = '';
  private currentObjective: string = '';
  private config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  // ========== Layer 1: 工作记忆 ==========

  /** 添加一条消息到工作记忆 */
  addMessage(role: 'system' | 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({ role, content });
    // 检查是否需要压缩
    if (this.conversationHistory.length > this.config.maxConversationTurns) {
      this.compressWorkingMemory();
    }
  }

  /** 压缩工作记忆 — 保留最近60%的完整记录，最早的压缩为摘要 */
  private compressWorkingMemory(): void {
    const history = this.conversationHistory;
    const keepCount = Math.floor(this.config.maxConversationTurns * 0.6);
    const toCompress = history.slice(0, history.length - keepCount);
    const toKeep = history.slice(history.length - keepCount);

    // 将待压缩部分简化为一条 system 消息
    const compressedContent = toCompress
      .map(m => `[${m.role}]: ${m.content.slice(0, 100)}...`)
      .join('\n');

    toKeep.unshift({
      role: 'system',
      content: `[之前对话摘要]\n${compressedContent}`,
    });

    this.conversationHistory = toKeep;
  }

  /** 获取发送给 LLM 的完整上下文 */
  buildLLMContext(systemPrompt: string): MessageForLLM[] {
    const messages: MessageForLLM[] = [
      { role: 'system', content: systemPrompt },
    ];

    // 注入案件记忆
    if (this.caseFactSummary) {
      messages.push({
        role: 'system',
        content: `【案件事实记忆】\n${this.caseFactSummary}`,
      });
    }

    // 注入策略记忆（仅对手 AI）
    if (this.config.enableStrategyMemory && this.strategyNotes) {
      messages.push({
        role: 'system',
        content: `【策略笔记（仅你可见）】\n${this.strategyNotes}`,
      });
    }

    // 注入工作记忆（对话历史）
    messages.push(...this.conversationHistory);

    return messages;
  }

  // ========== Layer 2: 案件记忆 ==========

  /** 更新案件事实摘要 */
  updateCaseFactSummary(summary: string): void {
    this.caseFactSummary = summary;
  }

  getCaseFactSummary(): string {
    return this.caseFactSummary;
  }

  // ========== Layer 3: 策略记忆 ==========

  /** 更新策略笔记（仅对手 AI） */
  updateStrategyNotes(notes: string): void {
    this.strategyNotes = notes;
  }

  getStrategyNotes(): string {
    return this.strategyNotes;
  }

  /** 设置当前目标 */
  setCurrentObjective(objective: string): void {
    this.currentObjective = objective;
  }

  getCurrentObjective(): string {
    return this.currentObjective;
  }

  // ========== 持久化 ==========

  serialize(): string {
    return JSON.stringify({
      conversationHistory: this.conversationHistory,
      caseFactSummary: this.caseFactSummary,
      strategyNotes: this.strategyNotes,
      currentObjective: this.currentObjective,
    });
  }

  static deserialize(json: string, config: MemoryConfig): MemoryStore {
    const data = JSON.parse(json);
    const store = new MemoryStore(config);
    store.conversationHistory = data.conversationHistory ?? [];
    store.caseFactSummary = data.caseFactSummary ?? '';
    store.strategyNotes = data.strategyNotes ?? '';
    store.currentObjective = data.currentObjective ?? '';
    return store;
  }
}
