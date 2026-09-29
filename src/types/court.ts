// ============================================================
// 庭审核心类型定义
// ============================================================

/** 案件类型 */
export type CaseType = 'civil' | 'criminal' | 'arbitration';

/** 用户角色 */
export type UserRole = 'plaintiff' | 'defendant' | 'prosecutor' | 'defender' | 'claimant' | 'respondent';

/** 庭审阶段枚举 - 民事/刑事 */
export type CourtPhase =
  | 'PREPARATION'
  | 'INVESTIGATION'
  | 'EVIDENCE'
  | 'CROSS_EXAMINATION'
  | 'DEBATE'
  | 'FINAL_STATEMENT'
  | 'MEDIATION'
  | 'VERDICT'
  | 'ADJOURNED';

/** 仲裁阶段枚举 */
export type ArbitrationPhase =
  | 'PREPARATION'
  | 'OPENING_STATEMENTS'
  | 'REBUTTAL'
  | 'CLOSING_ARGUMENTS'
  | 'ARBITRATOR_QUESTIONS'
  | 'AWARD'
  | 'ADJOURNED';

/** 角色标识 */
export type RoleId = 'judge' | 'plaintiff' | 'defendant' | 'arbitrator' | 'claimant' | 'respondent';

/** 发言状态 */
export type SpeakingStatus = 'speaking' | 'waiting' | 'requesting' | 'muted';

/** 消息类型 */
export type MessageType = 'speech' | 'objection' | 'ruling' | 'verdict' | 'system' | 'action';

/** 用户操作类型 */
export type UserActionType = 'speak' | 'object' | 'request_speak' | 'submit_evidence' | 'upload_image';

// ============================================================
// 庭审消息
// ============================================================

export interface CourtMessage {
  id: string;
  sessionId: string;
  role: RoleId;
  phase: CourtPhase;
  subPhase?: string;
  content: string;
  type: MessageType;
  timestamp: number;
  sequenceNumber?: number;
  metadata?: {
    isAiGenerated?: boolean;
    modelUsed?: string;
  };
}

/** 用户操作请求 */
export interface UserAction {
  type: UserActionType;
  content: string;
  targetRole?: RoleId;
}

// ============================================================
// SSE 推送事件
// ============================================================

export type SSEEventType =
  | 'agent_message'
  | 'user_message'
  | 'phase_change'
  | 'subphase_change'
  | 'speaking_turn'
  | 'objection_raised'
  | 'objection_ruled'
  | 'speak_request'
  | 'verdict'
  | 'session_paused'
  | 'session_resumed'
  | 'session_completed'
  | 'error'
  | 'system'
  | 'image_uploaded'
  | 'image_analyzed';

export interface SSEEvent {
  type: SSEEventType;
  payload: unknown;
  timestamp: number;
}

// ============================================================
// 会话状态
// ============================================================

export interface SessionState {
  sessionId: string;
  caseType: CaseType;
  caseName: string;
  caseDescription: string;
  userRole: RoleId;
  opponentStyle: 'standard' | 'aggressive' | 'moderate';
  currentPhase: CourtPhase;
  currentPhaseName: string;
  currentSubPhase: string;
  currentSubPhaseName: string;
  currentSpeaker: RoleId;
  allowedActions: UserActionType[];
  messages: CourtMessage[];
  status: 'active' | 'paused' | 'completed';
  createdAt: number;
  phaseProgress: {
    current: number;
    total: number;
    phases: { id: CourtPhase; name: string; completed: boolean }[];
  };
  /** 案件文档（用户上传的 docx/pdf） */
  caseDocuments: CaseDocument[];
  /** 用户上传的图片证据 */
  imageEvidence: ImageEvidence[];
}

// ============================================================
// 流程定义
// ============================================================

export interface SubPhaseDefinition {
  id: string;
  name: string;
  speakerSequence: RoleId[];
  description: string;
}

export interface PhaseDefinition {
  id: CourtPhase;
  name: string;
  description: string;
  subPhases: SubPhaseDefinition[];
  nextPhases: CourtPhase[];
  isTerminal: boolean;
}

// ============================================================
// Agent 配置
// ============================================================

/** 证据条目 */
export interface EvidenceItem {
  id: string;
  name: string;
  type: '物证' | '书证' | '证人证言' | '鉴定意见' | '勘验笔录' | '视听资料' | '电子数据' | '当事人陈述';
  source: '原告' | '被告' | '公诉机关' | '法院调取';
  purpose: string;
  summary: string;
  /** 证据图片 URL（可选，用于需要图片展示的证据） */
  imageUrl?: string;
}

/** 用户上传的图片证据 */
export interface ImageEvidence {
  id: string;
  /** 存储 key */
  storageKey: string;
  /** 访问 URL */
  url: string;
  /** 原始文件名 */
  fileName: string;
  /** 显示名称 */
  name: string;
  /** MIME 类型 */
  contentType: string;
  /** 上传时间 */
  uploadedAt: string;
  /** 提交方 */
  submittedBy: '原告' | '被告';
  /** 展示用的提交方标签 */
  party: '原告' | '被告' | 'user';
  /** 证据名称（用户填写） */
  evidenceName: string;
  /** 证明目的（用户填写） */
  purpose: string;
  /** AI 识图分析结果 */
  analysisResult?: string;
  /** AI 分析结果（展示用） */
  analysis?: string;
  /** 分析状态：pending | analyzing | completed | failed */
  analysisStatus: 'pending' | 'analyzing' | 'completed' | 'failed';
}

/** 案件文档类型 */
export type CaseDocumentType = 'complaint' | 'defense' | 'evidence' | 'other';

/** 上传的案件文档 */
export interface CaseDocument {
  id: string;
  /** 文档类型 */
  type: CaseDocumentType;
  /** 文档名称（用户填写） */
  name: string;
  /** 原始文件名 */
  originalFileName: string;
  /** 文件格式 */
  fileFormat: 'docx' | 'pdf' | 'txt';
  /** MIME 类型 */
  contentType: string;
  /** OSS 存储 key */
  storageKey: string;
  /** 访问 URL */
  url: string;
  /** 文件扩展名 */
  ext: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 提取的文本内容 */
  extractedText: string;
  /** 提取的图片 URL 列表 */
  extractedImages: string[];
  /** 证据条目列表（预设案例证据材料专属，用于页签内卡片式渲染） */
  evidenceItems?: EvidenceItem[];
  /** 文本分段（用于侧边栏展示） */
  sections: Array<{
    title: string;
    content: string;
  }>;
  /** 上传时间 */
  uploadedAt: string;
  /** 提交方 */
  submittedBy: 'plaintiff' | 'defendant' | 'claimant' | 'respondent';
}

/** 案件材料（旧结构，保留兼容性） */
export interface CaseMaterial {
  id: string;
  title: string;
  category: '起诉状' | '答辩状' | '证据' | '其他材料';
  party?: '原告' | '被告' | '公诉机关';
  /** 正文内容（证据材料可为空，证据清单在 evidenceList 中） */
  content?: string;
  evidenceList?: EvidenceItem[];
  toc?: { title: string; anchor: string }[];
}

export interface MemoryConfig {
  maxConversationTurns: number;
  maxSummaryTokens: number;
  enableCaseMemory: boolean;
  enableStrategyMemory: boolean;
}

/** LLM 消息格式 */
export interface MessageForLLM {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
