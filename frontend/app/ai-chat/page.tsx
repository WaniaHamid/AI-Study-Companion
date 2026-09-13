'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { aiAPI, documentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Bot, User, Sparkles, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fromCache?: boolean;
  tokensUsed?: number;
  timestamp?: string;
}

// Convert a DB log entry into two chat messages (user + assistant)
function logToMessages(log: any): Message[] {
  return [
    {
      id: `${log._id}-q`,
      role: 'user',
      content: log.question,
      timestamp: log.createdAt,
    },
    {
      id: `${log._id}-a`,
      role: 'assistant',
      content: log.answer,
      fromCache: log.fromCache,
      tokensUsed: log.tokensUsed,
      timestamp: log.createdAt,
    },
  ];
}

function AIChatInner() {
  const searchParams = useSearchParams();
  const preselectedDocId = searchParams.get('docId');

  const [selectedDocId, setSelectedDocId] = useState(preselectedDocId || '');
  const [question, setQuestion] = useState('');
  // Session-only new messages (not yet saved to DB or freshly added this session)
  const [newMessages, setNewMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch documents
  const { data: docsData } = useQuery({
    queryKey: ['documents-ready'],
    queryFn: () => documentsAPI.getAll({ limit: 50 }),
  });

  const docs = (docsData?.data?.data?.documents || []).filter((d: any) => d.status === 'ready');

  // Fetch chat history from DB whenever document changes
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['chatHistory', selectedDocId],
    queryFn: () => aiAPI.getHistory({ documentId: selectedDocId, limit: 50 }),
    enabled: !!selectedDocId,
    staleTime: 0, // always fresh on doc switch
  });

  // When doc changes, clear session messages so we don't double-show
  useEffect(() => {
    setNewMessages([]);
  }, [selectedDocId]);

  // Build the full message list: DB history + new messages this session
  const dbMessages: Message[] = (historyData?.data?.data?.history || []).flatMap(logToMessages);

  // Deduplicate: don't show newMessages that are already in dbMessages
  // (they get added to DB async — after a question is asked, refetch brings them back)
  const dbIds = new Set(dbMessages.map(m => m.id));
  const dedupedNew = newMessages.filter(m => !dbIds.has(m.id));

  const allMessages = [...dbMessages, ...dedupedNew];

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  const askMutation = useMutation({
    mutationFn: (q: string) => aiAPI.ask({ documentId: selectedDocId, question: q }),
    onSuccess: async (res) => {
      const { answer, fromCache, tokensUsed } = res.data.data;
      // Add assistant reply to session messages
      setNewMessages(prev => [...prev, {
        id: `new-a-${Date.now()}`,
        role: 'assistant',
        content: answer,
        fromCache,
        tokensUsed,
        timestamp: new Date().toISOString(),
      }]);
      // Refresh DB history in background so next visit shows it
      refetchHistory();
      inputRef.current?.focus();
    },
    onError: (err: any) => {
      // Remove the optimistic user message on error
      setNewMessages(prev => prev.filter(m => m.id !== 'pending-user'));
      toast.error(err?.response?.data?.message || 'Failed to get answer');
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: () => aiAPI.summarize(selectedDocId),
    onSuccess: (res) => {
      setNewMessages(prev => [...prev, {
        id: `sum-${Date.now()}`,
        role: 'assistant',
        content: res.data.data.summary,
        fromCache: res.data.data.fromCache,
        timestamp: new Date().toISOString(),
      }]);
    },
    onError: () => toast.error('Summarization failed'),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !selectedDocId) return;
    const q = question.trim();
    // Optimistically add user message immediately
    setNewMessages(prev => [...prev, {
      id: `new-u-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    }]);
    askMutation.mutate(q);
    setQuestion('');
  };

  const handleSummarize = () => {
    if (!selectedDocId) return;
    setNewMessages(prev => [...prev, {
      id: `sum-u-${Date.now()}`,
      role: 'user',
      content: '📋 Summarize this document',
      timestamp: new Date().toISOString(),
    }]);
    summarizeMutation.mutate();
  };

  const isLoading = askMutation.isPending || summarizeMutation.isPending;
  const selectedDoc = docs.find((d: any) => d._id === selectedDocId);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">AI Chat</h1>
            {selectedDoc && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {allMessages.length > 0
                  ? `${Math.floor(allMessages.length / 2)} questions with "${selectedDoc.title}"`
                  : `Chatting with "${selectedDoc.title}"`}
              </p>
            )}
          </div>
          {selectedDocId && (
            <button onClick={handleSummarize} disabled={isLoading}
              className="btn-secondary text-sm flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Summarize
            </button>
          )}
        </div>

        {/* Document selector */}
        <div className="card mb-4 p-4">
          <label className="block text-sm font-medium mb-2">Document</label>
          <select value={selectedDocId} onChange={e => setSelectedDocId(e.target.value)}
            className="input-field">
            <option value="">— Choose a document —</option>
            {docs.map((doc: any) => (
              <option key={doc._id} value={doc._id}>
                {doc.title} ({doc.subject})
              </option>
            ))}
          </select>
          {docs.length === 0 && (
            <p className="text-xs text-slate-500 mt-2">
              No ready documents.{' '}
              <a href="/upload" className="text-indigo-500 hover:underline">Upload one first.</a>
            </p>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">

          {/* No doc selected */}
          {!selectedDocId && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-indigo-500" />
              </div>
              <p className="font-medium text-slate-600 dark:text-slate-400">Select a document to start chatting</p>
              <p className="text-sm text-slate-400 mt-1">Your chat history is saved per document</p>
            </div>
          )}

          {/* Loading history */}
          {selectedDocId && historyLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            </div>
          )}

          {/* No history yet for this doc */}
          {selectedDocId && !historyLoading && allMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-indigo-500" />
              </div>
              <p className="font-medium text-slate-600 dark:text-slate-400">
                No chat history for this document yet
              </p>
              <p className="text-sm text-slate-400 mt-1">Ask your first question below</p>
            </div>
          )}

          {/* Messages */}
          {allMessages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
                ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-700'}`}>
                {msg.role === 'user'
                  ? <User className="w-4 h-4 text-white" />
                  : <Bot className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm
                ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                {msg.role === 'assistant'
                  ? <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{msg.content}</ReactMarkdown>
                  : <p>{msg.content}</p>}
                {msg.role === 'assistant' && (msg.fromCache || msg.tokensUsed) && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-600 text-xs text-slate-400">
                    {msg.fromCache && <span className="text-green-500">⚡ Cached</span>}
                    {msg.tokensUsed ? <span>{msg.tokensUsed} tokens</span> : null}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Bot className="w-4 h-4 text-slate-500" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder={
              !selectedDocId
                ? 'Select a document first'
                : `Ask about "${selectedDoc?.title || 'document'}"...`
            }
            disabled={!selectedDocId || isLoading}
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={!question.trim() || !selectedDocId || isLoading}
            className="btn-primary px-4 flex items-center gap-2">
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function AIChatPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    }>
      <AIChatInner />
    </Suspense>
  );
}
