'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizAPI, documentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Brain, Loader2, CheckCircle, XCircle, Trophy,
  RotateCcw, ChevronRight, ArrowLeft, Clock, Star
} from 'lucide-react';

type Phase = 'setup' | 'taking' | 'results' | 'history' | 'history_detail';

function QuizInner() {
  const searchParams = useSearchParams();
  const preDocId = searchParams.get('docId');

  const [phase, setPhase] = useState<Phase>(preDocId ? 'setup' : 'history');
  const [selectedDocId, setSelectedDocId] = useState(preDocId || '');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [startTime, setStartTime] = useState(0);
  const [selectedHistoryQuiz, setSelectedHistoryQuiz] = useState<any>(null);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: docsData } = useQuery({
    queryKey: ['documents-ready'],
    queryFn: () => documentsAPI.getAll({ limit: 50 }),
  });
  const { data: historyData } = useQuery({
    queryKey: ['quizHistory'],
    queryFn: () => quizAPI.getHistory({ limit: 20 }),
  });

  const docs = (docsData?.data?.data?.documents || []).filter((d: any) => d.status === 'ready');

  const generateMutation = useMutation({
    mutationFn: () => quizAPI.generate({ documentId: selectedDocId, questionCount, difficulty }),
    onSuccess: (res) => {
      setQuiz(res.data.data.quiz);
      setAnswers(new Array(res.data.data.quiz.questions.length).fill(-1));
      setCurrentQ(0);
      setStartTime(Date.now());
      setPhase('taking');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Quiz generation failed'),
  });

  const submitMutation = useMutation({
    mutationFn: () => quizAPI.submit(quiz._id, {
      answers,
      timeTaken: Math.round((Date.now() - startTime) / 1000),
    }),
    onSuccess: (res) => {
      setResult(res.data.data);
      setPhase('results');
      qc.invalidateQueries({ queryKey: ['quizHistory'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: () => toast.error('Submission failed'),
  });

  const selectAnswer = (idx: number) => {
    const updated = [...answers];
    updated[currentQ] = idx;
    setAnswers(updated);
  };

  const handleNext = () => { if (currentQ < quiz.questions.length - 1) setCurrentQ(q => q + 1); };
  const handlePrev = () => { if (currentQ > 0) setCurrentQ(q => q - 1); };

  // Open a past quiz from history and show its full detail
  const handleOpenHistory = async (quizId: string) => {
    setLoadingHistoryId(quizId);
    try {
      const res = await quizAPI.getById(quizId);
      setSelectedHistoryQuiz(res.data.data.quiz);
      setPhase('history_detail');
    } catch {
      toast.error('Could not load quiz details');
    } finally {
      setLoadingHistoryId(null);
    }
  };

  // ---- SETUP + HISTORY TABS ----
  if (phase === 'setup' || phase === 'history') {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Quizzes</h1>
            <div className="flex gap-2">
              <button onClick={() => setPhase('setup')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${phase === 'setup' ? 'bg-indigo-600 text-white' : 'btn-secondary'}`}>
                Generate
              </button>
              <button onClick={() => setPhase('history')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${phase === 'history' ? 'bg-indigo-600 text-white' : 'btn-secondary'}`}>
                History
              </button>
            </div>
          </div>

          {phase === 'setup' && (
            <div className="card max-w-lg">
              <h2 className="font-semibold text-lg mb-5">Generate a New Quiz</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Document</label>
                  <select value={selectedDocId} onChange={e => setSelectedDocId(e.target.value)} className="input-field">
                    <option value="">— Select a document —</option>
                    {docs.map((d: any) => <option key={d._id} value={d._id}>{d.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Number of questions: {questionCount}</label>
                  <input type="range" min={3} max={15} value={questionCount}
                    onChange={e => setQuestionCount(+e.target.value)} className="w-full accent-indigo-600" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1"><span>3</span><span>15</span></div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <div className="flex gap-2">
                    {['easy', 'medium', 'hard'].map(d => (
                      <button key={d} type="button" onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors border
                          ${difficulty === d ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => generateMutation.mutate()} disabled={!selectedDocId || generateMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  {generateMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                    : <><Brain className="w-4 h-4" /> Generate Quiz</>}
                </button>
              </div>
            </div>
          )}

          {phase === 'history' && (
            <div className="space-y-3">
              {(historyData?.data?.data?.quizzes || []).length === 0 ? (
                <div className="card text-center py-16">
                  <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No quizzes yet. Generate your first quiz!</p>
                  <button onClick={() => setPhase('setup')} className="btn-primary mt-4 text-sm">Generate Quiz</button>
                </div>
              ) : (
                (historyData?.data?.data?.quizzes || []).map((q: any) => (
                  <button key={q._id} onClick={() => handleOpenHistory(q._id)}
                    className="card w-full flex items-center gap-4 p-4 text-left hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      {loadingHistoryId === q._id
                        ? <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                        : <Brain className="w-5 h-5 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{q.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {q.questionCount} questions · {q.difficulty} · {q.totalAttempts} attempt{q.totalAttempts !== 1 ? 's' : ''}
                        {q.bestScore > 0 && ` · Best: ${q.bestScore}%`}
                      </p>
                      {q.documentId?.title && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">📄 {q.documentId.title}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium
                        ${q.bestScore >= 80 ? 'bg-green-100 text-green-700' :
                          q.bestScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {q.bestScore > 0 ? `${q.bestScore}%` : 'Not taken'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ---- HISTORY DETAIL — full quiz review ----
  if (phase === 'history_detail' && selectedHistoryQuiz) {
    const hq = selectedHistoryQuiz;
    const lastAttempt = hq.attempts?.[hq.attempts.length - 1];

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setPhase('history')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>

          <div className="card mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg">{hq.title}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {hq.questionCount} questions · {hq.difficulty} · {hq.totalAttempts} attempt{hq.totalAttempts !== 1 ? 's' : ''}
                </p>
              </div>
              {hq.bestScore > 0 && (
                <div className="text-center shrink-0">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg
                    ${hq.bestScore >= 80 ? 'bg-green-100 text-green-600' :
                      hq.bestScore >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                    {hq.bestScore}%
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Best</p>
                </div>
              )}
            </div>

            {/* Attempt history summary */}
            {hq.attempts?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">All Attempts</p>
                <div className="flex flex-wrap gap-2">
                  {hq.attempts.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg">
                      <span className="font-medium">#{i + 1}</span>
                      <span className={`font-bold ${a.percentage >= 80 ? 'text-green-600' : a.percentage >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {a.percentage}%
                      </span>
                      {a.timeTaken > 0 && (
                        <span className="text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{Math.floor(a.timeTaken / 60)}m{a.timeTaken % 60}s
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* All questions with correct answers + explanations */}
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-indigo-500" /> Questions & Answers
          </h3>
          <div className="space-y-4 mb-6">
            {hq.questions.map((q: any, i: number) => {
              const lastAnswer = lastAttempt?.answers?.[i];
              const wasAnswered = lastAnswer !== undefined && lastAnswer !== -1;
              const wasCorrect = wasAnswered && lastAnswer === q.correctAnswer;

              return (
                <div key={i} className={`card p-4 ${wasAnswered ? (wasCorrect ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-400') : ''}`}>
                  <p className="font-medium text-sm mb-3">
                    <span className="text-slate-400 mr-2">Q{i + 1}.</span>{q.question}
                  </p>
                  <div className="space-y-1.5 mb-3">
                    {q.options.map((opt: string, oi: number) => {
                      const isCorrect = oi === q.correctAnswer;
                      const wasYours = wasAnswered && oi === lastAnswer;
                      return (
                        <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                          ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium' :
                            wasYours && !isCorrect ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                            'text-slate-600 dark:text-slate-400'}`}>
                          {isCorrect
                            ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            : wasYours && !isCorrect
                              ? <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              : <span className="w-3.5 h-3.5 shrink-0" />}
                          <span className="font-medium text-slate-400 mr-1">{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                          {isCorrect && <span className="ml-auto text-xs text-green-500">Correct</span>}
                          {wasYours && !isCorrect && <span className="ml-auto text-xs text-red-400">Your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-0.5">💡 Explanation</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{q.explanation}</p>
                    </div>
                  )}
                  {q.topic && (
                    <p className="text-xs text-slate-400 mt-2">Topic: {q.topic}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPhase('history')} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to History
            </button>
            <button onClick={() => { setSelectedDocId(hq.documentId?._id || ''); setPhase('setup'); }}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> New Quiz
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ---- TAKING PHASE ----
  if (phase === 'taking' && quiz) {
    const q = quiz.questions[currentQ];
    const progress = ((currentQ + 1) / quiz.questions.length) * 100;
    const answered = answers.filter(a => a !== -1).length;

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
              <span>Question {currentQ + 1} of {quiz.questions.length}</span>
              <span>{answered} answered</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="card mb-4">
            {q.topic && (
              <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">{q.topic}</span>
            )}
            <p className="text-lg font-medium mt-3 mb-6 leading-relaxed">{q.question}</p>
            <div className="space-y-2.5">
              {q.options.map((opt: string, i: number) => (
                <button key={i} onClick={() => selectAnswer(i)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium
                    ${answers[currentQ] === i
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-700'}`}>
                  <span className="font-bold mr-3 text-slate-400">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={handlePrev} disabled={currentQ === 0} className="btn-secondary disabled:opacity-40">← Prev</button>
            {currentQ < quiz.questions.length - 1 ? (
              <button onClick={handleNext} className="btn-primary flex items-center gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => submitMutation.mutate()}
                disabled={answered < quiz.questions.length || submitMutation.isPending}
                className="btn-primary flex items-center gap-2">
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                Submit Quiz
              </button>
            )}
          </div>

          <div className="flex gap-2 justify-center mt-6 flex-wrap">
            {quiz.questions.map((_: any, i: number) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors
                  ${i === currentQ ? 'bg-indigo-600 text-white' :
                    answers[i] !== -1 ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ---- RESULTS PHASE ----
  if (phase === 'results' && result) {
    const pct = result.percentage;
    const grade = pct >= 90 ? '🏆 Excellent!' : pct >= 75 ? '🎉 Great job!' : pct >= 50 ? '📚 Keep studying!' : "💪 Don't give up!";

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="card text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold
              ${pct >= 75 ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                pct >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
              {pct}%
            </div>
            <h2 className="text-2xl font-bold">{grade}</h2>
            <p className="text-slate-500 mt-1">{result.score} out of {result.total} correct</p>
            {result.timeTaken > 0 && (
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s
              </p>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {result.results.map((r: any, i: number) => (
              <div key={i} className={`card p-4 border-l-4 ${r.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <div className="flex items-start gap-2 mb-2">
                  {r.isCorrect
                    ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                  <p className="text-sm font-medium">{r.question}</p>
                </div>
                {!r.isCorrect && (
                  <p className="text-xs text-red-500 ml-6">
                    Your answer: {quiz?.questions[i]?.options[r.yourAnswer] ?? 'Not answered'}
                  </p>
                )}
                <p className={`text-xs ml-6 ${r.isCorrect ? 'text-green-600' : 'text-slate-500'}`}>
                  ✓ Correct: {quiz?.questions[i]?.options[r.correctAnswer]}
                </p>
                {r.explanation && (
                  <div className="ml-6 mt-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-0.5">💡 Explanation</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{r.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setPhase('setup'); setQuiz(null); setResult(null); }}
              className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> New Quiz
            </button>
            <button onClick={() => setPhase('history')} className="btn-primary flex-1">View History</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return null;
}

export default function QuizPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div></DashboardLayout>}>
      <QuizInner />
    </Suspense>
  );
}
