import { NextRequest, NextResponse } from 'next/server';
import { SessionManager, getSession } from '@/lib/court/session-manager';
import { CaseDocument, CaseType, RoleId } from '@/types/court';
import { PRESET_CASES } from '@/lib/data/preset-cases';
import { getArbitrationCase } from '@/lib/data/arbitration-cases';
import { incrementTrialCount } from '@/lib/data/stats';

// 获取 category 对应的 document type
function getDocTypeFromCategory(category: string): CaseDocument['type'] {
  if (category.includes('起诉状') || category.includes('Request')) return 'complaint';
  if (category.includes('答辩状') || category.includes('Defense')) return 'defense';
  if (category.includes('证据') || category.includes('Evidence')) return 'evidence';
  return 'other';
}

/** POST /api/sessions — 创建庭审会话 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      caseType,
      caseName,
      caseDescription,
      userRole,
      opponentStyle = 'standard',
      caseDocuments = [],
      presetCaseId, // 可选，预设案例ID
      arbitrationCaseId, // 可选，仲裁案例ID
    } = body as {
      caseType: CaseType;
      caseName: string;
      caseDescription: string;
      userRole: RoleId;
      opponentStyle?: 'standard' | 'aggressive' | 'moderate';
      caseDocuments?: CaseDocument[];
      presetCaseId?: string;
      arbitrationCaseId?: string;
    };

    // 校验必填字段
    if (!caseType || !caseName || !caseDescription || !userRole) {
      return NextResponse.json(
        { error: '缺少必填字段：caseType, caseName, caseDescription, userRole' },
        { status: 400 }
      );
    }

    if (!['civil', 'criminal', 'arbitration'].includes(caseType)) {
      return NextResponse.json(
        { error: 'caseType 必须为 civil、criminal 或 arbitration' },
        { status: 400 }
      );
    }

    // 验证角色
    const validRoles = caseType === 'arbitration' 
      ? ['claimant', 'respondent', 'plaintiff', 'defendant']
      : ['plaintiff', 'defendant'];
    
    if (!validRoles.includes(userRole)) {
      return NextResponse.json(
        { error: caseType === 'arbitration' 
          ? 'userRole 必须为 claimant 或 respondent' 
          : 'userRole 必须为 plaintiff 或 defendant' },
        { status: 400 }
      );
    }

    const sessionId = crypto.randomUUID();

    // 如果有预设案例ID，加载预设案例的文档
    let finalDocuments: CaseDocument[] = caseDocuments;
    
    // 处理仲裁案例
    if (arbitrationCaseId && caseType === 'arbitration') {
      const arbCase = getArbitrationCase(arbitrationCaseId);
      if (arbCase) {
        // 构建仲裁案例文档
        const factDocument: CaseDocument = {
          id: 'facts',
          type: 'complaint',
          name: 'Facts of the Case',
          originalFileName: 'facts.txt',
          fileFormat: 'txt',
          contentType: 'text/plain',
          storageKey: `arbitration/${arbitrationCaseId}/facts`,
          url: '',
          ext: 'txt',
          fileSize: arbCase.factsOfTheCase.length,
          extractedText: arbCase.factsOfTheCase,
          extractedImages: [],
          sections: [{ title: 'Facts', content: arbCase.factsOfTheCase }],
          uploadedAt: new Date().toISOString(),
          submittedBy: 'claimant',
        };
        
        const claimantArguments: CaseDocument = {
          id: 'claimant-arguments',
          type: 'complaint',
          name: 'Claimant Arguments',
          originalFileName: 'claimant_arguments.txt',
          fileFormat: 'pdf',
          contentType: 'text/plain',
          storageKey: `arbitration/${arbitrationCaseId}/claimant`,
          url: '',
          ext: 'txt',
          fileSize: arbCase.claimantArguments.join('\n\n').length,
          extractedText: arbCase.claimantArguments.join('\n\n'),
          extractedImages: [],
          sections: arbCase.claimantArguments.map((arg: string, i: number) => ({ title: `Argument ${i + 1}`, content: arg })),
          uploadedAt: new Date().toISOString(),
          submittedBy: 'claimant',
        };
        
        const respondentArguments: CaseDocument = {
          id: 'respondent-arguments',
          type: 'defense',
          name: 'Respondent Arguments',
          originalFileName: 'respondent_arguments.txt',
          fileFormat: 'pdf',
          contentType: 'text/plain',
          storageKey: `arbitration/${arbitrationCaseId}/respondent`,
          url: '',
          ext: 'txt',
          fileSize: arbCase.respondentArguments.join('\n\n').length,
          extractedText: arbCase.respondentArguments.join('\n\n'),
          extractedImages: [],
          sections: arbCase.respondentArguments.map((arg: string, i: number) => ({ title: `Argument ${i + 1}`, content: arg })),
          uploadedAt: new Date().toISOString(),
          submittedBy: 'respondent',
        };
        
        finalDocuments = [factDocument, claimantArguments, respondentArguments];
      }
    } else if (presetCaseId) {
      const preset = PRESET_CASES.find(p => p.id === presetCaseId);
      if (preset && preset.materials) {
        finalDocuments = preset.materials.map((m): CaseDocument => {
          const text = m.content || '';
          const lines = text.split('\n\n').filter((s: string) => s.trim());
          // 收集证据项的图片 URL
          const evidenceImages = (m.evidenceList || [])
            .filter(ev => ev.imageUrl)
            .map(ev => ev.imageUrl!);
          return {
            id: m.id,
            type: getDocTypeFromCategory(m.category),
            name: m.title,
            originalFileName: m.title,
            fileFormat: 'docx' as const,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            storageKey: `preset/${presetCaseId}/${m.id}`,
            url: '',
            ext: 'docx',
            fileSize: text.length,
            extractedText: text,
            extractedImages: evidenceImages,
            evidenceItems: (m.evidenceList || []).map(ev => ({ ...ev })),
            sections: lines.map((line: string) => ({ title: line.substring(0, 50), content: line })),
            uploadedAt: new Date().toISOString(),
            submittedBy: m.party === '原告' ? 'plaintiff' : 'defendant',
          };
        });
      }
    }

    // 规范化角色
    const normalizedUserRole: RoleId = caseType === 'arbitration'
      ? (userRole === 'plaintiff' ? 'claimant' : userRole === 'defendant' ? 'respondent' : userRole)
      : userRole;

    // 递增开庭次数
    try {
      await incrementTrialCount();
    } catch (e) {
      console.error('[API] 递增开庭次数失败:', e);
    }

    const session = new SessionManager(
      sessionId,
      caseType,
      caseName,
      caseDescription,
      normalizedUserRole,
      opponentStyle,
      finalDocuments
    );

    // 异步启动庭审（法官发言等）
    session.startTrial().catch(err => {
      console.error('[API] 启动庭审失败:', err);
    });

    return NextResponse.json({
      sessionId,
      status: 'active',
      currentPhase: 'PREPARATION',
      message: '庭审会话已创建，法官即将宣布开庭',
    }, { status: 201 });
  } catch (error) {
    console.error('[API] 创建会话失败:', error);
    return NextResponse.json(
      { error: '创建会话失败' },
      { status: 500 }
    );
  }
}

/** GET /api/sessions — 获取所有会话列表 */
export async function GET() {
  const { getAllSessions } = await import('@/lib/court/session-manager');
  const sessions = getAllSessions();
  return NextResponse.json({ sessions });
}
