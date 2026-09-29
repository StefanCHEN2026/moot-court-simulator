import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // pdfjs-dist 需在 Node 运行时按原样加载，不参与打包
  // （服务端 PDF 文本提取依赖其 legacy 构建）。
  serverExternalPackages: ['pdfjs-dist'],
  // 上传文件默认写入 ./data/uploads，通过 /api/files/<key> 读取，
  // 因此无需为远程图片配置 remotePatterns。
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
