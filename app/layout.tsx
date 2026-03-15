import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { Providers } from '@/components/providers';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'FamFi - 家庭财务管理',
  description: '全面的家庭财务管理系统，实时追踪收入、资产与投资',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={outfit.variable}>
        <Providers>
          <Sidebar />
          <main className="lg:ml-60 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
