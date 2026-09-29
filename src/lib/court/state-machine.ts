// ============================================================
// 庭审流程状态机
// ============================================================

import { CourtPhase, PhaseDefinition, SubPhaseDefinition, RoleId, CaseType } from '@/types/court';
import { getFlow, getArbitrationFlow } from './flow-definitions';

export interface StateMachineAdvanceResult {
  phase: CourtPhase;
  subPhase: string;
  subPhaseName: string;
  speaker: RoleId;
  isNewPhase: boolean;
  isTerminal: boolean;
}

export class CourtStateMachine {
  private currentPhaseId: CourtPhase = 'PREPARATION';
  private currentSubPhaseIndex: number = 0;
  private currentSpeakerIndex: number = 0;
  private flow: PhaseDefinition[];
  private caseType: CaseType;

  constructor(caseType: CaseType) {
    this.caseType = caseType;
    // 支持仲裁流程
    if (caseType === 'arbitration') {
      this.flow = getArbitrationFlow() as unknown as PhaseDefinition[];
    } else {
      this.flow = getFlow(caseType);
    }
  }

  /** 获取当前阶段定义对象 */
  getCurrentPhaseDef(): PhaseDefinition {
    return this.flow.find(p => p.id === this.currentPhaseId)!;
  }

  /** 获取当前阶段 ID */
  getCurrentPhase(): CourtPhase {
    return this.currentPhaseId;
  }

  /**
   * 获取当前子阶段定义。
   * 索引越界时回退到最后一个子阶段——终态阶段（VERDICT/AWARD）的子阶段
   * 走完后索引会溢出，若不回退会导致读取时抛异常。
   */
  getCurrentSubPhase(): SubPhaseDefinition {
    const subPhases = this.getCurrentPhaseDef().subPhases;
    const index = Math.min(Math.max(this.currentSubPhaseIndex, 0), subPhases.length - 1);
    return subPhases[index];
  }

  /** 获取当前应该发言的角色 */
  getCurrentSpeaker(): RoleId {
    const subPhase = this.getCurrentSubPhase();
    let speaker = subPhase.speakerSequence[this.currentSpeakerIndex] ?? 'judge';
    
    // 仲裁案件角色映射
    if (this.caseType === 'arbitration') {
      if (speaker === 'judge') speaker = 'arbitrator';
      if (speaker === 'plaintiff') speaker = 'claimant';
      if (speaker === 'defendant') speaker = 'respondent';
    }
    
    return speaker as RoleId;
  }

  /** 获取当前发言者索引（供 SessionManager 使用） */
  getCurrentSpeakerIndex(): number {
    return this.currentSpeakerIndex;
  }

  /** 获取当前阶段名 */
  getCurrentPhaseName(): string {
    return this.getCurrentPhaseDef().name;
  }

  /** 获取当前子阶段名 */
  getCurrentSubPhaseName(): string {
    return this.getCurrentSubPhase().name;
  }

  /** 当前发言完成后，推进到下一个发言者 */
  advanceSpeaker(): StateMachineAdvanceResult {
    const subPhase = this.getCurrentSubPhase();

    this.currentSpeakerIndex++;

    // 如果当前子阶段的所有发言者都已发言
    if (this.currentSpeakerIndex >= subPhase.speakerSequence.length) {
      this.currentSpeakerIndex = 0;
      this.currentSubPhaseIndex++;

      // 如果当前阶段的所有子阶段都已完成
      if (this.currentSubPhaseIndex >= this.getCurrentPhaseDef().subPhases.length) {
        return this.advancePhase();
      }
    }

    return {
      phase: this.currentPhaseId,
      subPhase: this.getCurrentSubPhase().id,
      subPhaseName: this.getCurrentSubPhase().name,
      speaker: this.getCurrentSpeaker(),
      isNewPhase: false,
      isTerminal: false,
    };
  }

  /** 推进到下一个阶段 */
  advancePhase(): StateMachineAdvanceResult {
    const currentPhaseDef = this.getCurrentPhaseDef();

    if (currentPhaseDef.isTerminal) {
      // 已是终态：停在最后一个子阶段，保证索引不越界
      this.currentSubPhaseIndex = Math.max(0, currentPhaseDef.subPhases.length - 1);
      return {
        phase: this.currentPhaseId,
        subPhase: this.getCurrentSubPhase().id,
        subPhaseName: this.getCurrentSubPhase().name,
        speaker: 'judge',
        isNewPhase: false,
        isTerminal: true,
      };
    }

    // 默认推进到 nextPhases 的第一个
    this.currentPhaseId = currentPhaseDef.nextPhases[0] as CourtPhase;
    this.currentSubPhaseIndex = 0;
    this.currentSpeakerIndex = 0;

    return {
      phase: this.currentPhaseId,
      subPhase: this.getCurrentSubPhase().id,
      subPhaseName: this.getCurrentSubPhase().name,
      speaker: this.getCurrentSpeaker(),
      isNewPhase: true,
      isTerminal: false,
    };
  }

  /** 序列化状态 */
  serialize(): { phase: CourtPhase; subPhaseIndex: number; speakerIndex: number } {
    return {
      phase: this.currentPhaseId,
      subPhaseIndex: this.currentSubPhaseIndex,
      speakerIndex: this.currentSpeakerIndex,
    };
  }

  /** 反序列化恢复状态 */
  restore(state: { phase: CourtPhase; subPhaseIndex: number; speakerIndex: number }): void {
    this.currentPhaseId = state.phase;
    this.currentSubPhaseIndex = state.subPhaseIndex;
    this.currentSpeakerIndex = state.speakerIndex;
  }

  /** 获取所有阶段定义 */
  getPhases(): PhaseDefinition[] {
    return this.flow;
  }

  /** 获取当前阶段进度信息 */
  getPhaseProgress(): { current: number; total: number; phases: { id: CourtPhase; name: string; completed: boolean }[] } {
    const phases = this.flow.map((p, i) => ({
      id: p.id,
      name: p.name,
      completed: this.flow.findIndex(f => f.id === this.currentPhaseId) > i,
    }));
    const currentIndex = this.flow.findIndex(f => f.id === this.currentPhaseId);
    return {
      current: currentIndex + 1,
      total: this.flow.length,
      phases,
    };
  }
}
