"use client";

import { useState, useRef } from "react";
import { ImageEvidence } from "@/types/court";
import { X, Upload, ImageIcon, Loader2 } from "lucide-react";

interface EvidenceUploaderProps {
  sessionId: string;
  userRole: "plaintiff" | "defendant";
  onUploadComplete?: (evidence: ImageEvidence) => void;
  onClose?: () => void;
}

export function EvidenceUploader({
  sessionId,
  userRole,
  onUploadComplete,
  onClose,
}: EvidenceUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setError(null);

      // 生成预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setFileName(file.name);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      }
    } else {
      setError("请上传图片文件（JPEG、PNG、GIF、WebP）");
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setError("请选择要上传的图片");
      return;
    }
    if (!evidenceName.trim()) {
      setError("请填写证据名称");
      return;
    }
    if (!purpose.trim()) {
      setError("请填写证明目的");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const file = fileInputRef.current.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("evidenceName", evidenceName.trim());
      formData.append("purpose", purpose.trim());
      formData.append("submittedBy", userRole);

      const response = await fetch(`/api/sessions/${sessionId}/image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "上传失败");
      }

      const data = await response.json();
      onUploadComplete?.(data.imageEvidence);

      // 重置表单
      setPreviewUrl(null);
      setFileName("");
      setEvidenceName("");
      setPurpose("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">上传图片证据</h2>
              <p className="text-sm text-muted-foreground">提交方：{userRole === "plaintiff" ? "原告" : "被告"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* 上传区域 */}
          {!previewUrl ? (
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="text-foreground font-medium mb-1">点击或拖拽上传图片</p>
              <p className="text-sm text-muted-foreground">支持 JPEG、PNG、GIF、WebP，最大 10MB</p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={previewUrl}
                alt="预览"
                className="w-full h-48 object-contain bg-muted rounded-xl"
              />
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setFileName("");
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 表单 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                证据名称 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={evidenceName}
                onChange={(e) => setEvidenceName(e.target.value)}
                placeholder="例如：借条照片、转账记录截图"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                证明目的 <span className="text-destructive">*</span>
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="说明该证据要证明的案件事实..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
              />
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
            disabled={isUploading}
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !previewUrl || !evidenceName.trim() || !purpose.trim()}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                上传证据
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
