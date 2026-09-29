import { NextRequest, NextResponse } from "next/server";
import { ImageEvidence } from "@/types/court";
import { analyzeImage } from "@/lib/utils/image-analyzer";
import { getSession, SessionManager } from "@/lib/court/session-manager";
import { getFileAsDataUrl, saveFile } from "@/lib/storage";

/**
 * 上传图片证据 API
 * POST /api/sessions/[sessionId]/image
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const evidenceName = formData.get("evidenceName") as string | null;
    const purpose = formData.get("purpose") as string | null;
    const submittedBy = formData.get("submittedBy") as "原告" | "被告" | null;

    if (!file || !evidenceName || !purpose || !submittedBy) {
      return NextResponse.json(
        { error: "Missing required fields: file, evidenceName, purpose, submittedBy" },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // 验证文件大小 (最大 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // 保存到本地存储
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const saved = await saveFile(buffer, `evidence/${sessionId}/${safeFileName}`);

    // 创建图片证据记录
    const imageEvidence: ImageEvidence = {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      storageKey: saved.key,
      url: saved.url,
      fileName: file.name,
      name: file.name,
      contentType: file.type,
      uploadedAt: new Date().toISOString(),
      submittedBy,
      party: submittedBy,
      evidenceName,
      purpose,
      analysisStatus: "analyzing",
    };

    // 存储到会话
    session.imageEvidence = [...session.imageEvidence, imageEvidence];

    // 触发 SSE 事件
    session.emitSSE("image_uploaded", imageEvidence);

    // 异步分析图片（不阻塞响应）
    const dataUrl = await getFileAsDataUrl(saved.key).catch(() => null);
    const analysisPromise = dataUrl
      ? analyzeImage(dataUrl)
      : Promise.reject(new Error("无法读取已上传的图片文件"));

    analysisPromise
      .then((analysisResult) => {
        // 更新分析结果
        const evidence = session.imageEvidence;
        const targetEvidence = evidence.find((e) => e.id === imageEvidence.id);
        if (targetEvidence) {
          targetEvidence.analysisResult = analysisResult;
          targetEvidence.analysisStatus = "completed";

          // 注入到 Agent 记忆
          injectImageToAgentMemory(session, targetEvidence);

          // 触发 SSE 事件
          session.emitSSE("image_analyzed", targetEvidence);
        }
      })
      .catch((error) => {
        console.error("[Image Analysis Error]", error);
        // 标记分析失败
        const evidence = session.imageEvidence;
        const targetEvidence = evidence.find((e) => e.id === imageEvidence.id);
        if (targetEvidence) {
          targetEvidence.analysisStatus = "failed";
          targetEvidence.analysisResult = "图片分析失败，请手动查看原图。";

          session.emitSSE("image_analyzed", targetEvidence);
        }
      });

    return NextResponse.json({
      success: true,
      imageEvidence,
    });
  } catch (error) {
    console.error("[Image Upload Error]", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

/**
 * 将图片证据分析结果注入到 Agent 记忆
 */
function injectImageToAgentMemory(session: SessionManager, imageEvidence: ImageEvidence) {
  const memoryLine = `[图片证据] ${imageEvidence.evidenceName} | 证明目的: ${imageEvidence.purpose} | 提交方: ${imageEvidence.submittedBy} | AI分析: ${imageEvidence.analysisResult || '分析中'}`;

  session.judgeAgent.addMemoryMessage('user', memoryLine);
  session.opponentAgent.addMemoryMessage('user', memoryLine);
}
