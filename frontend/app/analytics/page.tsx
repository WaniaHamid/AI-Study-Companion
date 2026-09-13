'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '@/lib/api';
import { Loader2, TrendingUp, Target, BookOpen, AlertTriangle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const chartDefaults = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } } },
};

export default function AnalyticsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsAPI.getUserAnalytics(),
    staleTime: 0,          // always consider stale
    refetchOnMount: true,  // refetch every time page is opened
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  const stats = data?.data?.data;
  const overview = stats?.overview || {};
  const subjectBreakdown = stats?.subjectBreakdown || [];
  const recentActivity = stats?.recentActivity || [];
  const weakTopics = stats?.weakTopics || [];
  const scoreOverTime = stats?.scoreOverTime || [];
  const documentStats = stats?.documentStats || [];

  const hasData = overview.totalQuizzes > 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Learning Analytics</h1>
          <p className="text-slate-500 mt-1">Track your progress and identify areas to improve</p>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Quizzes', value: overview.totalQuizzes || 0, icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
            { label: 'Avg Score', value: overview.avgScore ? `${Math.round(overview.avgScore)}%` : '—', icon: TrendingUp, color: 'text-green-500 bg-green-50 dark:bg-green-900/30' },
            { label: 'Best Score', value: overview.bestScore ? `${Math.round(overview.bestScore)}%` : '—', icon: Target, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
            { label: 'Weak Topics', value: weakTopics.length, icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {!hasData ? (
          <div className="card text-center py-20">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-medium text-slate-500">No quiz data yet</p>
            <p className="text-sm text-slate-400 mt-1">Take some quizzes to see your analytics here</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Score over time */}
              {scoreOverTime.length > 0 && (
                <div className="card">
                  <h2 className="font-semibold mb-4">Score Trend</h2>
                  <Line
                    data={{
                      labels: scoreOverTime.map((s: any) => new Date(s.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })),
                      datasets: [{
                        data: scoreOverTime.map((s: any) => s.score),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99,102,241,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#6366f1',
                      }],
                    }}
                    options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, title: { display: false } } }}
                  />
                </div>
              )}

              {/* Subject breakdown */}
              {subjectBreakdown.length > 0 && (
                <div className="card">
                  <h2 className="font-semibold mb-4">Performance by Subject</h2>
                  <Bar
                    data={{
                      labels: subjectBreakdown.map((s: any) => s._id || 'General'),
                      datasets: [{
                        data: subjectBreakdown.map((s: any) => Math.round(s.avgScore)),
                        backgroundColor: subjectBreakdown.map((_: any, i: number) =>
                          ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'][i % 5]),
                        borderRadius: 6,
                      }],
                    }}
                    options={chartDefaults}
                  />
                </div>
              )}
            </div>

            {/* Weak topics */}
            {weakTopics.length > 0 && (
              <div className="card">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Topics to Review
                </h2>
                <div className="space-y-3">
                  {weakTopics.map((topic: any) => (
                    <div key={topic._id} className="flex items-center gap-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400 w-40 truncate">{topic._id}</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round(topic.avgScore)}%`,
                            backgroundColor: topic.avgScore < 40 ? '#ef4444' : topic.avgScore < 60 ? '#f59e0b' : '#6366f1',
                          }} />
                      </div>
                      <span className={`text-sm font-medium w-12 text-right
                        ${topic.avgScore < 40 ? 'text-red-500' : topic.avgScore < 60 ? 'text-amber-500' : 'text-indigo-500'}`}>
                        {Math.round(topic.avgScore)}%
                      </span>
                      <span className="text-xs text-slate-400">{topic.attempts} attempts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent activity */}
            {recentActivity.length > 0 && (
              <div className="card">
                <h2 className="font-semibold mb-4">Daily Activity (Last 7 Days)</h2>
                <Bar
                  data={{
                    labels: recentActivity.map((d: any) => new Date(d._id).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })),
                    datasets: [{
                      label: 'Quizzes',
                      data: recentActivity.map((d: any) => d.count),
                      backgroundColor: '#6366f1',
                      borderRadius: 6,
                    }],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
