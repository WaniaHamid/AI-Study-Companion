import Link from 'next/link';
import { BookOpen, Brain, MessageSquare, BarChart3, Upload, Zap } from 'lucide-react';

const features = [
  { icon: Upload, title: 'Upload Study Materials', desc: 'PDF, text, and markdown files. AI extracts and indexes content automatically.' },
  { icon: MessageSquare, title: 'AI-Powered Q&A', desc: 'Ask questions about your documents. Get context-aware answers instantly.' },
  { icon: Brain, title: 'Smart Quiz Generation', desc: 'Auto-generate MCQ quizzes at easy, medium, or hard difficulty.' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Track weak topics, quiz scores, and learning trends over time.' },
  { icon: Zap, title: 'Redis-Cached Responses', desc: 'Repeated questions are answered from cache — zero latency.' },
  { icon: BookOpen, title: 'Document Summaries', desc: 'One-click AI summaries of any uploaded document.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-400" />
          <span className="font-bold text-xl">StudyAI</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">Sign in</Link>
          <Link href="/register" className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">Get started</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-sm mb-8">
          <Zap className="w-3.5 h-3.5" /> Powered by GPT-4 + Redis + Kafka
        </div> */}
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Study smarter with<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">AI by your side</span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Upload your notes, ask questions, generate quizzes, and track your progress — all powered by AI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-lg transition-colors">
            Start learning free
          </Link>
          <Link href="/login" className="px-8 py-3.5 border border-slate-600 hover:border-slate-400 rounded-xl font-semibold text-lg text-slate-300 hover:text-white transition-colors">
            Sign in
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-24">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-left hover:border-indigo-500/50 transition-colors">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
