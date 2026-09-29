/**
 * 文档解析工具 — 从 DOCX / PDF 提取文本内容
 *
 * 说明：两者均在服务端（Node）解析。
 * - DOCX 使用 mammoth；
 * - PDF 使用 pdfjs-dist 的 legacy 构建，可在 Node 中直接提取文本，
 *   不需要浏览器环境或 Web Worker（已通过 next.config 的
 *   serverExternalPackages 将其排除出打包）。
 */

import mammoth from 'mammoth';

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfjsLib: PdfJsModule | null = null;

async function getPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLib;
}

export interface ParsedDocument {
  /** 提取的纯文本内容 */
  text: string;
  /** 提取的图片 URL 列表（文档内的图片） */
  images: string[];
}

/**
 * 从 DOCX 文件 buffer 提取文本
 */
async function parseDocx(buffer: Buffer): Promise<{ text: string; images: string[] }> {
  try {
    const textResult = await mammoth.extractRawText({ buffer });
    return { text: textResult.value.trim(), images: [] };
  } catch (error) {
    console.error('DOCX 解析失败:', error);
    throw new Error(`DOCX 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 从 PDF 文件 buffer 提取文本
 */
async function parsePdf(buffer: Buffer): Promise<{ text: string; images: string[] }> {
  try {
    const pdfjs = await getPdfJs();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      useWorkerFetch: false,
      // 仅输出错误级别日志，避免字体等告警刷屏
      verbosity: 0,
    });

    const pdf = await loadingTask.promise;
    const fullText: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();

      if (pageText) {
        fullText.push(`【第 ${pageNum} 页】\n${pageText}`);
      }
    }

    return { text: fullText.join('\n\n'), images: [] };
  } catch (error) {
    console.error('PDF 解析失败:', error);
    throw new Error(`PDF 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 解析文档文件
 * @param buffer 文件 buffer
 * @param fileFormat 文件格式 'docx' | 'pdf'
 */
export async function parseDocument(buffer: Buffer, fileFormat: 'docx' | 'pdf'): Promise<ParsedDocument> {
  if (fileFormat === 'docx') {
    return parseDocx(buffer);
  }
  if (fileFormat === 'pdf') {
    return parsePdf(buffer);
  }
  throw new Error(`不支持的文件格式: ${fileFormat}`);
}

/**
 * 验证文件类型
 */
export function validateFileType(fileName: string, mimeType: string): 'docx' | 'pdf' | null {
  const ext = fileName.toLowerCase().split('.').pop();
  const validTypes = [
    // DOCX
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // PDF
    'application/pdf',
  ];

  if (!validTypes.includes(mimeType) && ext !== 'docx' && ext !== 'pdf') {
    return null;
  }

  return ext === 'pdf' ? 'pdf' : 'docx';
}

/**
 * 截断过长的文本（用于预览）
 */
export function truncateText(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...（内容过长，已截断）';
}
