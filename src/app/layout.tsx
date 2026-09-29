import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '模拟法庭 — 多智能体交互训练平台',
  description: '与法官AI和对手AI进行对抗性对话，体验真实庭审流程的法律训练平台。',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-background text-on-surface font-sans">
        {children}
      </body>
    </html>
  );
}
