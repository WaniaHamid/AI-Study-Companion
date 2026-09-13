'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, documentsAPI, quizAPI } from '@/lib/api';
import Link from 'next/link';
import { FileText, Brain, MessageSquare, TrendingUp, Upload, ArrowRight, Flame } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value ?? '—'}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: () => analyticsAPI.getUserAnalytics(), staleTime: 0, refetchOnMount: true });
  const { data: docs } = useQuery({ queryKey: ['documents'], queryFn: () => documentsAPI.getAll({ limit: 3 }) });
  const { data: quizzes } = useQuery({ queryKey: ['quizHistory'], queryFn: () => quizAPI.getHistory({ limit: 3 }) });

  const stats = analytics?.data?.data;
  const overview = stats?.overview || {};

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 mt-1">Ready to study smarter today?</p>
          </div>
          {(user?.progress?.streak ?? 0) > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 px-4 py-2 rounded-full">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-400 font-medium text-sm">
                {user?.progress?.streak} day streak
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Documents" value={user?.progress?.totalDocumentsUploaded} icon={FileText} color="bg-blue-50 dark:bg-blue-900/30 text-blue-500" />
          <StatCard label="Quizzes taken" value={user?.progress?.totalQuizzesTaken} icon={Brain} color="bg-purple-50 dark:bg-purple-900/30 text-purple-500" />
          <StatCard label="AI questions" value={user?.progress?.totalAIQuestions} icon={MessageSquare} color="bg-green-50 dark:bg-green-900/30 text-green-500" />
          <StatCard label="Avg. score" value={overview.avgScore ? `${Math.round(overview.avgScore)}%` : '—'} icon={TrendingUp} color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent documents */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Documents</h2>
              <Link href="/documents" className="text-indigo-600 text-sm hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {docs?.data?.data?.documents?.length ? (
              <div className="space-y-2">
                {docs.data.data.documents.map((doc: any) => (
                  <div key={doc._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-slate-500">{doc.subject} · {doc.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm mb-3">No documents yet</p>
                <Link href="/upload" className="btn-primary text-sm">Upload first document</Link>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="card">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: '/upload', icon: Upload, label: 'Upload a new document', desc: 'PDF, TXT, MD, DOCX' },
                { href: '/ai-chat', icon: MessageSquare, label: 'Ask AI a question', desc: 'Context-aware answers' },
                { href: '/quiz', icon: Brain, label: 'Take a quiz', desc: 'Test your knowledge' },
                { href: '/analytics', icon: TrendingUp, label: 'View progress', desc: 'Track weak topics' },
              ].map(({ href, icon: Icon, label, desc }) => (
                <Link key={href} href={href} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group">
                  <Icon className="w-4 h-4 text-indigo-500" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-indigo-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
