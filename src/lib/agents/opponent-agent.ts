// ============================================================
// 对手 AI Agent
// ============================================================

import { BaseAgent, AgentConfig } from './base-agent';
import { CaseDocument, CourtMessage, CourtPhase } from '@/types/court';
import { getOpponentSystemPrompt } from '@/lib/prompts';

export class OpponentAgent extends BaseAgent {
  private caseDescription: string;
  private caseType: 'civil' | 'criminal' | 'arbitration';
  private style: 'standard' | 'aggressive' | 'moderate';
  private caseDocuments: CaseDocument[];

  constructor(
    config: AgentConfig,
    sessionId: string,
    caseDescription: string,
    caseType: 'civil' | 'criminal' | 'arbitration',
    style: 'standard' | 'aggressive' | 'moderate',
    caseDocuments: CaseDocument[] = []
  ) {
    super(config, sessionId);
    this.caseDescription = caseDescription;
    this.caseType = caseType;
    this.style = style;
    this.caseDocuments = caseDocuments;
  }

  protected getSystemPrompt(): string {
    const role = this.config.assignedRole as 'plaintiff' | 'defendant';
    return getOpponentSystemPrompt(
      role,
      this.caseDescription,
      this.caseType,
      this.style,
      this.caseDocuments
    );
  }

  /** 处理消息 — 对手 AI 的核心逻辑 */
  async handleMessage(message: CourtMessage): Promise<CourtMessage | null> {
    if (this.isProcessing) return null;
    this.isProcessing = true;
    try {
      // 只处理非自己发出的消息
      if (message.role === this.config.assignedRole) {
        return null;
      }
      // 法官的纯引导语不需要回应
      if (message.role === 'judge' && (message.type === 'ruling' || message.type === 'system')) {
        return null;
      }

      // 记录到记忆
      this.memory.addMessage('user', `[${message.role}]: ${message.content}`);

      const roleLabel = this.config.assignedRole === 'plaintiff'
        ? (this.caseType === 'civil' ? '原告方' : '公诉方')
        : (this.caseType === 'civil' ? '被告方' : '辩护方');

      const response = await this.callLLM(
        `当前阶段：${message.phase}\n` +
        `${message.role === 'judge' ? '审判长' : (message.role === 'plaintiff' ? '原告方' : '被告方')}说："${message.content}"\n\n` +
        `作为${roleLabel}，请针对以上内容发表你的意见。` +
        `重要：你只能输出一段正式的法律语言，禁止包含任何推理过程、思考说明、括号注释或非正式语言。只输出你的辩论内容，不超过200字。`
      );

      // 清理推理内容，只保留最终输出
      const cleanedResponse = this.sanitizeLLMOutput(response);
      return this.createMessage(cleanedResponse, 'speech', message.phase);
    } finally {
      this.isProcessing = false;
    }
  }

  /** 被法官授权发言时的主动发言 */
  async takeInitiative(phase: CourtPhase, subPhaseName: string): Promise<CourtMessage> {
    const roleLabel = this.config.assignedRole === 'plaintiff'
      ? (this.caseType === 'civil' ? '原告方' : '公诉方')
      : (this.caseType === 'civil' ? '被告方' : '辩护方');

    const prompt = `现在是${phase}阶段的「${subPhaseName}」环节，轮到你发言了。\n` +
      `作为${roleLabel}，请根据案件情况和之前的庭审记录，发表你的意见。\n` +
        `重要：你只能输出一段正式的法律语言，禁止包含任何推理过程、思考说明、括号注释或非正式语言。只输出你的辩论内容，不超过200字。`

    const response = await this.callLLM(prompt);
    // 清理推理内容，只保留最终输出
    const cleanedResponse = this.sanitizeLLMOutput(response);
    return this.createMessage(cleanedResponse, 'speech', phase);
  }

  /** 生成发言（供 SessionManager 调用） */
  async generateSpeech(phase: CourtPhase, subPhaseName: string): Promise<CourtMessage> {
    return this.takeInitiative(phase, subPhaseName);
  }

  /** 更新策略记忆 */
  updateStrategy(notes: string): void {
    this.memory.updateStrategyNotes(notes);
  }
}
