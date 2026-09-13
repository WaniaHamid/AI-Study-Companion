import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import QueryProvider from '@/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'StudyAI — AI-Powered Study Companion',
  description: 'Upload documents, ask questions, generate quizzes, and track your learning with AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster position="top-right" toastOptions={{
            style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          }} />
        </QueryProvider>
      </body>
    </html>
  );
}
