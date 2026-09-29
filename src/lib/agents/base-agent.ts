// ============================================================
// Agent 基类 — 所有 AI Agent 的基类
// ============================================================

import { MemoryStore } from '@/lib/memory/memory-store';
import { LLM_ERROR_PREFIX } from '@/lib/llm/client';
import { MemoryConfig, CourtMessage, RoleId } from '@/types/court';

export interface AgentConfig {
  role: 'judge' | 'opponent' | 'arbitrator';
  assignedRole: RoleId;
  memoryConfig: MemoryConfig;
  temperature: number;
  maxTokens: number;
}

/**
 * 模型泄漏的「自言自语」行特征。
 * 只在命中这些明确特征时剔除整行——不要用宽泛的字符类，
 * 否则「根据《民法典》……」等法律依据句会被误删。
 */
const META_LINE_PATTERNS: RegExp[] = [
  /^(?:好的|明白了|收到)[，,。！!\s]/,
  /^用户(?:要求|希望|想要|输入)/,
  /^我(?:需要|将|会|得|要|来|先)/,
  /^(?:需要|必须|应该)(?:注意|确保|引导|输出|包含)/,
  /^(?:提示|注意|说明|指令)[：:]/,
  /^(?:现在请|请直接输出|只输出|绝对不要|不能包含)/,
  /^首先[，,]\s*我/,
  /^第[一二三]步[：:]/,
  /^作为(?:审判长|法官|仲裁员|律师|原告|被告)[，,]/,
  /^根据(?:用户|提示|上述|前述|要求|题目)/,
];

/** 括号内明确标注为思考/说明的元信息；保留（一）（2023）京01民初1号 等法律编号 */
const META_PAREN = /[（(](?:思考|推理|说明|注释|注意|PS|ps)[：:][^）)]*[）)]/g;

export abstract class BaseAgent {
  protected memory: MemoryStore;
  protected config: AgentConfig;
  protected sessionId: string;
  protected isProcessing: boolean = false;

  constructor(config: AgentConfig, sessionId: string) {
    this.config = config;
    this.sessionId = sessionId;
    this.memory = new MemoryStore(config.memoryConfig);
  }

  /** 核心方法：处理收到的消息并生成回复 */
  abstract handleMessage(message: CourtMessage): Promise<CourtMessage | null>;

  /** 获取系统提示词 */
  protected abstract getSystemPrompt(): string;

  /** 调用 LLM 生成回复 */
  async callLLM(userMessage: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const context = this.memory.buildLLMContext(this.getSystemPrompt());
    context.push({ role: 'user', content: userMessage });

    const { chat } = await import('@/lib/llm/client');

    // 法律检索为可选能力：未启用/未配置时返回 null，不产生任何额外调用
    const { createLegalResearch } = await import('@/lib/mcp/legal-research');
    const legal = await createLegalResearch();
    if (legal) {
      context.push({
        role: 'system',
        content:
          '【可用工具】你可以调用 legal_search 检索法律法规原文。' +
          '需要引用具体法条、确认条文内容或条款序号时，先检索再据以作答；' +
          '检索不到或结果无关时，基于已有事实作答，不要编造法条。',
      });
    }

    const result = await chat(context, {
      temperature: options?.temperature ?? this.config.temperature,
      maxTokens: options?.maxTokens ?? this.config.maxTokens,
      tools: legal ? [legal.tool] : undefined,
      toolRunner: legal ? legal.run : undefined,
    });

    // 将交互记录到记忆中
    this.memory.addMessage('user', userMessage);
    this.memory.addMessage('assistant', result);

    return result;
  }

  /**
   * 清理由模型泄漏的思考/元信息。
   *
   * 注意：这里只应剔除「模型在自言自语」的内容，不能误伤法律正文。
   * 早期版本用字符类 /^[根据考虑到可知推理]/ 判断整行，会把
   * 「根据《民法典》第五百七十七条……」这类法律依据句整行删掉；
   * 并且会删除所有全角括号内容，导致「（一）」「（2023）京01民初1号」
   * 等编号丢失。因此改为「只在明确出现元信息特征时才剔除」。
   */
  protected sanitizeLLMOutput(content: string): string {
    // LLM 调用失败的提示信息需原样展示，清洗会破坏其中的括号与说明
    if (content.trimStart().startsWith(LLM_ERROR_PREFIX)) return content.trim();

    // 模型可能整段输出思维链，先移除
    const text = content.replace(/<think>[\s\S]*?<\/think>/gi, '');

    const cleanedLines: string[] = [];
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      // 纯标记行（markdown 围栏、分隔线、孤立括号等）
      if (/^[`*_#\->=\s[\]【】()（）]+$/.test(line)) continue;
      // 明确的自言自语特征
      if (META_LINE_PATTERNS.some((p) => p.test(line))) continue;
      cleanedLines.push(line);
    }

    const result = cleanedLines
      .join('\n')
      // 方括号控制指令（仅已知标记，避免误删正文里的方括号）
      .replace(/\[(TURN|PHASE_ADVANCE|SUSTAINED|OVERRULED|RULING|NO_RESPONSE|NO_RESPONSE)[^\]]*\]/gi, '')
      // 括号内标注了「思考/推理/说明」的元信息
      .replace(META_PAREN, ' ')
      // 行首元信息标签（提示：/ 注意：/ 说明：/ 指令：）
      .replace(/^(?:提示|注意|说明|指令)[：:].*$/gm, '')
      // 行首残留的角色前缀
      .replace(/^(?:审判长|法官|仲裁员)[：:]\s*/gm, '')
      // 模型习惯性重复同一句
      .split('\n')
      .filter((l, idx, arr) => {
        const s = l.trim();
        if (!s) return false;
        return arr.findIndex((x) => x.trim() === s) === idx;
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      .trim();

    // 若整段以「好的，……」这类应答开头，只去掉该引导语，不裁剪正文
    const trimmed = result.replace(/^(?:好的|明白了|收到)[，,。！!\s]+/, '').trim();
    return trimmed;
  }

  /** 创建消息对象 */
  createMessage(content: string, type: CourtMessage['type'] = 'speech', phase: string = 'PREPARATION'): CourtMessage {
    const sanitized = this.sanitizeLLMOutput(content);
    return {
      id: crypto.randomUUID(),
      sessionId: this.sessionId,
      role: this.config.assignedRole,
      phase: phase as CourtMessage['phase'],
      content: sanitized || content,
      type,
      timestamp: Date.now(),
      metadata: {
        isAiGenerated: true,
      },
    };
  }

  /** 获取 Agent 配置 */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * 添加一条外部消息到记忆。
   *
   * 曾用「中文角色标签 === 'judge'」来判断说话人，而调用方传的是
   * '审判长'/'原告' 等标签，条件恒为 false，导致所有外部消息都被
   * 记为 user。改为直接传入记忆角色，说话人名称写进内容里。
   *
   * @param role 'user' = 对话参与方（用户、对手、系统注入）；'assistant' = 该 Agent 自己
   * @param content 记忆内容，建议带 [说话人] 前缀便于模型区分
   */
  addMemoryMessage(role: 'user' | 'assistant', content: string, _phase?: string): void {
    this.memory.addMessage(role, content);
  }

  /** 检查是否正在处理 */
  getIsProcessing(): boolean {
    return this.isProcessing;
  }

  /** 获取记忆实例 */
  getMemory(): MemoryStore {
    return this.memory;
  }

  /** 序列化状态 */
  serialize(): string {
    return this.memory.serialize();
  }

  /** 反序列化恢复状态 */
  restore(json: string): void {
    this.memory = MemoryStore.deserialize(json, this.config.memoryConfig);
  }
}
