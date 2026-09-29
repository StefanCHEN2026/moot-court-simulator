/**
 * 案件文档上传 API
 * 支持 docx, pdf 文件上传，自动解析文本内容
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/court/session-manager';
import { validateFileType, parseDocument } from '@/lib/utils/document-parser';
import { saveFile } from '@/lib/storage';
import { CaseDocument, CaseDocumentType, ImageEvidence } from '@/types/court';

// 文档类型映射
const TYPE_MAP: Record<string, CaseDocumentType> = {
  complaint: 'complaint',
  defense: 'defense',
  evidence: 'evidence',
  other: 'other',
};

/**
 * 将长文本分段，便于侧边栏展示
 */
function parseSections(text: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];

  // 按换行+数字/标题模式分段
  const paragraphs = text.split(/\n+/);

  let currentSection: { title: string; content: string } | null = null;
  let charCount = 0;
  const MAX_CHARS_PER_SECTION = 2000;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // 检测是否是新段落的开始（以数字、标题符号、或特定关键词开头）
    const isHeading = /^[一二三四五六七八九十\d]、|^第[一二三四五六七八九十\d]条|^【|^\[|^[A-Z][.、）)]/.test(trimmed);

    if (isHeading && !currentSection) {
      currentSection = { title: trimmed.slice(0, 50), content: trimmed };
      charCount = trimmed.length;
    } else if (isHeading && currentSection) {
      // 保存当前段落，开始新段落
      if (charCount >= MAX_CHARS_PER_SECTION) {
        sections.push(currentSection);
        currentSection = { title: trimmed.slice(0, 50), content: trimmed };
        charCount = trimmed.length;
      } else {
        currentSection.content += '\n' + trimmed;
        charCount += trimmed.length;
      }
    } else if (currentSection) {
      currentSection.content += '\n' + trimmed;
      charCount += trimmed.length;
      if (charCount >= MAX_CHARS_PER_SECTION) {
        sections.push(currentSection);
        currentSection = null;
        charCount = 0;
      }
    } else {
      // 没有标题的段落，创建新段落
      currentSection = { title: trimmed.slice(0, 30), content: trimmed };
      charCount = trimmed.length;
    }
  }

  // 保存最后一个段落
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }

  // 如果没有分段，创建默认分段
  if (sections.length === 0 && text.trim()) {
    sections.push({ title: '全文', content: text.slice(0, 5000) });
  }

  return sections;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    // 解析 multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('type') as string | null;
    const documentName = formData.get('name') as string | null;
    const userRole = formData.get('userRole') as string | null;

    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 });
    }

    if (!documentType || !TYPE_MAP[documentType]) {
      return NextResponse.json({ error: '无效的文档类型' }, { status: 400 });
    }

    if (!documentName || documentName.trim() === '') {
      return NextResponse.json({ error: '请填写文档名称' }, { status: 400 });
    }

    // 验证文件类型
    const fileFormat = validateFileType(file.name, file.type);
    if (!fileFormat) {
      return NextResponse.json(
        { error: '仅支持 docx 和 pdf 格式的文件' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 解析文档内容
    const { text: extractedText, images: extractedImages } = await parseDocument(buffer, fileFormat);

    if (!extractedText || extractedText.trim() === '') {
      return NextResponse.json(
        { error: '无法从文档中提取文本内容，请确保文档包含可识别的文字' },
        { status: 400 }
      );
    }

    // 保存原文件到本地存储
    const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g, '_');
    const saved = await saveFile(
      buffer,
      `cases/${sessionId}/documents/${Date.now()}_${safeOriginalName}`
    );
    const storageKey = saved.key;
    const url = saved.url;

    // 将提取的文本分段
    const sections = parseSections(extractedText);

    // 创建文档记录
    const document: CaseDocument = {
      id: `doc_${Date.now()}`,
      type: TYPE_MAP[documentType],
      name: documentName.trim(),
      originalFileName: file.name,
      fileFormat,
      ext: fileFormat === 'docx' ? 'docx' : 'pdf',
      fileSize: buffer.length,
      contentType: file.type,
      storageKey,
      url,
      extractedText,
      extractedImages,
      sections,
      uploadedAt: new Date().toISOString(),
      submittedBy: userRole === 'defendant' ? 'defendant' : 'plaintiff',
    };

    // 存储到会话
    session.caseDocuments.push(document);

    // 如果有提取的图片，也保存到 imageEvidence
    for (const imgData of extractedImages) {
      const imgId = `doc_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const imgEvidence: ImageEvidence = {
        id: imgId,
        storageKey: `cases/${sessionId}/images/${imgId}.jpg`,
        url: imgData,
        fileName: `embedded_image_${imgId}.jpg`,
        name: `${document.name} - 内嵌图片`,
        contentType: 'image/jpeg',
        uploadedAt: document.uploadedAt,
        submittedBy: document.submittedBy === 'plaintiff' ? '原告' : '被告',
        party: document.submittedBy === 'plaintiff' ? '原告' : '被告',
        evidenceName: `${document.name} - 内嵌图片`,
        purpose: '文档内嵌图片证据',
        analysisStatus: 'completed',
        analysisResult: '已从上传文档中自动提取',
        analysis: '已从上传文档中自动提取',
      };
      session.imageEvidence.push(imgEvidence);
    }

    // 广播更新
    session.emitSSE('document_uploaded', {
      document,
      documentType: TYPE_MAP[documentType],
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        name: document.name,
        fileFormat: document.fileFormat,
        url: document.url,
        extractedTextLength: document.extractedText.length,
        imageCount: document.extractedImages.length,
        uploadedAt: document.uploadedAt,
      },
    });
  } catch (error) {
    console.error('文档上传失败:', error);
    return NextResponse.json(
      {
        error: `文档上传失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}

/**
 * 获取会话的所有文档
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    return NextResponse.json({
      documents: session.caseDocuments.map((doc) => ({
        id: doc.id,
        type: doc.type,
        name: doc.name,
        fileFormat: doc.fileFormat,
        originalFileName: doc.originalFileName,
        uploadedAt: doc.uploadedAt,
        submittedBy: doc.submittedBy,
      })),
    });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    return NextResponse.json(
      { error: '获取文档列表失败' },
      { status: 500 }
    );
  }
}
