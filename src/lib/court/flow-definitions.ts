// ============================================================
// 民事/刑事庭审流程定义
// ============================================================

import { PhaseDefinition, CourtPhase, ArbitrationPhase } from '@/types/court';

/** 仲裁子阶段定义 */
interface ArbitrationSubPhase {
  id: string;
  name: string;
  speakerSequence: string[];
  description: string;
}

/** 仲裁阶段定义 */
interface ArbitrationPhaseDefinition {
  id: ArbitrationPhase;
  name: string;
  description: string;
  subPhases: ArbitrationSubPhase[];
  nextPhases: ArbitrationPhase[];
  isTerminal: boolean;
}

export const CIVIL_FLOW: PhaseDefinition[] = [
  {
    id: 'PREPARATION',
    name: '开庭准备',
    description: '查明当事人到庭情况，宣布法庭纪律，核对身份，告知权利义务',
    subPhases: [
      { id: 'roll_call', name: '点名', speakerSequence: ['judge'], description: '查明到庭情况' },
      { id: 'discipline', name: '宣布纪律', speakerSequence: ['judge'], description: '宣布法庭纪律' },
      { id: 'identity', name: '核对身份', speakerSequence: ['judge', 'plaintiff', 'defendant'], description: '核对各方身份' },
      { id: 'rights', name: '告知权利', speakerSequence: ['judge'], description: '告知诉讼权利义务' },
      { id: 'recusal', name: '回避申请', speakerSequence: ['judge', 'plaintiff', 'defendant'], description: '询问是否申请回避' },
    ],
    nextPhases: ['INVESTIGATION'],
    isTerminal: false,
  },
  {
    id: 'INVESTIGATION',
    name: '法庭调查',
    description: '原告陈述诉讼请求和事实理由，被告答辩',
    subPhases: [
      { id: 'plaintiff_claim', name: '原告陈述', speakerSequence: ['judge', 'plaintiff'], description: '原告陈述诉讼请求、事实与理由' },
      { id: 'defendant_reply', name: '被告答辩', speakerSequence: ['judge', 'defendant'], description: '被告进行答辩' },
    ],
    nextPhases: ['EVIDENCE'],
    isTerminal: false,
  },
  {
    id: 'EVIDENCE',
    name: '举证质证',
    description: '双方举证、质证',
    subPhases: [
      { id: 'plaintiff_evidence', name: '原告举证', speakerSequence: ['judge', 'plaintiff', 'defendant'], description: '原告举证，被告质证' },
      { id: 'defendant_evidence', name: '被告举证', speakerSequence: ['judge', 'defendant', 'plaintiff'], description: '被告举证，原告质证' },
    ],
    nextPhases: ['CROSS_EXAMINATION'],
    isTerminal: false,
  },
  {
    id: 'CROSS_EXAMINATION',
    name: '法庭发问',
    description: '法庭向当事人发问，核实事实',
    subPhases: [
      { id: 'judge_question', name: '法官发问', speakerSequence: ['judge', 'plaintiff', 'defendant'], description: '法官向各方发问' },
    ],
    nextPhases: ['DEBATE'],
    isTerminal: false,
  },
  {
    id: 'DEBATE',
    name: '法庭辩论',
    description: '双方围绕争议焦点进行辩论',
    subPhases: [
      { id: 'plaintiff_debate', name: '原告发言', speakerSequence: ['judge', 'plaintiff'], description: '原告发言' },
      { id: 'defendant_debate', name: '被告答辩', speakerSequence: ['judge', 'defendant'], description: '被告答辩' },
      { id: 'free_debate', name: '自由辩论', speakerSequence: ['plaintiff', 'defendant', 'plaintiff', 'defendant'], description: '双方自由辩论' },
    ],
    nextPhases: ['FINAL_STATEMENT'],
    isTerminal: false,
  },
  {
    id: 'FINAL_STATEMENT',
    name: '最后陈述',
    description: '双方发表最后意见',
    subPhases: [
      { id: 'plaintiff_final', name: '原告最后陈述', speakerSequence: ['judge', 'plaintiff'], description: '原告最后陈述' },
      { id: 'defendant_final', name: '被告最后陈述', speakerSequence: ['judge', 'defendant'], description: '被告最后陈述' },
    ],
    nextPhases: ['MEDIATION'],
    isTerminal: false,
  },
  {
    id: 'MEDIATION',
    name: '法庭调解',
    description: '法官询问是否同意调解',
    subPhases: [
      { id: 'mediation_inquiry', name: '调解询问', speakerSequence: ['judge', 'plaintiff', 'defendant'], description: '询问双方是否同意调解' },
    ],
    nextPhases: ['VERDICT'],
    isTerminal: false,
  },
  {
    id: 'VERDICT',
    name: '当庭宣判',
    description: '法官宣读判决',
    subPhases: [
      { id: 'verdict_read', name: '宣读判决', speakerSequence: ['judge'], description: '当庭宣判' },
      { id: 'appeal_rights', name: '上诉权利告知', speakerSequence: ['judge'], description: '告知上诉权利' },
    ],
    nextPhases: [],
    isTerminal: true,
  },
];

export const CRIMINAL_FLOW: PhaseDefinition[] = [
  {
    id: 'PREPARATION',
    name: '开庭准备',
    description: '查明当事人到庭情况，宣布法庭纪律',
    subPhases: [
      { id: 'roll_call', name: '点名', speakerSequence: ['judge'], description: '查明到庭情况' },
      { id: 'discipline', name: '宣布纪律', speakerSequence: ['judge'], description: '宣布法庭纪律' },
      { id: 'rights', name: '告知权利', speakerSequence: ['judge'], description: '告知诉讼权利义务' },
    ],
    nextPhases: ['INVESTIGATION'],
    isTerminal: false,
  },
  {
    id: 'INVESTIGATION',
    name: '法庭调查',
    description: '公诉方宣读起诉书，被告答辩',
    subPhases: [
      { id: 'plaintiff_claim', name: '公诉方宣读起诉书', speakerSequence: ['judge', 'plaintiff'], description: '公诉方宣读起诉书' },
      { id: 'defendant_reply', name: '被告答辩', speakerSequence: ['judge', 'defendant'], description: '被告人及辩护人答辩' },
    ],
    nextPhases: ['EVIDENCE'],
    isTerminal: false,
  },
  {
    id: 'EVIDENCE',
    name: '举证质证',
    description: '双方举证、质证',
    subPhases: [
      { id: 'plaintiff_evidence', name: '公诉方举证', speakerSequence: ['judge', 'plaintiff', 'defendant'], description: '公诉方举证，辩护方质证' },
      { id: 'defendant_evidence', name: '辩护方举证', speakerSequence: ['judge', 'defendant', 'plaintiff'], description: '辩护方举证，公诉方质证' },
    ],
    nextPhases: ['DEBATE'],
    isTerminal: false,
  },
  {
    id: 'DEBATE',
    name: '法庭辩论',
    description: '双方进行辩论',
    subPhases: [
      { id: 'plaintiff_debate', name: '公诉方发言', speakerSequence: ['judge', 'plaintiff'], description: '公诉方发言' },
      { id: 'defendant_debate', name: '辩护方答辩', speakerSequence: ['judge', 'defendant'], description: '辩护方答辩' },
      { id: 'free_debate', name: '自由辩论', speakerSequence: ['plaintiff', 'defendant', 'plaintiff', 'defendant'], description: '双方自由辩论' },
    ],
    nextPhases: ['FINAL_STATEMENT'],
    isTerminal: false,
  },
  {
    id: 'FINAL_STATEMENT',
    name: '最后陈述',
    description: '被告人最后陈述',
    subPhases: [
      { id: 'defendant_final', name: '被告人最后陈述', speakerSequence: ['judge', 'defendant'], description: '被告人最后陈述' },
    ],
    nextPhases: ['VERDICT'],
    isTerminal: false,
  },
  {
    id: 'VERDICT',
    name: '当庭宣判',
    description: '法官宣读判决',
    subPhases: [
      { id: 'verdict_read', name: '宣读判决', speakerSequence: ['judge'], description: '当庭宣判' },
    ],
    nextPhases: [],
    isTerminal: true,
  },
];

export function getFlow(caseType: 'civil' | 'criminal'): PhaseDefinition[] {
  return caseType === 'civil' ? CIVIL_FLOW : CRIMINAL_FLOW;
}

export function getPhaseName(phase: CourtPhase, caseType: 'civil' | 'criminal'): string {
  const flow = getFlow(caseType);
  return flow.find(p => p.id === phase)?.name ?? phase;
}

// ============================================================
// 国际商事仲裁流程定义 (ICC Rules 2021)
// ============================================================

export const ARBITRATION_FLOW: ArbitrationPhaseDefinition[] = [
  {
    id: 'PREPARATION',
    name: 'Preparatory Phase',
    description: 'Tribunal constitution, Terms of Reference, procedural orders',
    subPhases: [
      { id: 'tribunal_constitution', name: 'Tribunal Constitution', speakerSequence: ['arbitrator'], description: 'Announce tribunal composition and confirm no challenges' },
      { id: 'terms_of_reference', name: 'Terms of Reference', speakerSequence: ['arbitrator', 'claimant', 'respondent'], description: 'Confirm Terms of Reference' },
      { id: 'procedural_order', name: 'Procedural Order No. 1', speakerSequence: ['arbitrator'], description: 'Issue procedural timetable' },
    ],
    nextPhases: ['OPENING_STATEMENTS'],
    isTerminal: false,
  },
  {
    id: 'OPENING_STATEMENTS',
    name: 'Opening Statements',
    description: 'Each party presents its case overview',
    subPhases: [
      { id: 'claimant_opening', name: 'Claimant Opening', speakerSequence: ['arbitrator', 'claimant'], description: 'Claimant presents opening statement' },
      { id: 'respondent_opening', name: 'Respondent Opening', speakerSequence: ['arbitrator', 'respondent'], description: 'Respondent presents opening statement' },
    ],
    nextPhases: ['REBUTTAL'],
    isTerminal: false,
  },
  {
    id: 'REBUTTAL',
    name: 'Rebuttal',
    description: 'Rebuttal and sur-rebuttal',
    subPhases: [
      { id: 'claimant_rebuttal', name: 'Claimant Rebuttal', speakerSequence: ['arbitrator', 'claimant'], description: 'Claimant rebuttal' },
      { id: 'respondent_surrebuttal', name: 'Respondent Sur-rebuttal', speakerSequence: ['arbitrator', 'respondent'], description: 'Respondent sur-rebuttal' },
    ],
    nextPhases: ['ARBITRATOR_QUESTIONS'],
    isTerminal: false,
  },
  {
    id: 'ARBITRATOR_QUESTIONS',
    name: 'Tribunal Questions',
    description: 'Arbitrators question the parties',
    subPhases: [
      { id: 'arbitrator_questions', name: 'Tribunal Questions', speakerSequence: ['arbitrator', 'claimant', 'respondent'], description: 'Tribunal questions to parties' },
    ],
    nextPhases: ['CLOSING_ARGUMENTS'],
    isTerminal: false,
  },
  {
    id: 'CLOSING_ARGUMENTS',
    name: 'Closing Arguments',
    description: 'Final arguments from both parties',
    subPhases: [
      { id: 'claimant_closing', name: 'Claimant Closing', speakerSequence: ['arbitrator', 'claimant'], description: 'Claimant closing argument' },
      { id: 'respondent_closing', name: 'Respondent Closing', speakerSequence: ['arbitrator', 'respondent'], description: 'Respondent closing argument' },
    ],
    nextPhases: ['AWARD'],
    isTerminal: false,
  },
  {
    id: 'AWARD',
    name: 'Award',
    description: 'Tribunal renders final award',
    subPhases: [
      { id: 'award_deliberation', name: 'Deliberation', speakerSequence: ['arbitrator'], description: 'Tribunal deliberation' },
      { id: 'award_reading', name: 'Award Reading', speakerSequence: ['arbitrator'], description: 'Reading of the award' },
      { id: 'costs', name: 'Costs Allocation', speakerSequence: ['arbitrator'], description: 'Allocation of arbitration costs' },
    ],
    nextPhases: [],
    isTerminal: true,
  },
];

export function getArbitrationFlow(): ArbitrationPhaseDefinition[] {
  return ARBITRATION_FLOW;
}

export function getArbitrationPhaseName(phase: ArbitrationPhase): string {
  return ARBITRATION_FLOW.find(p => p.id === phase)?.name ?? phase;
}

/** 统一获取流程 - 支持民事、刑事、仲裁 */
export function getFlowByType(caseType: 'civil' | 'criminal' | 'arbitration'): PhaseDefinition[] | ArbitrationPhaseDefinition[] {
  if (caseType === 'arbitration') {
    return ARBITRATION_FLOW;
  }
  return caseType === 'civil' ? CIVIL_FLOW : CRIMINAL_FLOW;
}
