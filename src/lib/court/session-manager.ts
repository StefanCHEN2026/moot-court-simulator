// ============================================================
// SessionManager — 庭审会话管理器
// 核心职责：协调 Agent、推进状态机、路由消息、管理 SSE
// ============================================================

import { CourtStateMachine } from './state-machine';
import { JudgeAgent } from '@/lib/agents/judge-agent';
import { OpponentAgent } from '@/lib/agents/opponent-agent';
import { AgentConfig } from '@/lib/agents/base-agent';
import {
  CaseDocument,
  CaseType,
  CourtMessage,
  CourtPhase,
  ImageEvidence,
  RoleId,
  SessionState,
  UserAction,
  UserActionType,
} from '@/types/court';

// ========== 全局会话存储（使用 globalThis 避免 HMR 丢失） ==========
interface CourtGlobal {
  __courtSessions?: Map<string, SessionManager>;
  __courtSSESubscribers?: Map<string, Set<(event: Record<string, unknown>) => void>>;
  __courtRecentEvents?: Map<string, Record<string, unknown>[]>;
}
const _g = globalThis as CourtGlobal;
if (!_g.__courtSessions) _g.__courtSessions = new Map();
if (!_g.__courtSSESubscribers) _g.__courtSSESubscribers = new Map();
if (!_g.__courtRecentEvents) _g.__courtRecentEvents = new Map<string, Record<string, unknown>[]>();
const sessions = _g.__courtSessions!;
const sseSubscribers = _g.__courtSSESubscribers!;

function storeRecentEvent(sessionId: string, event: Record<string, unknown>) {
  if (!_g.__courtRecentEvents) _g.__courtRecentEvents = new Map();
  const events = _g.__courtRecentEvents;
  if (!events.has(sessionId)) events.set(sessionId, []);
  const arr = events.get(sessionId)!;
  arr.push(event);
  if (arr.length > 10) arr.shift();
}

function emitSSE(sessionId: string, event: Record<string, unknown>): void {
  storeRecentEvent(sessionId, event);
  const subscribers = sseSubscribers.get(sessionId);
  if (subscribers) {
    for (const callback of subscribers) {
      try {
        callback(event);
      } catch {
        // subscriber 已关闭，忽略
      }
    }
  }
}

// SSE 订阅管理
type SSECallback = (event: Record<string, unknown>) => void;

export function subscribeSSE(
  sessionId: string,
  callback: SSECallback
): () => void {
  if (!sseSubscribers.has(sessionId)) {
    sseSubscribers.set(sessionId, new Set());
  }
  sseSubscribers.get(sessionId)!.add(callback);
  return () => {
    const subs = sseSubscribers.get(sessionId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) sseSubscribers.delete(sessionId);
    }
  };
}

export function getSession(id: string): SessionManager | undefined {
  return sessions.get(id);
}

/** 删除会话 */
export function removeSession(id: string): boolean {
  const session = sessions.get(id);
  if (session) {
    session.dispose();
    sessions.delete(id);
    return true;
  }
  return false;
}

export function getAllSessions(): Array<{
  sessionId: string;
  caseName: string;
  caseType: CaseType;
  currentPhase: CourtPhase;
  status: string;
  messageCount: number;
  createdAt: number;
}> {
  return Array.from(sessions.entries()).map(([id, s]) => ({
    sessionId: id,
    caseName: s.caseName,
    caseType: s.caseType,
    currentPhase: s.getCurrentPhase(),
    status: s.status,
    messageCount: s.messages.length,
    createdAt: s.createdAt,
  }));
}

export class SessionManager {
  sessionId: string;
  caseType: CaseType;
  caseName: string;
  caseDescription: string;
  userRole: RoleId;
  opponentStyle: string;
  /** 用户上传的案件文档 */
  caseDocuments: CaseDocument[] = [];
  imageEvidence: ImageEvidence[] = [];
  status: 'active' | 'paused' | 'completed' = 'active';
  createdAt: number = Date.now();

  stateMachine: CourtStateMachine;
  judgeAgent: JudgeAgent;
  opponentAgent: OpponentAgent;

  messages: CourtMessage[] = [];
  messageCounter = 0;
  currentSpeaker: RoleId;
  allowedActions: string[] = ['speak', 'request_speak'];
  isProcessing = false;

  constructor(
    sessionId: string,
    caseType: CaseType,
    caseName: string,
    caseDescription: string,
    userRole: RoleId,
    opponentStyle: string = 'standard',
    caseDocuments: CaseDocument[] = []
  ) {
    this.sessionId = sessionId;
    this.caseType = caseType;
    this.caseName = caseName;
    this.caseDescription = caseDescription;
    this.userRole = userRole;
    this.opponentStyle = opponentStyle;
    this.caseDocuments = caseDocuments;

    // 计算对手角色（支持仲裁）
    let opponentRole: RoleId;
    if (caseType === 'arbitration') {
      opponentRole = userRole === 'claimant' ? 'respondent' : 'claimant';
    } else {
      opponentRole = userRole === 'plaintiff' ? 'defendant' : 'plaintiff';
    }
    
    this.stateMachine = new CourtStateMachine(caseType);

    // 仲裁案件使用 arbitrator 角色
    const judgeRole = caseType === 'arbitration' ? 'arbitrator' : 'judge';
    
    const judgeConfig: AgentConfig = {
      role: judgeRole,
      assignedRole: judgeRole,
      memoryConfig: {
        maxConversationTurns: 40,
        maxSummaryTokens: 500,
        enableCaseMemory: true,
        enableStrategyMemory: false,
      },
      temperature: 0.7,
      maxTokens: 800,
    };
    this.judgeAgent = new JudgeAgent(judgeConfig, sessionId, caseDescription, caseType, caseDocuments);

    const opponentConfig: AgentConfig = {
      role: 'opponent',
      assignedRole: opponentRole,
      memoryConfig: {
        maxConversationTurns: 30,
        maxSummaryTokens: 400,
        enableCaseMemory: true,
        enableStrategyMemory: true,
      },
      temperature: 0.8,
      maxTokens: 600,
    };
    this.opponentAgent = new OpponentAgent(
      opponentConfig, sessionId, caseDescription, caseType, (opponentStyle as 'standard' | 'aggressive' | 'moderate'), caseDocuments
    );

    this.currentSpeaker = this.stateMachine.getCurrentSpeaker();
    this.allowedActions = ['speak', 'request_speak'];
    sessions.set(sessionId, this);
  }

  /** 启动庭审 — 法官宣读开庭公告，然后推进到第一个需要发言的非法官角色 */
  async startTrial(): Promise<void> {
    console.log(`[SessionManager] startTrial 开始, sessionId=${this.sessionId}`);

    try {
      // 1. 法官生成完整的开庭公告（一次性生成）
      const openingMsg = await this.judgeAgent.generateOpeningAnnouncement();
      if (openingMsg.content) {
        this.addMessage(openingMsg);
        emitSSE(this.sessionId, {
          type: 'agent_message',
          payload: openingMsg,
          timestamp: Date.now(),
        });
      }

      console.log(`[SessionManager] 开场公告已发送, 推进状态机...`);

      // 2. 快速推进状态机，跳过准备阶段的法官回合（因为开场公告已涵盖）
      // 直到找到一个需要用户或对手发言的回合
      await this.advanceToFirstSpeaker();
    } catch (err) {
      console.error(`[SessionManager] startTrial 失败:`, err);
      // 发送错误消息到前端
      const errorMsg: CourtMessage = {
        id: crypto.randomUUID(),
        sessionId: this.sessionId,
        role: 'judge',
        phase: this.getCurrentPhase(),
        content: '（系统提示：法官AI启动失败，请重新开始庭审）',
        type: 'system',
        timestamp: Date.now(),
        sequenceNumber: ++this.messageCounter,
      };
      this.addMessage(errorMsg);
      emitSSE(this.sessionId, { type: 'agent_message', payload: errorMsg, timestamp: Date.now() });
    }
  }

  /** 快速推进到第一个需要非法官发言的位置 */
  private async advanceToFirstSpeaker(): Promise<void> {
    let maxSteps = 20;
    let lastPhase = this.stateMachine.getCurrentPhase();
    let lastSubPhase = this.stateMachine.getCurrentSubPhase().id;

    while (maxSteps-- > 0) {
      // 推进状态机到下一个发言者
      const result = this.stateMachine.advanceSpeaker();
      this.currentSpeaker = result.speaker;

      // 如果是新子阶段，法官生成该子阶段的引导语
      if (result.subPhase !== lastSubPhase) {
        // 法官生成新子阶段引导语
        const guidance = await this.judgeAgent.generateSubPhaseGuidance(
          result.phase,
          result.subPhaseName,
          result.speaker
        );
        if (guidance.content) {
          this.addMessage(guidance);
          emitSSE(this.sessionId, { type: 'agent_message', payload: guidance, timestamp: Date.now() });
        }
        lastSubPhase = result.subPhase;
        lastPhase = result.phase;
      }

      // 如果是新阶段，发送阶段变更事件
      if (result.phase !== lastPhase) {
        emitSSE(this.sessionId, {
          type: 'phase_change',
          payload: {
            phase: result.phase,
            phaseName: this.stateMachine.getCurrentPhaseName(),
            subPhase: result.subPhase,
            subPhaseName: result.subPhaseName,
            phaseProgress: this.stateMachine.getPhaseProgress(),
          },
          timestamp: Date.now(),
        });

        // 终态处理：进入宣判阶段即生成判决并结束
        if (result.isTerminal || this.isAwardPhase(result.phase)) {
          await this.finishWithVerdict();
          return;
        }
        lastPhase = result.phase;
      }

      // 找到非法庭发言者
      if (!this.isJudgeRole(result.speaker)) {
        this.allowedActions = this.calculateAllowedActions(result.speaker);
        emitSSE(this.sessionId, {
          type: 'speaking_turn',
          payload: {
            speaker: result.speaker,
            speakerLabel: this.getRoleLabel(result.speaker),
            allowedActions: this.allowedActions,
            phase: result.phase,
            subPhase: result.subPhase,
            subPhaseName: result.subPhaseName,
            isUserTurn: result.speaker === this.userRole,
            phaseProgress: this.stateMachine.getPhaseProgress(),
          },
          timestamp: Date.now(),
        });

        // 如果是对手 AI，自动触发发言
        if (result.speaker !== this.userRole) {
          await this.triggerOpponentSpeech(result.phase, result.subPhaseName);
        }
        return;
      }
    }
  }

  /** 处理用户操作 */
  async handleUserAction(action: UserAction): Promise<{
    success: boolean;
    reason?: string;
    messageId?: string;
  }> {
    if (this.status !== 'active') {
      return { success: false, reason: '庭审未在进行中' };
    }
    if (this.isProcessing) {
      return { success: false, reason: '系统正在处理中，请稍候' };
    }

    const currentPhase = this.getCurrentPhase();
    const currentSubPhase = this.stateMachine.getCurrentSubPhase();

    switch (action.type) {
      case 'speak': {
        // 检查发言权
        if (this.currentSpeaker !== this.userRole) {
          return { success: false, reason: `当前发言权在${this.getRoleLabel(this.currentSpeaker)}，请等待` };
        }
        if (!this.allowedActions.includes('speak')) {
          return { success: false, reason: '当前阶段不允许发言' };
        }

        this.isProcessing = true;
        try {
          // 添加用户消息
          const userMsg: CourtMessage = {
            id: crypto.randomUUID(),
            sessionId: this.sessionId,
            role: this.userRole,
            phase: currentPhase,
            subPhase: currentSubPhase.id,
            content: action.content,
            type: 'speech',
            timestamp: Date.now(),
            sequenceNumber: ++this.messageCounter,
          };
          this.addMessage(userMsg);
          emitSSE(this.sessionId, { type: 'agent_message', payload: userMsg, timestamp: Date.now() });

          // 记录到 Agent 记忆
          const speakerNote = `[${this.getRoleLabel(this.userRole)}] ${action.content}`;
          this.judgeAgent.addMemoryMessage('user', speakerNote, currentPhase);
          this.opponentAgent.addMemoryMessage('user', speakerNote, currentPhase);

          // 推进到下一个发言者
          await this.advanceAndNotify();
          return { success: true, messageId: userMsg.id };
        } catch (err) {
          console.error(`[SessionManager] speak处理出错:`, err);
          return { success: false, reason: `系统处理出错，请重试` };
        } finally {
          this.isProcessing = false;
        }
      }

      case 'object': {
        // 异议 — 任何角色随时可提
        const objectionMsg: CourtMessage = {
          id: crypto.randomUUID(),
          sessionId: this.sessionId,
          role: this.userRole,
          phase: currentPhase,
          content: action.content,
          type: 'objection',
          timestamp: Date.now(),
          sequenceNumber: ++this.messageCounter,
        };
        this.addMessage(objectionMsg);
        emitSSE(this.sessionId, { type: 'agent_message', payload: objectionMsg, timestamp: Date.now() });

        // 法官裁决异议
        this.isProcessing = true;
        try {
          const ruling = await this.judgeAgent.ruleOnObjection(action.content, this.getRoleLabel(this.userRole), currentPhase);
          this.addMessage(ruling);
          emitSSE(this.sessionId, { type: 'agent_message', payload: ruling, timestamp: Date.now() });
          return { success: true, messageId: objectionMsg.id };
        } catch (err) {
          console.error(`[SessionManager] object处理出错:`, err);
          return { success: false, reason: `系统处理出错，请重试` };
        } finally {
          this.isProcessing = false;
        }
      }

      case 'request_speak': {
        // 申请发言
        emitSSE(this.sessionId, {
          type: 'speak_request',
          payload: { role: this.userRole, content: action.content },
          timestamp: Date.now(),
        });
        // 法官决定是否批准
        this.isProcessing = true;
        try {
          const judgeDecision = await this.judgeAgent.decideSpeakRequest(
            action.content,
            this.getRoleLabel(this.userRole),
            currentPhase
          );
          this.addMessage(judgeDecision);
          emitSSE(this.sessionId, { type: 'agent_message', payload: judgeDecision, timestamp: Date.now() });

          if (judgeDecision.type === 'ruling') {
            // 法官批准发言，切换发言权
            this.currentSpeaker = this.userRole;
            this.allowedActions = ['speak', 'object'];
            emitSSE(this.sessionId, {
              type: 'speaking_turn',
              payload: {
                speaker: this.userRole,
                speakerLabel: this.getRoleLabel(this.userRole),
                allowedActions: this.allowedActions,
                phase: currentPhase,
                isUserTurn: true,
              },
              timestamp: Date.now(),
            });
          }
          return { success: true };
        } catch (err) {
          console.error(`[SessionManager] request_speak处理出错:`, err);
          return { success: false, reason: `系统处理出错，请重试` };
        } finally {
          this.isProcessing = false;
        }
      }

      default:
        return { success: false, reason: '不支持的操作类型' };
    }
  }

  /** 推进状态机并通知下一个发言者（使用迭代而非递归） */
  private async advanceAndNotify(): Promise<void> {
    let result = this.stateMachine.advanceSpeaker();
    this.currentSpeaker = result.speaker;

    if (result.isNewPhase) {
      emitSSE(this.sessionId, {
        type: 'phase_change',
        payload: {
          phase: result.phase,
          phaseName: this.stateMachine.getCurrentPhaseName(),
          subPhase: result.subPhase,
          subPhaseName: result.subPhaseName,
        },
        timestamp: Date.now(),
      });

      if (result.isTerminal || this.isAwardPhase(result.phase)) {
        await this.finishWithVerdict();
        return;
      }

      // 法官宣读新阶段引导
      const guidance = await this.judgeAgent.generatePhaseGuidance(
        result.phase,
        this.stateMachine.getCurrentPhaseName(),
        result.subPhaseName,
        this.getRoleLabel(result.speaker)
      );
      if (guidance.content) {
        this.addMessage(guidance);
        emitSSE(this.sessionId, { type: 'agent_message', payload: guidance, timestamp: Date.now() });
      }
    }

    // 使用迭代循环处理所有连续法官发言，避免递归栈问题
    let lastSubPhase = this.stateMachine.getCurrentSubPhase().id;
    while (this.isJudgeRole(result.speaker)) {
      // 推进后 currentSubPhaseIndex 已更新，直接取当前值
      const msgSubPhase = this.stateMachine.getCurrentSubPhase().id;
      const msgSubPhaseName = this.stateMachine.getCurrentSubPhase().name;
      // 检测子阶段变化并通知前端
      if (msgSubPhase !== lastSubPhase) {
        emitSSE(this.sessionId, {
          type: 'subphase_change',
          payload: { subPhase: msgSubPhase, subPhaseName: msgSubPhaseName },
          timestamp: Date.now(),
        });
        lastSubPhase = msgSubPhase;
      }
      const judgeMsg = await this.judgeAgent.generateSubPhaseGuidance(
        result.phase,
        msgSubPhaseName,
        this.getRoleLabel(this.userRole)
      );
      if (judgeMsg.content) {
        this.addMessage(judgeMsg);
        emitSSE(this.sessionId, { type: 'agent_message', payload: judgeMsg, timestamp: Date.now() });
      }
      // 推进到下一个发言者（循环直到非法官）
      result = this.stateMachine.advanceSpeaker();
      this.currentSpeaker = result.speaker;
      if (result.isNewPhase) {
        emitSSE(this.sessionId, {
          type: 'phase_change',
          payload: { phase: result.phase, phaseName: this.stateMachine.getCurrentPhaseName(), subPhase: result.subPhase, subPhaseName: result.subPhaseName },
          timestamp: Date.now(),
        });
        lastSubPhase = result.subPhase;
      }
      if (result.isTerminal || this.isAwardPhase(result.phase)) {
        await this.finishWithVerdict();
        return;
      }
    }

    // 非法官发言者：等待用户或触发对手 AI
    this.allowedActions = this.calculateAllowedActions(result.speaker);
    emitSSE(this.sessionId, {
      type: 'speaking_turn',
      payload: {
        speaker: result.speaker,
        speakerLabel: this.getRoleLabel(result.speaker),
        allowedActions: this.allowedActions,
        phase: result.phase,
        subPhase: result.subPhase,
        subPhaseName: result.subPhaseName,
        isUserTurn: result.speaker === this.userRole,
      },
      timestamp: Date.now(),
    });

    if (result.speaker !== this.userRole) {
      // 触发对手 AI 发言
      await this.triggerOpponentSpeech(result.phase, result.subPhaseName);
    }
  }

  /** 触发对手 AI 发言 */
  private async triggerOpponentSpeech(phase: CourtPhase, subPhaseName: string): Promise<void> {
    // 直接取对手 Agent 的角色，避免仲裁场景（claimant/respondent）被误标为原告/被告
    const opponentRole = this.opponentAgent.getConfig().assignedRole;
    const response = await this.opponentAgent.generateSpeech(phase, subPhaseName);

    if (response.content) {
      this.addMessage(response);
      emitSSE(this.sessionId, { type: 'agent_message', payload: response, timestamp: Date.now() });
      this.judgeAgent.addMemoryMessage(
        'user',
        `[${this.getRoleLabel(opponentRole)}] ${response.content}`,
        phase
      );
    }

    // 对手发言后，使用 while 循环继续推进（处理可能的连续法官发言）
    let result = this.stateMachine.advanceSpeaker();
    this.currentSpeaker = result.speaker;
    let lastSubPhase2 = this.stateMachine.getCurrentSubPhase().id;

    while (this.isJudgeRole(result.speaker)) {
      const msgSubPhase = this.stateMachine.getCurrentSubPhase().id;
      const msgSubPhaseName = this.stateMachine.getCurrentSubPhase().name;
      if (msgSubPhase !== lastSubPhase2) {
        emitSSE(this.sessionId, {
          type: 'subphase_change',
          payload: { subPhase: msgSubPhase, subPhaseName: msgSubPhaseName },
          timestamp: Date.now(),
        });
        lastSubPhase2 = msgSubPhase;
      }
      const judgeMsg = await this.judgeAgent.generateSubPhaseGuidance(
        result.phase,
        msgSubPhaseName,
        this.getRoleLabel(this.userRole)
      );
      if (judgeMsg.content) {
        this.addMessage(judgeMsg);
        emitSSE(this.sessionId, { type: 'agent_message', payload: judgeMsg, timestamp: Date.now() });
      }
      result = this.stateMachine.advanceSpeaker();
      this.currentSpeaker = result.speaker;
      if (result.isNewPhase) {
        emitSSE(this.sessionId, { type: 'phase_change', payload: { phase: result.phase, phaseName: this.stateMachine.getCurrentPhaseName(), subPhase: result.subPhase, subPhaseName: result.subPhaseName }, timestamp: Date.now() });
      }
      if (result.isTerminal || this.isAwardPhase(result.phase)) {
        await this.finishWithVerdict();
        return;
      }
    }

    // 非法官发言者
    this.allowedActions = this.calculateAllowedActions(result.speaker);
    emitSSE(this.sessionId, {
      type: 'speaking_turn',
      payload: {
        speaker: result.speaker,
        speakerLabel: this.getRoleLabel(result.speaker),
        allowedActions: this.allowedActions,
        phase: result.phase,
        subPhase: result.subPhase,
        subPhaseName: result.subPhaseName,
        isUserTurn: result.speaker === this.userRole,
      },
      timestamp: Date.now(),
    });

    if (result.speaker !== this.userRole) {
      await this.triggerOpponentSpeech(result.phase, result.subPhaseName);
    }
  }

  /** 是否已进入宣判阶段（民事/刑事为 VERDICT，仲裁为 AWARD） */
  private isAwardPhase(phase: string): boolean {
    return phase === 'VERDICT' || phase === 'AWARD';
  }

  /**
   * 是否为法庭/仲裁庭角色。
   * 仲裁流程中审判职能由 arbitrator 承担，若只比较 'judge'，仲裁庭的
   * 程序性发言会被误判为当事人发言并交给对手 AI。
   */
  private isJudgeRole(speaker: string): boolean {
    return speaker === 'judge' || speaker === 'arbitrator';
  }

  /** 生成判决/裁决，结束庭审并广播完成事件 */
  private async finishWithVerdict(): Promise<void> {
    const verdict = await this.judgeAgent.generateVerdict();
    this.addMessage(verdict);
    emitSSE(this.sessionId, { type: 'agent_message', payload: verdict, timestamp: Date.now() });
    this.status = 'completed';
    emitSSE(this.sessionId, { type: 'session_completed', payload: { status: 'completed' }, timestamp: Date.now() });
  }

  /** 预测下一个非法庭发言者 */
  private getNextNonJudgeSpeaker(): RoleId {
    const current = this.stateMachine.getCurrentSubPhase();
    const idx = this.stateMachine.getCurrentSpeakerIndex();
    for (let i = idx + 1; i < current.speakerSequence.length; i++) {
      if (!this.isJudgeRole(current.speakerSequence[i])) return current.speakerSequence[i];
    }
    return this.userRole;
  }

  /** 计算当前发言者允许的操作 */
  private calculateAllowedActions(speaker: RoleId): string[] {
    // 默认所有发言者都可以发言和申请发言
    const actions = ['speak', 'request_speak'];
    // 举证质证阶段可以提交证据
    const phase = this.getCurrentPhase();
    if (phase === 'EVIDENCE') {
      actions.push('submit_evidence');
    }
    // 所有角色随时可以提异议
    actions.push('object');
    return actions;
  }

  /** 添加消息到记录 */
  private addMessage(msg: CourtMessage): void {
    if (!msg.sequenceNumber) {
      msg.sequenceNumber = ++this.messageCounter;
    }
    this.messages.push(msg);
  }

  /** 获取角色中文标签 */
  private getRoleLabel(role: RoleId): string {
    if (this.caseType === 'arbitration') {
      if (role === 'arbitrator') return '仲裁庭';
      return role === 'claimant' ? '申请人' : '被申请人';
    }
    if (role === 'judge') return '审判长';
    if (this.caseType === 'criminal') {
      return role === 'plaintiff' ? '公诉人' : '辩护人';
    }
    return role === 'plaintiff' ? '原告' : '被告';
  }

  /** 获取当前庭审阶段 */
  getCurrentPhase(): CourtPhase {
    return this.stateMachine.getCurrentPhase();
  }

  /** 获取会话状态 */
  getState(): SessionState {
    return {
      sessionId: this.sessionId,
      caseType: this.caseType,
      caseName: this.caseName,
      caseDescription: this.caseDescription,
      userRole: this.userRole,
      opponentStyle: this.opponentStyle as 'standard' | 'aggressive' | 'moderate',
      currentPhase: this.getCurrentPhase(),
      currentPhaseName: this.stateMachine.getCurrentPhaseName(),
      currentSubPhase: this.stateMachine.getCurrentSubPhase().id,
      currentSubPhaseName: this.stateMachine.getCurrentSubPhase().name,
      currentSpeaker: this.currentSpeaker,
      allowedActions: this.allowedActions as UserActionType[],
      status: this.status,
      messages: this.messages,
      createdAt: this.createdAt,
      phaseProgress: this.stateMachine.getPhaseProgress(),
      caseDocuments: this.caseDocuments,
      imageEvidence: this.imageEvidence,
    };
  }

  /** 暂停庭审 */
  pause(): void {
    this.status = 'paused';
    emitSSE(this.sessionId, { type: 'session_paused', payload: { status: 'paused' }, timestamp: Date.now() });
  }

  /** 恢复庭审 */
  resume(): void {
    this.status = 'active';
    emitSSE(this.sessionId, { type: 'session_resumed', payload: { status: 'active' }, timestamp: Date.now() });
  }

  /** 释放资源 */
  dispose(): void {
    const subs = sseSubscribers.get(this.sessionId);
    if (subs) {
      subs.clear();
      sseSubscribers.delete(this.sessionId);
    }
    sessions.delete(this.sessionId);
  }

  /** 发送 SSE 事件（供外部 API 使用） */
  emitSSE(type: string, payload: unknown): void {
    emitSSE(this.sessionId, { type, payload, timestamp: Date.now() });
  }
}
