// ============================================================
// 法官 AI Agent
// ============================================================

import { BaseAgent, AgentConfig } from './base-agent';
import { CaseDocument, CaseType, CourtMessage, CourtPhase } from '@/types/court';
import { getJudgeSystemPrompt, getPhaseGuidancePrompt, getObjectionRulingPrompt, getVerdictPrompt } from '@/lib/prompts';

export class JudgeAgent extends BaseAgent {
  private caseDescription: string;
  private caseType: 'civil' | 'criminal' | 'arbitration';
  private caseDocuments: CaseDocument[];

  constructor(config: AgentConfig, sessionId: string, caseDescription: string, caseType: 'civil' | 'criminal' | 'arbitration', caseDocuments: CaseDocument[] = []) {
    super(config, sessionId);
    this.caseDescription = caseDescription;
    this.caseType = caseType;
    this.caseDocuments = caseDocuments;
  }

  protected getSystemPrompt(): string {
    return getJudgeSystemPrompt(this.caseDescription, this.caseType, this.caseDocuments);
  }

  /** 处理消息 — 法官的核心逻辑 */
  async handleMessage(message: CourtMessage): Promise<CourtMessage | null> {
    if (this.isProcessing) return null;
    this.isProcessing = true;
    try {
      // 记录到记忆
      this.memory.addMessage('user', `[${message.role}]: ${message.content}`);

      const response = await this.callLLM(
        `以下是一条来自${message.role}的消息："${message.content}"\n` +
        `当前庭审阶段：${message.phase}\n\n` +
        `作为法官，请根据情况做出回应。你可以：\n` +
        `1. 对发言做出评论或引导\n` +
        `2. 提出问题\n` +
        `3. 如果不需要回应，回复 [NO_RESPONSE]`
      );

      if (response.trim() === '[NO_RESPONSE]') {
        return null;
      }

      // 清理推理内容，只保留最终输出
      const cleanedResponse = this.sanitizeLLMOutput(response);
      return this.createMessage(cleanedResponse, 'speech', message.phase);
    } finally {
      this.isProcessing = false;
    }
  }

  /** 生成阶段引导语 */
  async generatePhaseGuidance(phase: CourtPhase, phaseName: string, subPhaseName: string, nextSpeaker: string): Promise<CourtMessage> {
    const prompt = getPhaseGuidancePrompt(phase, phaseName, subPhaseName, nextSpeaker);
    const response = await this.callLLM(prompt);
    return this.createMessage(response, 'speech', phase);
  }

  /** 生成开庭公告 */
  async generateOpeningAnnouncement(): Promise<CourtMessage> {
    // 仲裁案件此前被误标为「刑事」，导致开庭公告与仲裁程序不符
    const caseTypeLabel =
      this.caseType === 'civil' ? '民事' : this.caseType === 'criminal' ? '刑事' : '仲裁';
    const response = await this.callLLM(
      `现在开庭。请作为审判长，宣布本次${caseTypeLabel}案件正式开庭，` +
      `简要介绍案件基本情况，并宣布进入开庭准备阶段。语气庄重正式。\n` +
      `重要：只输出法官的发言内容，不要包含任何方括号指令（如[TURN]、[PHASE_ADVANCE]等）。`
    );
    return this.createMessage(response, 'speech', 'PREPARATION');
  }

  /** 生成子阶段引导语（法官在非法官发言前的简短引导） */
  async generateSubPhaseGuidance(phase: CourtPhase, subPhaseName: string, nextSpeaker: string): Promise<CourtMessage> {
    const response = await this.callLLM(
      `以审判长身份说一句简短的话，引导${nextSpeaker}进行${subPhaseName}。\n` +
      `格式要求：只输出一行，正式法律语言，直接输出内容。\n` +
      `禁止：推理、说明、注释、多行输出。不要出现"现在请"、"需要"等词语开头。`
    );
    // 清理输出：去除思考过程和元文本
    const cleaned = response
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/（[\s\S]*?）/g, ' ')
      .replace(/\(.*?\)/g, ' ')
      // 只保留第一行（去除多行输出）
      .split('\n')[0]
      // 去除"审判长："前缀
      .replace(/^(审判长[：:：]\s*)+/, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
    return this.createMessage(cleaned || response, 'speech', phase);
  }

  /** 处理异议 */
  async handleObjection(message: CourtMessage): Promise<CourtMessage> {
    const prompt = getObjectionRulingPrompt(message.role, message.content);
    const response = await this.callLLM(prompt);
    return this.createMessage(response, 'ruling', message.phase);
  }

  /** 裁决异议（从 SessionManager 调用） */
  async ruleOnObjection(objectionContent: string, objectorLabel: string, phase: CourtPhase = 'PREPARATION'): Promise<CourtMessage> {
    const response = await this.callLLM(
      `${objectorLabel}提出异议：${objectionContent}\n\n` +
      `作为法官，请裁决此异议。首先明确说明"异议成立"或"异议驳回"，然后简述理由。\n` +
      `重要：只输出法官的发言内容，不要包含任何方括号指令。`
    );
    return this.createMessage(response, 'ruling', phase);
  }

  /** 决定是否批准发言申请 */
  async decideSpeakRequest(requestContent: string, requesterLabel: string, phase: CourtPhase = 'PREPARATION'): Promise<CourtMessage> {
    const response = await this.callLLM(
      `${requesterLabel}申请发言：${requestContent}\n\n` +
      `作为法官，请决定是否批准。如果批准，说"准许发言"；如果不批准，说明原因。\n` +
      `重要：只输出法官的发言内容，不要包含任何方括号指令。`
    );
    // 如果回复包含"准许"则标记为 ruling（表示批准）
    const type = response.includes('准许') ? 'ruling' : 'speech';
    return this.createMessage(response, type, phase);
  }

  /** 生成判决书 */
  async generateVerdict(caseType?: CaseType): Promise<CourtMessage> {
    const factSummary = this.memory.getCaseFactSummary() || this.caseDescription;
    const prompt = getVerdictPrompt(factSummary, caseType ?? (this.caseType as CaseType));
    const response = await this.callLLM(prompt, { temperature: 0.3, maxTokens: 4000 });
    return this.createMessage(response, 'verdict', 'VERDICT');
  }

  /** 更新案件记忆 */
  updateCaseMemory(summary: string): void {
    this.memory.updateCaseFactSummary(summary);
  }
}
